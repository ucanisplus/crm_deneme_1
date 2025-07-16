// Çelik Hasır Netsis Integration Component
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { API_URLS, fetchWithAuth } from '@/api-config';
import { toast } from 'react-toastify';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { 
  Database, 
  FileSpreadsheet, 
  AlertTriangle, 
  Check, 
  X, 
  Eye, 
  Trash2, 
  Download,
  Upload,
  Loader,
  RefreshCw
} from 'lucide-react';

const CelikHasirNetsis = ({ optimizedProducts = [] }) => {
  const { user, hasPermission } = useAuth();
  
  // Ana state değişkenleri
  const [isLoading, setIsLoading] = useState(false);
  const [showDatabaseModal, setShowDatabaseModal] = useState(false);
  const [activeDbTab, setActiveDbTab] = useState('mm'); // 'mm', 'ncbk', 'ntel'
  const [showOptimizationWarning, setShowOptimizationWarning] = useState(false);
  const [showDatabaseWarning, setShowDatabaseWarning] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleteText, setBulkDeleteText] = useState('');
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingProduct, setViewingProduct] = useState(null);
  
  // Database verileri
  const [savedProducts, setSavedProducts] = useState({
    mm: [],
    ncbk: [],
    ntel: []
  });
  
  // Excel generation durumu
  const [isGeneratingExcel, setIsGeneratingExcel] = useState(false);
  const [excelProgress, setExcelProgress] = useState({ current: 0, total: 0, operation: '' });
  
  // Database save progress
  const [isSavingToDatabase, setIsSavingToDatabase] = useState(false);
  const [databaseProgress, setDatabaseProgress] = useState({ current: 0, total: 0, operation: '', currentProduct: '' });
  
  // Sequence tracking
  const [sequences, setSequences] = useState({});

  // İzin kontrolü - Çelik Hasır modülü için
  if (!hasPermission('access:celik-hasir')) {
    return (
      <div className="p-4 text-center">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-700">Bu modüle erişim izniniz bulunmamaktadır.</p>
        </div>
      </div>
    );
  }

  // Component yüklendiğinde verileri getir
  useEffect(() => {
    fetchSavedProducts();
    fetchSequences();
  }, []);

  // Veritabanından kayıtlı ürünleri getir
  const fetchSavedProducts = async () => {
    try {
      setIsLoading(true);
      
      console.log('Fetching saved products from database...');
      
      // Paralel olarak tüm ürün tiplerini getir
      const [mmResponse, ncbkResponse, ntelResponse] = await Promise.all([
        fetchWithAuth(API_URLS.celikHasirMm),
        fetchWithAuth(API_URLS.celikHasirNcbk),
        fetchWithAuth(API_URLS.celikHasirNtel)
      ]);

      const newSavedProducts = {
        mm: mmResponse?.ok ? await mmResponse.json() : [],
        ncbk: ncbkResponse?.ok ? await ncbkResponse.json() : [],
        ntel: ntelResponse?.ok ? await ntelResponse.json() : []
      };
      
      console.log('Fetched products from database:', {
        mm: newSavedProducts.mm.length,
        ncbk: newSavedProducts.ncbk.length,
        ntel: newSavedProducts.ntel.length,
        mmCodes: newSavedProducts.mm.map(p => p.stok_kodu),
        ncbkCodes: newSavedProducts.ncbk.map(p => p.stok_kodu),
        ntelCodes: newSavedProducts.ntel.map(p => p.stok_kodu)
      });
      
      setSavedProducts(newSavedProducts);
    } catch (error) {
      console.error('Kayıtlı ürünler getirilemedi:', error);
      toast.error('Kayıtlı ürünler getirilemedi');
    } finally {
      setIsLoading(false);
    }
  };

  // Sequence verilerini getir
  const fetchSequences = async () => {
    try {
      const response = await fetchWithAuth(API_URLS.celikHasirSequence);
      if (response?.ok) {
        const data = await response.json();
        const sequenceMap = {};
        data.forEach(seq => {
          const key = `${seq.product_type}_${seq.kod_2}_${seq.cap_code}`;
          sequenceMap[key] = seq.last_sequence;
        });
        setSequences(sequenceMap);
      }
    } catch (error) {
      console.error('Sequence verileri getirilemedi:', error);
    }
  };

  // Ürünün optimize edilip edilmediğini kontrol et
  const isProductOptimized = (product) => {
    // Check if optimization has been run by checking if the product has the isOptimized flag
    // This flag should be set by the iyilestir functions
    return product.isOptimized === true;
  };

  // Optimize edilmemiş ürünleri kontrol et
  const hasUnoptimizedProducts = () => {
    return optimizedProducts.some(product => !isProductOptimized(product));
  };

  // Kaydedilecek ürünleri hesapla
  const getProductsToSave = () => {
    if (optimizedProducts.length === 0) return [];
    
    const newProducts = [];
    
    for (const product of optimizedProducts) {
      // CH product exists check
      const chExists = savedProducts.mm.some(p => 
        p.hasir_tipi === product.hasirTipi &&
        p.ebat_boy === parseFloat(product.uzunlukBoy) &&
        p.ebat_en === parseFloat(product.uzunlukEn) &&
        p.cap === parseFloat(product.boyCap) &&
        p.cap2 === parseFloat(product.enCap)
      );
      
      const ncbkExists500 = savedProducts.ncbk.some(p => 
        p.cap === parseFloat(product.boyCap) && p.length_cm === 500
      );
      
      const ncbkExists215 = savedProducts.ncbk.some(p => 
        p.cap === parseFloat(product.enCap) && p.length_cm === 215
      );
      
      const ntelExists = savedProducts.ntel.some(p => 
        p.cap === parseFloat(product.boyCap)
      );
      
      if (!chExists || !ncbkExists500 || !ncbkExists215 || !ntelExists) {
        newProducts.push(product);
      }
    }
    
    return newProducts;
  };

  // Stok kodu oluştur
  const generateStokKodu = (product, productType) => {
    const diameter = parseFloat(product.boyCap || product.enCap || 0);
    const diameterCode = String(Math.round(diameter * 100)).padStart(4, '0');
    
    if (productType === 'CH') {
      // Standart boyut kontrolü (500x215)
      const isStandard = product.uzunlukBoy === '500' && product.uzunlukEn === '215';
      
      if (isStandard) {
        // Standart ürün: CH.STD.0450.00
        const sequenceKey = `CH_STD_${diameterCode}`;
        const currentSeq = sequences[sequenceKey] || 0;
        const newSeq = currentSeq + 1;
        sequences[sequenceKey] = newSeq;
        
        return `CH.STD.${diameterCode}.${String(newSeq).padStart(2, '0')}`;
      } else {
        // Özel boyut: CHOZL0001
        const sequenceKey = 'CH_OZL_GLOBAL';
        const currentSeq = sequences[sequenceKey] || 0;
        const newSeq = currentSeq + 1;
        sequences[sequenceKey] = newSeq;
        
        return `CHOZL${String(newSeq).padStart(4, '0')}`;
      }
    } else if (productType === 'NCBK') {
      // YM.NCBK.0420.215
      const length = product.length || 215;
      return `YM.NCBK.${diameterCode}.${length}`;
    } else if (productType === 'NTEL') {
      // YM.NTEL.0445
      return `YM.NTEL.${diameterCode}`;
    }
    
    return '';
  };

  // Stok adı oluştur
  const generateStokAdi = (product, productType) => {
    if (productType === 'CH') {
      return `${product.hasirTipi} Çap(${product.boyCap}x${product.enCap} mm) Ebat(${product.uzunlukBoy}x${product.uzunlukEn} cm) Göz Ara(${product.boyAraligi}*${product.enAraligi} cm)`;
    } else if (productType === 'NCBK') {
      return `YM Nervürlü Çubuk ${product.cap} mm ${product.length} cm`;
    } else if (productType === 'NTEL') {
      return `YM Nervürlü Tel ${product.cap} mm`;
    }
    return '';
  };

  // İngilizce isim oluştur
  const generateIngilizceIsim = (product, productType) => {
    if (productType === 'CH') {
      return 'Wire Mesh';
    } else if (productType === 'NCBK') {
      return '';
    } else if (productType === 'NTEL') {
      return '';
    }
    return '';
  };

  // Göz aralığı formatla
  const formatGozAraligi = (product) => {
    return `${product.boyAraligi}*${product.enAraligi}`;
  };

  // Excel dosyalarını oluştur
  const generateExcelFiles = async (products, includeAllProducts = false) => {
    try {
      setIsGeneratingExcel(true);
      setExcelProgress({ current: 0, total: 3, operation: 'Excel dosyaları hazırlanıyor...' });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('.')[0];
      
      // 1. Stok Kartı Excel
      setExcelProgress({ current: 1, total: 3, operation: 'Stok Kartı Excel oluşturuluyor...' });
      await generateStokKartiExcel(products, timestamp, includeAllProducts);
      
      // 2. Reçete Excel  
      setExcelProgress({ current: 2, total: 3, operation: 'Reçete Excel oluşturuluyor...' });
      await generateReceteExcel(products, timestamp, includeAllProducts);
      
      // 3. Alternatif Reçete Excel
      setExcelProgress({ current: 3, total: 3, operation: 'Alternatif Reçete Excel oluşturuluyor...' });
      await generateAlternatifReceteExcel(products, timestamp, includeAllProducts);
      
      toast.success('Excel dosyaları başarıyla oluşturuldu!');
      
    } catch (error) {
      console.error('Excel oluşturma hatası:', error);
      toast.error('Excel dosyaları oluşturulurken hata oluştu');
    } finally {
      setIsGeneratingExcel(false);
      setExcelProgress({ current: 0, total: 0, operation: '' });
    }
  };

  // Stok Kartı Excel oluştur
  const generateStokKartiExcel = async (products, timestamp, includeAllProducts) => {
    const workbook = new ExcelJS.Workbook();
    
    // CH STOK sheet oluştur
    const chSheet = workbook.addWorksheet('CH STOK');
    const chHeaders = [
      'Stok Kodu', 'Stok Adı', 'Grup Kodu', 'Kod-1', 'Kod-2', 'İngilizce İsim',
      'Alış KDV Oranı', 'Satış KDV Oranı', 'Muh. Detay', 'Depo Kodu',
      'Br-1', 'Br-2', 'Pay-1', 'Payda-1', 'Çevrim Değeri-1',
      'Ölçü Br-3', 'Çevrim Pay-2', 'Çevrim Payda-2', 'Çevrim Değeri-2',
      'Hasır Tipi', 'Çap', 'Çap2', 'Ebat(Boy)', 'Ebat(En)', 'Göz Aralığı', 'KG',
      'İç Çap/Boy Çubuk AD', 'Dış Çap/En Çubuk AD', 'Özel Saha 2 (Say.)',
      'Özel Saha 3 (Say.)', 'Özel Saha 4 (Say.)', 'Özel Saha 1 (Alf.)',
      'Özel Saha 2 (Alf.)', 'Özel Saha 3 (Alf.)', 'Alış Fiyatı', 'Fiyat Birimi',
      'Satış Fiyatı-1', 'Satış Fiyatı-2', 'Satış Fiyatı-3', 'Satış Fiyatı-4',
      'Döviz Tip', 'Döviz Alış', 'Döviz Maliyeti', 'Döviz Satış Fiyatı',
      'Azami Stok', 'Asgari Stok', 'Döv.Tutar', 'Döv.Tipi', 'Alış Döviz Tipi',
      'Bekleme Süresi', 'Temin Süresi', 'Birim Ağırlık', 'Nakliye Tutar',
      'Stok Türü', 'Mali Grup Kodu', 'Özel Saha 8 (Alf.)', 'Kod-3', 'Kod-4',
      'Kod-5', 'Esnek Yapılandır', 'Süper Reçete Kullanılsın', 'Bağlı Stok Kodu',
      'Yapılandırma Kodu', 'Yap. Açıklama', 'Girişlerde Seri Numarası Takibi Yapılsın',
      'Çıkışlarda Seri Numarası Takibi Yapılsın'
    ];
    chSheet.addRow(chHeaders);

    // CH ürünlerini ekle
    products.forEach(product => {
      if (isProductOptimized(product)) {
        const stokKodu = generateStokKodu(product, 'CH');
        const stokAdi = generateStokAdi(product, 'CH');
        const ingilizceIsim = generateIngilizceIsim(product, 'CH');
        const gozAraligi = formatGozAraligi(product);
        
        const isStandard = product.uzunlukBoy === '500' && product.uzunlukEn === '215';
        
        chSheet.addRow([
          stokKodu, stokAdi, 'MM', 'HSR', isStandard ? 'STD' : 'OZL', ingilizceIsim,
          '20', '20', '31', '36', 'KG', 'AD', '1', product.adetKg || '', 
          'VİRGÜLDEN SONRA 4 HANE OLMASI GEREKİYOR/DÖNÜŞÜMDE DOĞRU DEĞERİ YAKALAMAK İÇİN',
          '', '1', '1', '1', product.hasirTipi, product.boyCap, product.enCap,
          product.uzunlukBoy, product.uzunlukEn, gozAraligi, product.adetKg || '',
          product.cubukSayisiBoy || '', product.cubukSayisiEn || '', '0', '0', '0',
          '', '', '', '0', '2', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0',
          '', '0', '0', '0', '0', '0', '0', 'D', '', '', '', '', '', 'H', 'H',
          '', '', '', 'E', 'E'
        ]);
      }
    });

    // YM NCBK STOK sheet oluştur
    const ncbkSheet = workbook.addWorksheet('YM NCBK STOK');
    ncbkSheet.addRow(chHeaders); // Aynı header yapısı

    // YM NTEL STOK sheet oluştur
    const ntelSheet = workbook.addWorksheet('YM NTEL STOK');
    ntelSheet.addRow(chHeaders); // Aynı header yapısı

    // NCBK ve NTEL ürünlerini generate et
    products.forEach(product => {
      if (isProductOptimized(product)) {
        // NCBK ürünleri - Boy ve En çubukları için
        [500, 215].forEach(length => {
          const stokKodu = `YM.NCBK.${String(Math.round(parseFloat(product.boyCap) * 100)).padStart(4, '0')}.${length}`;
          const stokAdi = `YM Nervürlü Çubuk ${product.boyCap} mm ${length} cm`;
          
          ncbkSheet.addRow([
            stokKodu, stokAdi, 'YM', 'NCBK', '', '', '20', '20', '', '35',
            'AD', 'KG', product.boyCap ? (parseFloat(product.boyCap) * parseFloat(product.boyCap) * Math.PI * 7.85 * length / 4000).toFixed(9) : '',
            '1', '', '', '1', '1', '1', '', '', product.boyCap, '', length, '', '', '', '', '', '0', '0',
            '0', '', '', '', '0', '2', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0',
            '', '0', '0', '0', '0', '0', '0', 'D', '', '', '', '', '', 'H', 'H',
            '', '', '', 'E', 'E'
          ]);
        });

        // NTEL ürünü
        const ntelStokKodu = `YM.NTEL.${String(Math.round(parseFloat(product.boyCap) * 100)).padStart(4, '0')}`;
        const ntelStokAdi = `YM Nervürlü Tel ${product.boyCap} mm`;
        
        ntelSheet.addRow([
          ntelStokKodu, ntelStokAdi, 'YM', 'NTEL', '', '', '20', '20', '', '35',
          'MT', 'KG', product.boyCap ? (parseFloat(product.boyCap) * parseFloat(product.boyCap) * Math.PI * 7.85 * 100 / 4000000).toFixed(9) : '',
          '1', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '0', '0',
          '0', '', '', '', '0', '2', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0',
          '', '0', '0', '0', '0', '0', '0', 'D', '', '', '', '', '', 'H', 'H',
          '', '', '', 'E', 'E'
        ]);
      }
    });

    // Excel dosyasını kaydet
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Celik_Hasir_Stok_${timestamp}.xlsx`);
  };

  // Reçete Excel oluştur
  const generateReceteExcel = async (products, timestamp, includeAllProducts) => {
    const workbook = new ExcelJS.Workbook();
    
    const receteHeaders = [
      'Mamul Kodu(*)', 'Reçete Top.', 'Fire Oranı (%)', 'Oto.Reç.', 'Ölçü Br.',
      'Sıra No(*)', 'Operasyon Bileşen', 'Bileşen Kodu(*)', 'Ölçü Br. - Bileşen',
      'Miktar(*)', 'Açıklama', 'Miktar Sabitle', 'Stok/Maliyet', 'Fire Mik.',
      'Sabit Fire Mik.', 'İstasyon Kodu', 'Hazırlık Süresi', 'Üretim Süresi',
      'Ü.A.Dahil Edilsin', 'Son Operasyon', 'Öncelik', 'Planlama Oranı',
      'Alternatif Politika - D.A.Transfer Fişi', 'Alternatif Politika - Ambar Ç. Fişi',
      'Alternatif Politika - Üretim S.Kaydı', 'Alternatif Politika - MRP', 'İÇ/DIŞ'
    ];

    // CH REÇETE sheet
    const chReceteSheet = workbook.addWorksheet('CH REÇETE');
    chReceteSheet.addRow(receteHeaders);

    // YM NCBK REÇETE sheet
    const ncbkReceteSheet = workbook.addWorksheet('YM NCBK REÇETE');
    ncbkReceteSheet.addRow(receteHeaders);

    // YM NTEL REÇETE sheet
    const ntelReceteSheet = workbook.addWorksheet('YM NTEL REÇETE');
    ntelReceteSheet.addRow(receteHeaders);

    // Reçete verilerini ekle
    products.forEach(product => {
      if (isProductOptimized(product)) {
        const chStokKodu = generateStokKodu(product, 'CH');
        
        // CH Reçete - Boy ve En çubuk tüketimleri
        chReceteSheet.addRow([
          chStokKodu, '1', '0', '', 'AD', '1', 'Bileşen', 
          `YM.NCBK.${String(Math.round(parseFloat(product.boyCap) * 100)).padStart(4, '0')}.500`,
          '1', product.cubukSayisiBoy || '0', 'Boy Çubuk Tüketimi', '', '', '', '', '', '', '1', // Placeholder değer
          'evet', 'evet', '', '', '', '', '', '', ''
        ]);
        
        chReceteSheet.addRow([
          chStokKodu, '1', '0', '', 'AD', '2', 'Bileşen',
          `YM.NCBK.${String(Math.round(parseFloat(product.enCap) * 100)).padStart(4, '0')}.215`, 
          '1', product.cubukSayisiEn || '0', 'En Çubuk Tüketimi', '', '', '', '', '', '', '1', // Placeholder değer
          'evet', 'evet', '', '', '', '', '', '', ''
        ]);
        
        chReceteSheet.addRow([
          chStokKodu, '1', '0', '', 'DK', '3', 'Operasyon', 'YOTOCH',
          '1', '1', 'Yarı Otomatik Operasyon', '', '', '', '', '', '', '1', // Placeholder değer
          'evet', 'evet', '', '', '', '', '', '', ''
        ]);

        // NCBK Reçeteler - Her boy için
        [500, 215].forEach((length, index) => {
          const ncbkStokKodu = `YM.NCBK.${String(Math.round(parseFloat(index === 0 ? product.boyCap : product.enCap) * 100)).padStart(4, '0')}.${length}`;
          
          // Bileşen - FLM
          ncbkReceteSheet.addRow([
            ncbkStokKodu, '1', '0', '', 'AD', '1', 'Bileşen', 'FLM.0600.1008',
            'KG', '1', `FLM tüketimi - ${length}cm çubuk için`, '', '', '', '', '', '', '1',
            'evet', 'evet', '', '', '', '', '', '', ''
          ]);
          
          // Operasyon - YOTOCH
          ncbkReceteSheet.addRow([
            ncbkStokKodu, '1', '0', '', 'AD', '2', 'Operasyon', 'YOTOCH',
            'AD', '1', 'Yarı Otomatik Nervürlü Çubuk Operasyonu', '', '', '', '', '', '', '1',
            'evet', 'evet', '', '', '', '', '', '', ''
          ]);
        });

        // NTEL Reçete
        const ntelStokKodu = `YM.NTEL.${String(Math.round(parseFloat(product.boyCap || product.enCap) * 100)).padStart(4, '0')}`;
        
        // Bileşen - FLM
        ntelReceteSheet.addRow([
          ntelStokKodu, '1', '0', '', 'MT', '1', 'Bileşen', 'FLM.0600.1008',
          'KG', '1', 'FLM tüketimi - metre başına', '', '', '', '', '', '', '1',
          'evet', 'evet', '', '', '', '', '', '', ''
        ]);
        
        // Operasyon - OTOCH
        ntelReceteSheet.addRow([
          ntelStokKodu, '1', '0', '', 'MT', '2', 'Operasyon', 'OTOCH',
          'MT', '1', 'Tam Otomatik Nervürlü Tel Operasyonu', '', '', '', '', '', '', '1',
          'evet', 'evet', '', '', '', '', '', '', ''
        ]);
      }
    });

    // Excel dosyasını kaydet
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Celik_Hasir_Recete_${timestamp}.xlsx`);
  };

  // Alternatif Reçete Excel oluştur
  const generateAlternatifReceteExcel = async (products, timestamp, includeAllProducts) => {
    const workbook = new ExcelJS.Workbook();
    
    const receteHeaders = [
      'Mamul Kodu(*)', 'Reçete Top.', 'Fire Oranı (%)', 'Oto.Reç.', 'Ölçü Br.',
      'Sıra No(*)', 'Operasyon Bileşen', 'Bileşen Kodu(*)', 'Ölçü Br. - Bileşen',
      'Miktar(*)', 'Açıklama', 'Miktar Sabitle', 'Stok/Maliyet', 'Fire Mik.',
      'Sabit Fire Mik.', 'İstasyon Kodu', 'Hazırlık Süresi', 'Üretim Süresi',
      'Ü.A.Dahil Edilsin', 'Son Operasyon', 'Öncelik', 'Planlama Oranı',
      'Alternatif Politika - D.A.Transfer Fişi', 'Alternatif Politika - Ambar Ç. Fişi',
      'Alternatif Politika - Üretim S.Kaydı', 'Alternatif Politika - MRP', 'İÇ/DIŞ'
    ];

    // CH REÇETE sheet (NTEL bazlı)
    const chReceteSheet = workbook.addWorksheet('CH REÇETE');
    chReceteSheet.addRow(receteHeaders);

    // YM NCBK REÇETE sheet
    const ncbkReceteSheet = workbook.addWorksheet('YM NCBK REÇETE');
    ncbkReceteSheet.addRow(receteHeaders);

    // YM NTEL REÇETE sheet
    const ntelReceteSheet = workbook.addWorksheet('YM NTEL REÇETE');
    ntelReceteSheet.addRow(receteHeaders);

    // Alternatif reçete verilerini ekle (NTEL bazlı)
    products.forEach(product => {
      if (isProductOptimized(product)) {
        const chStokKodu = generateStokKodu(product, 'CH');
        const boyLength = parseFloat(product.cubukSayisiBoy || 0) * 500;
        const enLength = parseFloat(product.cubukSayisiEn || 0) * 215;
        const totalLength = boyLength + enLength; // cm cinsinden
        
        // FLM tüketimi hesapla (NTEL için)
        const diameter = parseFloat(product.boyCap || product.enCap || 0);
        const flmTuketimi = (diameter * diameter * Math.PI * 7.85 * totalLength / 4000000).toFixed(6); // kg
        
        // CH REÇETE entries
        chReceteSheet.addRow([
          chStokKodu, '1', '0', '', 'KG', '1', 'Bileşen',
          `FLM.${String(Math.round(diameter * 100)).padStart(4, '0')}.1008`,
          '1', flmTuketimi, 'FLM Tüketimi (NTEL Bazlı)', '', '', '', '', '', '', '1', // Placeholder değer
          'evet', 'evet', '', '', '', '', '', '', ''
        ]);
        
        chReceteSheet.addRow([
          chStokKodu, '1', '0', '', 'DK', '2', 'Operasyon', 'OTOCH',
          '1', '1', 'Tam Otomatik Operasyon', '', '', '', '', '', '', '1', // Placeholder değer
          'evet', 'evet', '', '', '', '', '', '', ''
        ]);
        
        // NCBK REÇETE entries - Boy ve En çubukları için
        [500, 215].forEach(length => {
          const ncbkStokKodu = `YM.NCBK.${String(Math.round(diameter * 100)).padStart(4, '0')}.${length}`;
          const ncbkFlmTuketimi = (diameter * diameter * Math.PI * 7.85 * length / 4000000).toFixed(6); // kg
          
          ncbkReceteSheet.addRow([
            ncbkStokKodu, '1', '0', '', 'KG', '1', 'Bileşen',
            `FLM.${String(Math.round(diameter * 100)).padStart(4, '0')}.1008`,
            '1', ncbkFlmTuketimi, 'FLM Tüketimi - Yarı Otomatik', '', '', '', '', '', '', '1',
            'evet', 'evet', '', '', '', '', '', '', ''
          ]);
          
          ncbkReceteSheet.addRow([
            ncbkStokKodu, '1', '0', '', 'DK', '2', 'Operasyon', 'YARICH',
            '1', '1', 'Yarı Otomatik Nervürlü Çubuk İşlemi', '', '', '', '', '', '', '1',
            'evet', 'evet', '', '', '', '', '', '', ''
          ]);
        });
        
        // NTEL REÇETE entries
        const ntelStokKodu = `YM.NTEL.${String(Math.round(diameter * 100)).padStart(4, '0')}`;
        const ntelFlmTuketimi = (diameter * diameter * Math.PI * 7.85 * 1000 / 4000000).toFixed(6); // kg per meter
        
        ntelReceteSheet.addRow([
          ntelStokKodu, '1', '0', '', 'KG', '1', 'Bileşen',
          `FLM.${String(Math.round(diameter * 100)).padStart(4, '0')}.1008`,
          '1', ntelFlmTuketimi, 'FLM Tüketimi - Tam Otomatik', '', '', '', '', '', '', '1',
          'evet', 'evet', '', '', '', '', '', '', ''
        ]);
        
        ntelReceteSheet.addRow([
          ntelStokKodu, '1', '0', '', 'DK', '2', 'Operasyon', 'OTOCH',
          '1', '1', 'Tam Otomatik Nervürlü Tel Operasyonu', '', '', '', '', '', '', '1',
          'evet', 'evet', '', '', '', '', '', '', ''
        ]);
      }
    });

    // Excel dosyasını kaydet
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Celik_Hasir_Alternatif_Recete_${timestamp}.xlsx`);
  };

  // Recipe kayıtlarını veritabanına kaydet
  const saveRecipeData = async (product, chResult, ncbkResults, ntelResult) => {
    try {
      // CH Recipe kayıtları
      const chRecipes = [
        {
          mamul_kodu: chResult.stok_kodu,
          recete_top: 1,
          fire_orani: 0,
          olcu_br: 'AD',
          sira_no: 1,
          operasyon_bilesen: 'Bileşen',
          bilesen_kodu: ncbkResults[500]?.stok_kodu || '',
          olcu_br_bilesen: 'AD',
          miktar: product.cubukSayisiBoy || 0,
          aciklama: `Boy çubuk - ${product.cubukSayisiBoy} adet`,
        },
        {
          mamul_kodu: chResult.stok_kodu,
          recete_top: 1,
          fire_orani: 0,
          olcu_br: 'AD',
          sira_no: 2,
          operasyon_bilesen: 'Bileşen',
          bilesen_kodu: ncbkResults[215]?.stok_kodu || '',
          olcu_br_bilesen: 'AD',
          miktar: product.cubukSayisiEn || 0,
          aciklama: `En çubuk - ${product.cubukSayisiEn} adet`,
        },
        {
          mamul_kodu: chResult.stok_kodu,
          recete_top: 1,
          fire_orani: 0,
          olcu_br: 'AD',
          sira_no: 3,
          operasyon_bilesen: 'Operasyon',
          bilesen_kodu: 'YOTOCH',
          olcu_br_bilesen: 'AD',
          miktar: 1, // Placeholder - zamanla formül ile değiştirilecek
          aciklama: 'Yarı Otomatik Çelik Hasır Operasyonu',
          uretim_suresi: 1, // Placeholder
        }
      ];

      // CH recipes kaydet - paralel işlem
      await Promise.all(chRecipes.map(recipe =>
        fetchWithAuth(API_URLS.celikHasirMmRecete, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(recipe)
        })
      ));

      // NCBK Recipe kayıtları
      for (const [length, ncbkResult] of Object.entries(ncbkResults)) {
        const ncbkRecipes = [
          // Bileşen - FLM tüketimi
          {
            mamul_kodu: ncbkResult.stok_kodu,
            recete_top: 1,
            fire_orani: 0,
            olcu_br: 'AD',
            sira_no: 1,
            operasyon_bilesen: 'Bileşen',
            bilesen_kodu: 'FLM.0600.1008', // Placeholder - formülle hesaplanacak
            olcu_br_bilesen: 'KG',
            miktar: 1, // Placeholder - formülle hesaplanacak  
            aciklama: `FLM tüketimi - ${length}cm çubuk için`,
          },
          // Operasyon - Yarı Otomatik İşlem
          {
            mamul_kodu: ncbkResult.stok_kodu,
            recete_top: 1,
            fire_orani: 0,
            olcu_br: 'AD',
            sira_no: 2,
            operasyon_bilesen: 'Operasyon',
            bilesen_kodu: 'YOTOCH',
            olcu_br_bilesen: 'AD',
            miktar: 1, // Placeholder
            aciklama: 'Yarı Otomatik Nervürlü Çubuk Operasyonu',
            uretim_suresi: 1, // Placeholder
          }
        ];

        // NCBK recipes kaydet - paralel işlem
        await Promise.all(ncbkRecipes.map(recipe =>
          fetchWithAuth(API_URLS.celikHasirNcbkRecete, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(recipe)
          })
        ));
      }

      // NTEL Recipe kayıtları
      const ntelRecipes = [
        // Bileşen - FLM tüketimi
        {
          mamul_kodu: ntelResult.stok_kodu,
          recete_top: 1,
          fire_orani: 0,
          olcu_br: 'MT',
          sira_no: 1,
          operasyon_bilesen: 'Bileşen',
          bilesen_kodu: 'FLM.0600.1008', // Placeholder - formülle hesaplanacak
          olcu_br_bilesen: 'KG',
          miktar: 1, // Placeholder - formülle hesaplanacak
          aciklama: 'FLM tüketimi - metre başına',
        },
        // Operasyon - Tam Otomatik İşlem
        {
          mamul_kodu: ntelResult.stok_kodu,
          recete_top: 1,
          fire_orani: 0,
          olcu_br: 'MT',
          sira_no: 2,
          operasyon_bilesen: 'Operasyon',
          bilesen_kodu: 'OTOCH',
          olcu_br_bilesen: 'MT',
          miktar: 1, // Placeholder
          aciklama: 'Tam Otomatik Nervürlü Tel Operasyonu',
          uretim_suresi: 1, // Placeholder
        }
      ];

      // NTEL recipes kaydet - paralel işlem
      await Promise.all(ntelRecipes.map(recipe =>
        fetchWithAuth(API_URLS.celikHasirNtelRecete, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(recipe)
        })
      ));

    } catch (error) {
      console.error('Recipe kaydetme hatası:', error);
      throw error;
    }
  };

  // Sequence güncelleme
  const updateSequences = async (product) => {
    try {
      // CH sequence güncelle
      const isStandard = product.uzunlukBoy === '500' && product.uzunlukEn === '215';
      const kod2 = isStandard ? 'STD' : 'OZL';
      const capCode = isStandard ? String(Math.round(parseFloat(product.boyCap) * 100)).padStart(4, '0') : '';
      
      await fetchWithAuth(API_URLS.celikHasirSequence, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_type: 'CH',
          kod_2: kod2,
          cap_code: capCode
        })
      });
      
    } catch (error) {
      console.error('Sequence güncelleme hatası:', error);
    }
  };

  // Veritabanına kaydet
  const saveToDatabase = async (products) => {
    try {
      setIsLoading(true);
      setIsSavingToDatabase(true);
      setDatabaseProgress({ current: 0, total: 0, operation: 'Veritabanı kontrol ediliyor...', currentProduct: '' });
      
      // Önce optimize edilmemiş ürünleri kontrol et
      if (products.length > 0 && hasUnoptimizedProducts()) {
        setIsSavingToDatabase(false);
        setIsLoading(false);
        setShowOptimizationWarning(true);
        return;
      }
      
      // Tüm ürünleri kaydet (optimize edilmemiş olanlar dahil)
      const productsToSave = products;
      
      if (productsToSave.length === 0) {
        toast.warning('Kaydedilecek ürün bulunamadı.');
        return;
      }

      // Mevcut ürünleri getir ve karşılaştır
      setDatabaseProgress({ current: 0, total: 0, operation: 'Mevcut ürünler kontrol ediliyor...', currentProduct: '' });
      
      console.log('Refreshing database state before save...');
      
      // Force fresh database fetch
      const [mmResponse, ncbkResponse, ntelResponse] = await Promise.all([
        fetchWithAuth(API_URLS.celikHasirMm),
        fetchWithAuth(API_URLS.celikHasirNcbk),
        fetchWithAuth(API_URLS.celikHasirNtel)
      ]);

      const freshSavedProducts = {
        mm: mmResponse?.ok ? await mmResponse.json() : [],
        ncbk: ncbkResponse?.ok ? await ncbkResponse.json() : [],
        ntel: ntelResponse?.ok ? await ntelResponse.json() : []
      };
      
      console.log('Fresh database state:', {
        mm: freshSavedProducts.mm.length,
        ncbk: freshSavedProducts.ncbk.length,
        ntel: freshSavedProducts.ntel.length,
        mmCodes: freshSavedProducts.mm.map(p => p.stok_kodu)
      });
      
      setSavedProducts(freshSavedProducts);
      
      // Use fresh data for duplicate checking
      const existingStokKodlari = new Set([
        ...freshSavedProducts.mm.map(p => p.stok_kodu),
        ...freshSavedProducts.ncbk.map(p => p.stok_kodu),
        ...freshSavedProducts.ntel.map(p => p.stok_kodu)
      ]);
      
      console.log('Fresh existing stock codes:', Array.from(existingStokKodlari));
      
      // Duplicates'leri ÖNCE filtrele - sadece yeni ürünleri kaydet
      const newProducts = [];
      const skippedProducts = [];
      
      for (const product of productsToSave) {
        // Instead of checking by stok_kodu, check by product characteristics
        // CH products should be identified by their physical properties, not generated codes
        const productKey = `${product.hasirTipi}_${product.uzunlukBoy}_${product.uzunlukEn}_${product.boyCap}_${product.enCap}`;
        
        // Check if a product with the same characteristics already exists
        const chExists = freshSavedProducts.mm.some(p => 
          p.hasir_tipi === product.hasirTipi &&
          p.ebat_boy === parseFloat(product.uzunlukBoy) &&
          p.ebat_en === parseFloat(product.uzunlukEn) &&
          p.cap === parseFloat(product.boyCap) &&
          p.cap2 === parseFloat(product.enCap)
        );
        
        const ncbkExists500 = freshSavedProducts.ncbk.some(p => 
          p.cap === parseFloat(product.boyCap) && p.length_cm === 500
        );
        
        const ncbkExists215 = freshSavedProducts.ncbk.some(p => 
          p.cap === parseFloat(product.enCap) && p.length_cm === 215
        );
        
        const ntelExists = freshSavedProducts.ntel.some(p => 
          p.cap === parseFloat(product.boyCap)
        );
        
        if (chExists && ncbkExists500 && ncbkExists215 && ntelExists) {
          console.log(`Ürün atlandı - zaten var: ${product.hasirTipi}`, {
            productKey,
            chExists,
            ncbkExists500,
            ncbkExists215,
            ntelExists
          });
          skippedProducts.push(product);
        } else {
          console.log(`Yeni ürün eklenecek: ${product.hasirTipi}`, {
            productKey,
            chExists,
            ncbkExists500,
            ncbkExists215,
            ntelExists,
            reason: !chExists ? 'CH missing' : !ncbkExists500 ? 'NCBK 500 missing' : !ncbkExists215 ? 'NCBK 215 missing' : 'NTEL missing'
          });
          newProducts.push(product);
        }
      }
      
      console.log('Filtreleme sonuçları:', {
        totalProducts: productsToSave.length,
        newProducts: newProducts.length,
        skippedProducts: skippedProducts.length
      });
      
      if (newProducts.length === 0) {
        toast.info(`Tüm ürünler zaten veritabanında kayıtlı. ${skippedProducts.length} ürün atlandı.`);
        console.log('Hiçbir yeni ürün yok, Excel oluşturulmayacak');
        setIsSavingToDatabase(false);
        return [];
      }
      
      // Optimize edilmemiş ürün sayısını kontrol et
      const unoptimizedCount = newProducts.filter(p => !isProductOptimized(p)).length;
      
      // İlerleme tracking
      let processedCount = 0;
      const totalCount = newProducts.length;
      setDatabaseProgress({ 
        current: 0, 
        total: totalCount, 
        operation: `${newProducts.length} yeni ürün kaydediliyor, ${skippedProducts.length} mevcut ürün atlanıyor...`,
        currentProduct: unoptimizedCount > 0 ? `(${unoptimizedCount} optimize edilmemiş)` : ''
      });
      
      // Sadece YENİ ürünler için CH, NCBK ve NTEL kayıtları oluştur
      for (const product of newProducts) {
        processedCount++;
        setDatabaseProgress({ 
          current: processedCount, 
          total: totalCount, 
          operation: 'Veritabanına kaydediliyor...',
          currentProduct: `${product.hasirTipi} (${product.uzunlukBoy}x${product.uzunlukEn}cm)`
        });
        // CH kaydı
        const chData = {
          stok_kodu: generateStokKodu(product, 'CH'),
          stok_adi: generateStokAdi(product, 'CH'),
          grup_kodu: 'MM',
          kod_1: 'HSR',
          kod_2: product.uzunlukBoy === '500' && product.uzunlukEn === '215' ? 'STD' : 'OZL',
          ingilizce_isim: generateIngilizceIsim(product, 'CH'),
          hasir_tipi: product.hasirTipi,
          cap: parseFloat(product.boyCap),
          cap2: parseFloat(product.enCap),
          ebat_boy: parseFloat(product.uzunlukBoy),
          ebat_en: parseFloat(product.uzunlukEn),
          goz_araligi: formatGozAraligi(product),
          kg: parseFloat(product.adetKg || 0),
          ic_cap_boy_cubuk_ad: parseInt(product.cubukSayisiBoy),
          dis_cap_en_cubuk_ad: parseInt(product.cubukSayisiEn),
          hasir_sayisi: parseInt(product.hasirSayisi || 1),
          cubuk_sayisi_boy: parseInt(product.cubukSayisiBoy),
          cubuk_sayisi_en: parseInt(product.cubukSayisiEn),
          adet_kg: parseFloat(product.adetKg || 0),
          toplam_kg: parseFloat(product.toplamKg || 0),
          hasir_turu: product.hasirTuru || '',
          user_id: user.id
        };

        let chResult, ncbkResults = {}, ntelResult, chResponse;
        
        try {
          // CH kaydı - Önce var mı kontrol et, yoksa oluştur
          chResponse = await fetchWithAuth(API_URLS.celikHasirMm, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(chData)
          });
          
          if (chResponse.status === 409) {
            // Bu OLMAMALI - duplicate checking başarısız olmuş
            console.error(`BEKLENMEYEN DUPLICATE: CH ürün zaten var: ${chData.stok_kodu}`);
            toast.error(`Duplicate hatası: ${chData.stok_kodu}`);
            continue; // Bu ürünü atla
          } else if (!chResponse.ok) {
            throw new Error(`CH kaydı başarısız: ${chResponse.status}`);
          } else {
            chResult = await chResponse.json();
          }

          // NCBK kayıtları (Boy ve En için ayrı ayrı)
          const ncbkLengths = [500, 215];
          for (const length of ncbkLengths) {
            const cap = length === 500 ? product.boyCap : product.enCap;
            const ncbkData = {
              stok_kodu: `YM.NCBK.${String(Math.round(parseFloat(cap) * 100)).padStart(4, '0')}.${length}`,
              stok_adi: `YM Nervürlü Çubuk ${cap} mm ${length} cm`,
              grup_kodu: 'YM',
              kod_1: 'NCBK',
              cap: parseFloat(cap),
              ebat_boy: length,
              length_cm: length,
              user_id: user.id
            };

            const ncbkResponse = await fetchWithAuth(API_URLS.celikHasirNcbk, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(ncbkData)
            });
            
            if (ncbkResponse.status === 409) {
              // Bu OLMAMALI - duplicate checking başarısız olmuş
              console.error(`BEKLENMEYEN DUPLICATE: NCBK ürün zaten var: ${ncbkData.stok_kodu}`);
              toast.error(`Duplicate hatası: ${ncbkData.stok_kodu}`);
              continue; // Bu NCBK'yi atla
            } else if (!ncbkResponse.ok) {
              throw new Error(`NCBK kaydı başarısız: ${ncbkResponse.status}`);
            } else {
              const ncbkResult = await ncbkResponse.json();
              ncbkResults[length] = ncbkResult;
            }
          }

          // NTEL kaydı
          const ntelData = {
            stok_kodu: `YM.NTEL.${String(Math.round(parseFloat(product.boyCap) * 100)).padStart(4, '0')}`,
            stok_adi: `YM Nervürlü Tel ${product.boyCap} mm`,
            grup_kodu: 'YM',
            kod_1: 'NTEL',
            br_1: 'MT',
            cap: parseFloat(product.boyCap),
            user_id: user.id
          };

          const ntelResponse = await fetchWithAuth(API_URLS.celikHasirNtel, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ntelData)
          });
          
          if (ntelResponse.status === 409) {
            // Bu OLMAMALI - duplicate checking başarısız olmuş
            console.error(`BEKLENMEYEN DUPLICATE: NTEL ürün zaten var: ${ntelData.stok_kodu}`);
            toast.error(`Duplicate hatası: ${ntelData.stok_kodu}`);
            // NTEL kaydı atlandı ama devam et
          } else if (!ntelResponse.ok) {
            throw new Error(`NTEL kaydı başarısız: ${ntelResponse.status}`);
          } else {
            ntelResult = await ntelResponse.json();
          }
        } catch (error) {
          console.error(`Ürün kaydı hatası (${product.hasirTipi}):`, error);
          toast.error(`Ürün kaydı hatası: ${product.hasirTipi}`);
          continue; // Bu ürünü atla, diğerlerine devam et
        }

        // Recipe kayıtları oluştur (sadece yeni ürünler için)
        if (chResult && Object.keys(ncbkResults).length > 0) {
          try {
            await saveRecipeData(product, chResult, ncbkResults, ntelResult);
            console.log(`Recipe kayıtları başarıyla oluşturuldu: ${product.hasirTipi}`);
            
            // Sequence güncelle (sadece yeni ürünler için)
            if (chResponse && chResponse.status !== 409) {
              await updateSequences(product);
            }
          } catch (error) {
            console.error(`Recipe kaydı hatası (${product.hasirTipi}):`, error);
            // Recipe hatası durumunda warning ver ama devam et
            toast.warning(`Recipe kaydı hatası: ${product.hasirTipi}`);
          }
        }
      }

      toast.success(`${processedCount} yeni ürün ve reçeteleri başarıyla kaydedildi!`);
      setDatabaseProgress({ 
        current: processedCount, 
        total: totalCount, 
        operation: 'Veritabanı kaydı tamamlandı!',
        currentProduct: ''
      });
      
      console.log('Veritabanı kaydetme tamamlandı. Excel için döndürülen ürünler:', {
        count: newProducts.length,
        products: newProducts.map(p => p.hasirTipi)
      });
      
      // Listeyi güncelle
      await fetchSavedProducts();
      
      // Sadece yeni kaydedilen ürünleri döndür
      return newProducts;
      
    } catch (error) {
      console.error('Veritabanına kaydetme hatası:', error);
      toast.error('Veritabanına kaydetme sırasında hata oluştu');
      return [];
    } finally {
      setIsLoading(false);
      setIsSavingToDatabase(false);
    }
  };

  // Ürün sil
  const deleteProduct = async (productId, productType) => {
    if (!window.confirm('Bu ürünü silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      setIsLoading(true);
      
      // Önce reçete kayıtlarını sil
      const product = savedProducts[productType].find(p => p.id === productId);
      if (product && product.stok_kodu) {
        try {
          let recipeApiUrl = '';
          if (productType === 'mm') recipeApiUrl = API_URLS.celikHasirMmRecete;
          else if (productType === 'ncbk') recipeApiUrl = API_URLS.celikHasirNcbkRecete;
          else if (productType === 'ntel') recipeApiUrl = API_URLS.celikHasirNtelRecete;
          
          if (recipeApiUrl) {
            // Önce bu mamul_kodu ile reçete kayıtlarını getir
            const getRecipeResponse = await fetchWithAuth(`${recipeApiUrl}?mamul_kodu=${product.stok_kodu}`);
            
            if (getRecipeResponse.ok) {
              const recipes = await getRecipeResponse.json();
              console.log(`Found ${recipes.length} recipes for mamul_kodu: ${product.stok_kodu}`);
              
              // Sadece bu mamul_kodu'na ait reçeteleri filtrele ve sil
              const recipesToDelete = recipes.filter(r => r.mamul_kodu === product.stok_kodu);
              console.log(`Filtered to ${recipesToDelete.length} recipes to delete`);
              
              // Her reçete kaydını ID ile sil
              for (const recipe of recipesToDelete) {
                if (recipe.id) {
                  try {
                    const deleteRecipeResponse = await fetchWithAuth(`${recipeApiUrl}/${recipe.id}`, { method: 'DELETE' });
                    if (!deleteRecipeResponse.ok) {
                      console.warn(`Reçete silme uyarısı (ID: ${recipe.id}): ${deleteRecipeResponse.status}`);
                    }
                  } catch (deleteError) {
                    console.warn(`Reçete silme hatası (ID: ${recipe.id}):`, deleteError);
                  }
                }
              }
            }
          }
        } catch (recipeError) {
          console.warn('Reçete silme uyarısı:', recipeError);
          // Reçete silme hatası durumunda devam et
        }
      }
      
      // Sonra ana ürün kaydını sil
      let apiUrl = '';
      if (productType === 'mm') apiUrl = `${API_URLS.celikHasirMm}/${productId}`;
      else if (productType === 'ncbk') apiUrl = `${API_URLS.celikHasirNcbk}/${productId}`;
      else if (productType === 'ntel') apiUrl = `${API_URLS.celikHasirNtel}/${productId}`;

      const response = await fetchWithAuth(apiUrl, { method: 'DELETE' });
      
      if (response?.ok) {
        toast.success('Ürün ve reçeteleri başarıyla silindi');
        
        // State'i hemen güncelle - fetch bekleme
        setSavedProducts(prev => ({
          ...prev,
          [productType]: prev[productType].filter(p => p.id !== productId)
        }));
        
        // Sonra fetch ile doğrula
        await fetchSavedProducts();
      } else {
        toast.error('Ürün silinirken hata oluştu');
      }
    } catch (error) {
      console.error('Silme hatası:', error);
      toast.error('Ürün silinirken hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  // Tümünü sil
  const bulkDeleteAll = async () => {
    try {
      setIsLoading(true);
      
      const apiUrl = activeDbTab === 'mm' ? API_URLS.celikHasirMm :
                     activeDbTab === 'ncbk' ? API_URLS.celikHasirNcbk :
                     API_URLS.celikHasirNtel;
      
      const recipeApiUrl = activeDbTab === 'mm' ? API_URLS.celikHasirMmRecete :
                          activeDbTab === 'ncbk' ? API_URLS.celikHasirNcbkRecete :
                          API_URLS.celikHasirNtelRecete;
      
      const tabName = activeDbTab === 'mm' ? 'CH' : activeDbTab === 'ncbk' ? 'NCBK' : 'NTEL';
      
      // İlk önce reçete kayıtlarını sil - her ürün için ayrı ayrı
      toast.info(`${tabName} reçete kayıtları siliniyor...`);
      let recipeDeleteCount = 0;
      
      for (const product of savedProducts[activeDbTab]) {
        if (product.stok_kodu) {
          try {
            // Önce bu mamul_kodu ile reçete kayıtlarını getir
            const getRecipeResponse = await fetchWithAuth(`${recipeApiUrl}?mamul_kodu=${product.stok_kodu}`);
            
            if (getRecipeResponse.ok) {
              const recipes = await getRecipeResponse.json();
              
              // Her reçete kaydını ID ile sil
              for (const recipe of recipes) {
                if (recipe.id) {
                  try {
                    const deleteRecipeResponse = await fetchWithAuth(`${recipeApiUrl}/${recipe.id}`, { method: 'DELETE' });
                    if (deleteRecipeResponse.ok) {
                      recipeDeleteCount++;
                    }
                  } catch (deleteError) {
                    console.warn(`Reçete silme hatası (ID: ${recipe.id}):`, deleteError);
                  }
                }
              }
            }
          } catch (recipeError) {
            console.warn(`Reçete alma hatası (${product.stok_kodu}):`, recipeError);
          }
        }
      }
      
      if (recipeDeleteCount > 0) {
        toast.info(`${recipeDeleteCount} reçete kaydı silindi`);
      }
      
      // Sonra ana ürün kayıtlarını sil
      toast.info(`${tabName} ürün kayıtları siliniyor...`);
      for (const product of savedProducts[activeDbTab]) {
        await fetchWithAuth(`${apiUrl}/${product.id}`, { method: 'DELETE' });
      }
      
      // Eğer CH (mm) siliyorsak, sequence tablosunu da temizle
      if (activeDbTab === 'mm' && savedProducts.mm.length > 0) {
        toast.info('CH sequence kayıtları temizleniyor...');
        // OZL sequence'ı sıfırla
        await fetchWithAuth(`${API_URLS.celikHasirSequence}?product_type=CH&kod_2=OZL`, { 
          method: 'DELETE' 
        }).catch(() => {}); // Hata olsa bile devam et
      }
      
      toast.success(`Tüm ${tabName} kayıtları ve reçeteleri başarıyla silindi`);
      setShowBulkDeleteModal(false);
      setBulkDeleteText('');
      
      // State'i hemen güncelle - fetch bekleme
      setSavedProducts(prev => ({
        ...prev,
        [activeDbTab]: []
      }));
      
      // Sonra fetch ile doğrula
      await fetchSavedProducts();
      
    } catch (error) {
      console.error('Toplu silme hatası:', error);
      toast.error('Toplu silme sırasında hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };


  // Optimize edilmemiş ürünlerle devam et
  const proceedWithUnoptimized = () => {
    setShowOptimizationWarning(false);
    setShowDatabaseWarning(true);
  };

  return (
    <div className="p-4">
      {/* Netsis İşlemleri */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-gray-600">Netsis:</span>
        <button
          onClick={() => {
            if (optimizedProducts.length === 0) {
              setShowDatabaseModal(true);
            } else if (hasUnoptimizedProducts()) {
              setShowOptimizationWarning(true);
            } else {
              setShowDatabaseWarning(true);
            }
          }}
          disabled={isLoading || isGeneratingExcel}
          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-2 py-1 rounded text-xs transition-colors"
          title="Veritabanına Kaydet: Listede kayıtlı olmayanları veritabanına ekle ve netsis exceli oluştur. Önce yeni ürünleri kaydeder, sonra otomatik olarak Excel dosyalarını oluşturur."
        >
          Kaydet
        </button>
        
        <button
          onClick={async () => {
            if (optimizedProducts.length === 0) {
              toast.warn('Excel oluşturmak için önce ürün listesini doldurun.');
              return;
            }
            await generateExcelFiles(optimizedProducts, true);
          }}
          disabled={isLoading || isGeneratingExcel || optimizedProducts.length === 0}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-2 py-1 rounded text-xs transition-colors"
          title="Excel Oluştur: Mevcut listenin tümünün Excel dosyalarını oluştur. Sadece Excel dosyalarını indirir, veritabanına kaydetmez."
        >
          Excel
        </button>
        
        <button
          onClick={() => {
            setShowDatabaseModal(true);
          }}
          className="bg-gray-600 hover:bg-gray-700 text-white px-2 py-1 rounded text-xs transition-colors"
          title="Veritabanı İşlemleri: Kayıtlı ürünleri görüntüle, sil ve yönet. Mevcut veritabanındaki ürünleri gösterir ve tek tek silme işlemi yapabilirsiniz."
        >
          DB
        </button>
        
        {optimizedProducts.length > 0 && (
          <span 
            className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded cursor-help"
            title={`Toplam ${optimizedProducts.length} ürün var. ${optimizedProducts.filter(p => !isProductOptimized(p)).length} tanesi optimize edilmemiş. ${getProductsToSave().length} tanesi veritabanında yok ve kaydedilecek.`}
          >
            {optimizedProducts.length} toplam • {optimizedProducts.filter(p => !isProductOptimized(p)).length} optimize edilmemiş • {getProductsToSave().length} kaydedilecek
          </span>
        )}
      </div>

      {/* Optimizasyon Uyarı Modal */}
      {showOptimizationWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
              <h3 className="text-lg font-semibold">Optimizasyon Uyarısı</h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              Listede optimize edilmemiş ürünler bulunmaktadır. 
              Bu ürünler uyarı ile birlikte kaydedilecektir. Devam etmek istiyor musunuz?
            </p>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowOptimizationWarning(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={proceedWithUnoptimized}
                className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition-colors"
              >
                Devam Et
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Veritabanı Kayıt Progress Modal */}
            
            {optimizedProducts.length > 0 && (
              <div className="mb-4 text-sm bg-blue-50 border border-blue-200 rounded-lg p-3">
                <strong>Mevcut Liste:</strong> {optimizedProducts.length} ürün bulundu
              </div>
            )}
            
            <div className="space-y-4">
              <button
                onClick={() => {
      {/* Veritabanı Uyarı Modal */}
      {showDatabaseWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
              <h3 className="text-lg font-semibold">Veritabanı Kaydı</h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              Ürünler veritabanına kaydedilecek ve Excel dosyaları oluşturulacak. Devam etmek istiyor musunuz?
            </p>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDatabaseWarning(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={async () => {
                  setShowDatabaseWarning(false);
                  
                  try {
                    const newProducts = await saveToDatabase(optimizedProducts);
                    if (newProducts && newProducts.length > 0) {
                      console.log(`Excel oluşturma başlıyor: ${newProducts.length} yeni ürün için`);
                      await generateExcelFiles(newProducts);
                      toast.success(`${newProducts.length} yeni ürün için Excel dosyaları oluşturuldu!`);
                    } else {
                      toast.info('Hiç yeni ürün eklenmedi, Excel oluşturulmadı.');
                    }
                  } catch (error) {
                    console.error('Database save error:', error);
                    toast.error('Veritabanı kaydı sırasında hata oluştu');
                  }
                }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Evet, Devam Et
              </button>
            </div>
          </div>
        </div>
      )}
                  console.log('Save button clicked. Product check:', {
                    totalProducts: optimizedProducts.length,
                    hasUnoptimized: hasUnoptimizedProducts(),
                    unoptimizedCount: unoptimizedProducts.length,
                    unoptimizedList: unoptimizedProducts.map(p => ({ 
                      hasirTipi: p.hasirTipi, 
                      optimized: isProductOptimized(p),
                      boyCap: p.boyCap,
                      enCap: p.enCap,
                      cubukSayisiBoy: p.cubukSayisiBoy,
                      cubukSayisiEn: p.cubukSayisiEn,
                      missingFields: [
                        !p.boyCap && 'boyCap',
                        !p.enCap && 'enCap', 
                        !p.cubukSayisiBoy && 'cubukSayisiBoy',
                        !p.cubukSayisiEn && 'cubukSayisiEn'
                      ].filter(Boolean)
                    })),
                    allProductsDebug: optimizedProducts.map(p => ({
                      hasirTipi: p.hasirTipi,
                      isOptimized: isProductOptimized(p)
                    }))
                  });
                  
                  if (optimizedProducts.length === 0) {
                    // Ürün yoksa direkt veritabanı ekranına git
                    console.log('No products, opening database modal');
                                  setShowDatabaseModal(true);
                  } else if (hasUnoptimizedProducts()) {
                    console.log('Unoptimized products found, showing warning');
                    setShowOptimizationWarning(true);
                  } else {
                    console.log('All products optimized, showing database warning');
                    setShowDatabaseWarning(true);
                  }
                }}
                disabled={isLoading || isGeneratingExcel}
                className="hidden"
              >
                {isLoading ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : (
                  <Upload className="w-5 h-5" />
                )}
                <div className="text-left">
                  <div className="font-medium">
                    {isLoading ? 'Veritabanı işlemi devam ediyor...' : 'Sadece Yeni Ürünleri Kaydet ve Excel Oluştur'}
                  </div>
                  <div className="text-sm opacity-90">
                    {isLoading ? 'Lütfen bekleyiniz, işlem tamamlanıyor...' : 'Veritabanında olmayan ürünleri ekler (Silinen ürünler dahil)'}
                  </div>
                </div>
              </button>
              
              <button
                onClick={async () => {
                  if (optimizedProducts.length === 0) {
                    toast.warn('Excel oluşturmak için önce ürün listesini doldurun.');
                    return;
                  }
                  
                  // Tüm listeden Excel oluştur (veritabanı kayıt yapmadan)
                  await generateExcelFiles(optimizedProducts, true);
                }}
                disabled={isLoading || isGeneratingExcel || optimizedProducts.length === 0}
                className="hidden"
              >
                <FileSpreadsheet className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">Mevcut Listenin Tümünün Excellerini Oluştur</div>
                  <div className="text-sm opacity-90">Sadece Excel dosyalarını oluştur (veritabanı değişikliği yapmaz)</div>
                </div>
              </button>
              
              <button
                onClick={() => { 
                  ; 
                  setShowDatabaseModal(true);
                  fetchSavedProducts(); // Auto-refresh when opening
                }}
                disabled={isLoading}
                className="hidden"
              >
                <Database className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">Veritabanı Yönetimi</div>
                  <div className="text-sm opacity-90">Kayıtlı ürünleri görüntüle, sil ve yönet</div>
                </div>
              </button>
              
              {/* Debugging Info */}
              <div className="hidden">
                <div className="text-xs text-yellow-700">
                  <strong>Not:</strong> Eğer bir ürünü silip tekrar eklemeye çalışıyorsanız:
                  <ul className="mt-1 ml-4 list-disc">
                    <li>"Sadece Yeni Ürünleri Kaydet" butonu silinen ürünü yeniden ekler</li>
                    <li>"Mevcut Listenin Tümünün Excellerini Oluştur" tüm listeden Excel yapar</li>
                    <li>Konsol'u (F12) açıp debug mesajlarını kontrol edebilirsiniz</li>
                  </ul>
                </div>
              </div>
            </div>

      {/* Veritabanı Kayıt Progress Modal */}
      {isSavingToDatabase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <Loader className="w-12 h-12 animate-spin mx-auto mb-4 text-green-600" />
              <h3 className="text-lg font-semibold mb-2">Veritabanı İşlemi Devam Ediyor</h3>
              <p className="text-gray-600 mb-4">{databaseProgress.operation}</p>
              
              {databaseProgress.currentProduct && (
                <p className="text-sm text-gray-500 mb-4">
                  <span className="font-medium">Mevcut Ürün:</span> {databaseProgress.currentProduct}
                </p>
              )}
              
              {databaseProgress.total > 0 && (
                <>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(databaseProgress.current / databaseProgress.total) * 100}%` }}
                    />
                  </div>
                  
                  <p className="text-sm text-gray-500">
                    {databaseProgress.current} / {databaseProgress.total} ürün işlendi
                  </p>
                </>
              )}
              
              <p className="text-xs text-gray-400 mt-4 mb-4">
                Lütfen bekleyiniz, işlem tamamlanıyor...
              </p>
              
              <button
                onClick={() => {
                  if (window.confirm('Veritabanı işlemini iptal etmek istediğinizden emin misiniz?')) {
                    setIsSavingToDatabase(false);
                    setIsLoading(false);
                    toast.warning('İşlem kullanıcı tarafından iptal edildi');
                  }
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm"
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Excel Üretim Progress Modal */}
      {isGeneratingExcel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <Loader className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
              <h3 className="text-lg font-semibold mb-2">Excel Dosyaları Oluşturuluyor</h3>
              <p className="text-gray-600 mb-4">{excelProgress.operation}</p>
              
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(excelProgress.current / excelProgress.total) * 100}%` }}
                />
              </div>
              
              <p className="text-sm text-gray-500">
                {excelProgress.current} / {excelProgress.total} dosya
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Veritabanı Modal */}
      {showDatabaseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold">Çelik Hasır Veritabanı</h3>
                <div className="flex items-center gap-3">
                  <button
                    onClick={fetchSavedProducts}
                    disabled={isLoading}
                    className="px-3 py-1 bg-blue-600 text-white rounded-md flex items-center gap-2 hover:bg-blue-700 transition-colors text-sm disabled:bg-gray-400"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Yenile
                  </button>
                  <button
                    onClick={() => setShowBulkDeleteModal(true)}
                    disabled={isLoading}
                    className="px-3 py-1 bg-red-600 text-white rounded-md flex items-center gap-2 hover:bg-red-700 transition-colors text-sm disabled:bg-gray-400"
                  >
                    <Trash2 className="w-4 h-4" />
                    {activeDbTab === 'mm' ? 'CH Sil' : activeDbTab === 'ncbk' ? 'NCBK Sil' : 'NTEL Sil'}
                  </button>
                  <button
                    onClick={() => setShowDatabaseModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              
              {/* Tab Navigation */}
              <div className="flex gap-1 mt-4">
                {[
                  { key: 'mm', label: 'CH Ürünler', count: savedProducts.mm.length },
                  { key: 'ncbk', label: 'YM NCBK', count: savedProducts.ncbk.length },
                  { key: 'ntel', label: 'YM NTEL', count: savedProducts.ntel.length }
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveDbTab(tab.key)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      activeDbTab === tab.key
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {/* Ürün Listesi */}
              <div className="space-y-3">
                {savedProducts[activeDbTab].map(product => (
                  <div key={product.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 mb-1">{product.stok_kodu}</h4>
                        <p className="text-sm text-gray-600 mb-2">{product.stok_adi}</p>
                        <div className="flex gap-4 text-xs text-gray-500">
                          <span>Grup: {product.grup_kodu}</span>
                          <span>Kod-1: {product.kod_1}</span>
                          {product.cap && <span>Çap: {product.cap}mm</span>}
                          {product.length_cm && <span>Uzunluk: {product.length_cm}cm</span>}
                        </div>
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => {
                            setViewingProduct({ ...product, type: activeDbTab });
                            setShowViewModal(true);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Görüntüle"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteProduct(product.id, activeDbTab)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                
                {savedProducts[activeDbTab].length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    Bu kategoride kayıtlı ürün bulunmamaktadır.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Veritabanı İşlemi Uyarı Modalı */}
      {showDatabaseWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
              <h3 className="text-xl font-semibold text-gray-900">Veritabanı İşlemi Uyarısı</h3>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700 mb-3">
                <strong>Dikkat:</strong> Bu işlem veritabanında değişiklik yapacaktır.
              </p>
              <p className="text-gray-600 text-sm">
                Yeni ürünler veritabanına kaydedilecek ve tüm Excel dosyaları oluşturulacaktır. 
                Bu işlem geri alınamaz. Devam etmek istediğinizden emin misiniz?
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowDatabaseWarning(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={async () => {
                  setShowDatabaseWarning(false);
                  
                  try {
                    const newProducts = await saveToDatabase(optimizedProducts);
                    if (newProducts && newProducts.length > 0) {
                      console.log(`Excel oluşturma başlıyor: ${newProducts.length} yeni ürün için`);
                      await generateExcelFiles(newProducts);
                      toast.success(`${newProducts.length} yeni ürün için Excel dosyaları oluşturuldu!`);
                    } else {
                      toast.info('Hiç yeni ürün eklenmedi, Excel oluşturulmadı.');
                    }
                  } catch (error) {
                    console.error('Database save error:', error);
                    toast.error('Veritabanı kaydı sırasında hata oluştu');
                  }
                }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Evet, Devam Et
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toplu Silme Onay Modalı */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-500" />
              <h3 className="text-xl font-semibold text-gray-900">Tümünü Sil Onayı</h3>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700 mb-3">
                <strong>Dikkat:</strong> Bu işlem tüm {activeDbTab === 'mm' ? 'CH' : activeDbTab === 'ncbk' ? 'NCBK' : 'NTEL'} kayıtlarını kalıcı olarak silecektir.
              </p>
              <p className="text-gray-600 text-sm mb-4">
                Bu işlemi onaylamak için aşağıya <strong>"Hepsini Sil"</strong> yazın:
              </p>
              <input
                type="text"
                value={bulkDeleteText}
                onChange={(e) => setBulkDeleteText(e.target.value)}
                placeholder="Hepsini Sil"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowBulkDeleteModal(false);
                  setBulkDeleteText('');
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={bulkDeleteAll}
                disabled={bulkDeleteText !== 'Hepsini Sil' || isLoading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Siliniyor...' : 'Sil'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ürün Görüntüleme Modalı */}
      {showViewModal && viewingProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold">
                  {viewingProduct.type === 'mm' ? 'CH Mamül' : 
                   viewingProduct.type === 'ncbk' ? 'YM NCBK Yarı Mamül' : 
                   'YM NTEL Yarı Mamül'} Detayları
                </h3>
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setViewingProduct(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Stok Kodu</label>
                    <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded">{viewingProduct.stok_kodu}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Stok Adı</label>
                    <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded">{viewingProduct.stok_adi}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Grup</label>
                    <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded">{viewingProduct.grup_kodu}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Kod-1</label>
                    <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded">{viewingProduct.kod_1}</p>
                  </div>
                  {viewingProduct.kod_2 && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Kod-2</label>
                      <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded">{viewingProduct.kod_2}</p>
                    </div>
                  )}
                </div>
                
                <div className="space-y-3">
                  {viewingProduct.cap && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Çap (mm)</label>
                      <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded">{viewingProduct.cap}</p>
                    </div>
                  )}
                  {viewingProduct.length_cm && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Uzunluk (cm)</label>
                      <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded">{viewingProduct.length_cm}</p>
                    </div>
                  )}
                  {viewingProduct.ebat_boy && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Ebat (Boy)</label>
                      <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded">{viewingProduct.ebat_boy}</p>
                    </div>
                  )}
                  {viewingProduct.ebat_en && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Ebat (En)</label>
                      <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded">{viewingProduct.ebat_en}</p>
                    </div>
                  )}
                  {viewingProduct.goz_araligi && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Göz Aralığı</label>
                      <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded">{viewingProduct.goz_araligi}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-gray-700">Birim-1</label>
                    <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded">{viewingProduct.br_1}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Oluşturulma</label>
                    <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded">
                      {new Date(viewingProduct.created_at).toLocaleString('tr-TR')}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setShowViewModal(false);
                      setViewingProduct(null);
                    }}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Kapat
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CelikHasirNetsis;