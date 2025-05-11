import React, { useState, useEffect, useCallback } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { AlertCircle, Calculator, Check, Download, Edit, FileText, Loader2, RefreshCw, Save, Search, X } from 'lucide-react';
import { toast } from 'react-toastify';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { API_URLS, fetchWithAuth, normalizeInputValue } from '@/api-config';
import { useAuth } from '@/context/AuthContext';

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

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
} from '@/components/ui/card';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
} from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

// Create simple UI components instead of using shadcn components that might be missing
const Input = ({ id, value, onChange, placeholder, className }) => (
  <input
    id={id}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    className={`w-full p-2 border rounded-md ${className || ''}`}
  />
);

const Label = ({ htmlFor, children, className }) => (
  <label
    htmlFor={htmlFor}
    className={`block text-sm font-medium text-gray-700 mb-1 ${className || ''}`}
  >
    {children}
  </label>
);

const Button = ({ children, onClick, disabled, className, variant }) => {
  let buttonClass = 'px-4 py-2 rounded-md font-medium text-sm';

  if (variant === 'outline') {
    buttonClass += ' border border-gray-300 bg-white text-gray-700 hover:bg-gray-50';
  } else if (variant === 'ghost') {
    buttonClass += ' bg-transparent text-gray-600 hover:bg-gray-100';
  } else if (variant === 'secondary') {
    buttonClass += ' bg-gray-200 text-gray-800 hover:bg-gray-300';
  } else {
    buttonClass += ' bg-blue-600 text-white hover:bg-blue-700';
  }

  if (disabled) {
    buttonClass += ' opacity-50 cursor-not-allowed';
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${buttonClass} ${className || ''}`}
    >
      {children}
    </button>
  );
};

const Checkbox = ({ id, checked, onCheckedChange, className }) => (
  <input
    type="checkbox"
    id={id}
    checked={checked}
    onChange={(e) => onCheckedChange(e.target.checked)}
    className={`h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${className || ''}`}
  />
);

const Separator = ({ className }) => (
  <div className={`h-px bg-gray-200 my-4 ${className || ''}`} />
);

// YM ST durum göstergesi bileşeni
const YmStStatusIndicator = ({ ymSt }) => {
  // Kaynak bilgisi yoksa varsayılan olarak database kabul et
  const source = ymSt.source || 'database';

  // Stil ve etiket seçimi
  const style = {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: 'medium',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '4px'
  };

  let backgroundColor, textColor, label, icon;

  if (source === 'auto-generated') {
    backgroundColor = '#dcfce7'; // açık yeşil
    textColor = '#166534'; // koyu yeşil
    label = ymSt.sourceLabel || 'Otomatik oluşturuldu';
    icon = <div className="h-2 w-2 rounded-full bg-green-600"></div>;
  } else {
    backgroundColor = '#dbeafe'; // açık mavi
    textColor = '#1e40af'; // koyu mavi
    label = ymSt.sourceLabel || 'Veritabanından';
    icon = <div className="h-2 w-2 rounded-full bg-blue-600"></div>;
  }

  return (
    <div style={{ ...style, backgroundColor, color: textColor }}>
      <span>{label}</span>
      {icon}
    </div>
  );
};

const GalvanizliTelManager = () => {
  // Initial form values
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

  // Initial recete values
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

  // State tanımlamaları
  const [formValues, setFormValues] = useState(initialFormValues);
  const [receteFormValues, setReceteFormValues] = useState(initialReceteValues);
  const [receteGosterimValues, setReceteGosterimValues] = useState(null);

  const [mmGtData, setMmGtData] = useState(null);
  const [ymGtData, setYmGtData] = useState(null);
  const [selectedYmSt, setSelectedYmSt] = useState([]);
  const [receteData, setReceteData] = useState(null);

  const [isEditMode, setIsEditMode] = useState(false);
  const [dataExist, setDataExist] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Navigation and modals
  const [activePage, setActivePage] = useState('uretim'); // 'uretim', 'talepler'
  const [currentStep, setCurrentStep] = useState('form'); // 'form', 'summary', 'edit-ymst', 'edit-recete'

  // Component modals
  const [showYmStSearchModal, setShowYmStSearchModal] = useState(false);
  const [showYmStCreateModal, setShowYmStCreateModal] = useState(false);
  const [showDatabaseModal, setShowDatabaseModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showTalepDetailModal, setShowTalepDetailModal] = useState(false);
  const [showRejectTalepModal, setShowRejectTalepModal] = useState(false);
  const [showExcelWithoutSaveWarning, setShowExcelWithoutSaveWarning] = useState(false);

  // Search and filter states
  const [searchYmSt, setSearchYmSt] = useState("");
  const [filteredYmStList, setFilteredYmStList] = useState([]);
  const [selectedYmStToAdd, setSelectedYmStToAdd] = useState(null);
  const [sequence, setSequence] = useState(0);

  // Excel and database states
  const [excelCreated, setExcelCreated] = useState({
    stokKarti: false,
    recete: false
  });
  const [databaseSaved, setDatabaseSaved] = useState(false);
  const [excelTypeToGenerate, setExcelTypeToGenerate] = useState(null);

  // Database and talep states
  const [ymStList, setYmStList] = useState([]);
  const [talepList, setTalepList] = useState([]);
  const [filteredTalepItems, setFilteredTalepItems] = useState([]);
  const [talepCount, setTalepCount] = useState({ all: 0, pending: 0, approved: 0, rejected: 0 });
  const [talepFilter, setTalepFilter] = useState({ status: 'pending', search: '' });
  const [databaseFilter, setDatabaseFilter] = useState({
    type: 'mmGt',
    search: ''
  });
  const [filteredDatabaseItems, setFilteredDatabaseItems] = useState([]);

  // Selection states
  const [selectedTalepId, setSelectedTalepId] = useState(null);
  const [selectedTalep, setSelectedTalep] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [refreshingDatabase, setRefreshingDatabase] = useState(false);

  // Arama sekmesi kaldırıldı

  const { user } = useAuth();

  // Hata işleme
  const handleError = (message, error) => {
    console.error(message, error);
    setError(message);
    setLoading(false);
    toast.error(message);
  };

  // Talep listesini getir
  const fetchTalepList = useCallback(async () => {
    try {
      setLoading(true);

      // Talep sayılarını getir
      const countResponse = await fetchWithAuth(`${API_URLS.galTaleplerEndpoint}/count`);
      if (countResponse && countResponse.ok) {
        const countData = await countResponse.json();
        setTalepCount({ all: countData.count || 0, pending: 0, approved: 0, rejected: 0 });
      }

      // Bekleyen talep sayısı
      const pendingCountResponse = await fetchWithAuth(`${API_URLS.galTaleplerEndpoint}/count?status=pending`);
      if (pendingCountResponse && pendingCountResponse.ok) {
        const pendingCountData = await pendingCountResponse.json();
        setTalepCount(prev => ({ ...prev, pending: pendingCountData.count || 0 }));
      }

      // Tüm talepleri getir
      const response = await fetchWithAuth(API_URLS.galTaleplerEndpoint);

      if (!response || !response.ok) {
        throw new Error(`Talepler getirilemedi: ${response?.status}`);
      }

      const data = await response.json();
      setTalepList(data);
      setFilteredTalepItems(data);
      setLoading(false);
    } catch (error) {
      handleError(`Talep listesi yüklenirken hata oluştu: ${error.message}`, error);
    }
  }, []);

  // Talep detaylarını getir
  const fetchTalepDetails = async (talepId) => {
    try {
      const response = await fetchWithAuth(`${API_URLS.galTaleplerEndpoint}/${talepId}`);

      if (!response || !response.ok) {
        throw new Error(`Talep detayları getirilemedi: ${response?.status}`);
      }

      return await response.json();
    } catch (error) {
      handleError(`Talep detayları getirilirken hata oluştu: ${error.message}`, error);
      return null;
    }
  };

  // Talebi onayla
  const approveTalep = async (talepId) => {
    try {
      const response = await fetchWithAuth(`${API_URLS.galTaleplerEndpoint}/${talepId}/approve`, {
        method: 'PUT',
        body: JSON.stringify({
          processed_by: user?.id || 'system'
        })
      });

      if (!response || !response.ok) {
        throw new Error(`Talep onaylanamadı: ${response?.status}`);
      }

      toast.success('Talep başarıyla onaylandı');
      await fetchTalepList();
      return true;
    } catch (error) {
      handleError(`Talep onaylanırken hata oluştu: ${error.message}`, error);
      return false;
    }
  };

  // Talebi reddet
  const rejectTalep = async (talepId, reason) => {
    try {
      const response = await fetchWithAuth(`${API_URLS.galTaleplerEndpoint}/${talepId}/reject`, {
        method: 'PUT',
        body: JSON.stringify({
          processed_by: user?.id || 'system',
          rejection_reason: reason
        })
      });

      if (!response || !response.ok) {
        throw new Error(`Talep reddedilemedi: ${response?.status}`);
      }

      toast.success('Talep reddedildi');
      await fetchTalepList();
      return true;
    } catch (error) {
      handleError(`Talep reddedilirken hata oluştu: ${error.message}`, error);
      return false;
    }
  };

  // MM GT önizlemesi oluştur
  const createMmGtPreview = (values) => {
    if (!values.cap || !values.kod_2) return null;

    const capValue = parseFloat(values.cap);
    const formattedCap = capValue.toFixed(2);

    return {
      stockCode: `GT.${values.kod_2}.${formattedCap.replace('.', '').padStart(4, '0')}.XX`,
      description: `MM.GT.${values.kod_2} Ø${formattedCap} ${values.min_mukavemet || '?'}-${values.max_mukavemet || '?'}N/MM²`,
      cap: capValue,
      kod_2: values.kod_2,
      kaplama: parseInt(values.kaplama) || 0,
      minMukavemet: parseInt(values.min_mukavemet) || 0,
      maxMukavemet: parseInt(values.max_mukavemet) || 0,
      toleransPlus: parseFloat(values.tolerans_plus) || 0,
      toleransMinus: parseFloat(values.tolerans_minus) || 0,
      icCap: parseInt(values.ic_cap) || 0,
      disCap: parseInt(values.dis_cap) || 0,
      kg: parseInt(values.kg) || 0,
      unwinding: values.unwinding || false,
      shrink: values.shrink || false
    };
  };

  // YM GT önizlemesi oluştur
  const createYmGtPreview = (values, mmGtPreview) => {
    if (!values.cap || !values.kod_2 || !mmGtPreview) return null;

    const capValue = parseFloat(values.cap);
    const formattedCap = capValue.toFixed(2);

    return {
      stockCode: `YM.GT.${values.kod_2}.${formattedCap.replace('.', '').padStart(4, '0')}.01`,
      description: `YM.GT.${values.kod_2} Ø${formattedCap} ${values.min_mukavemet || '?'}-${values.max_mukavemet || '?'}N/MM²`,
      mmGtId: null,
      cap: capValue,
      kod_2: values.kod_2,
      kaplama: parseInt(values.kaplama) || 0,
      minMukavemet: parseInt(values.min_mukavemet) || 0,
      maxMukavemet: parseInt(values.max_mukavemet) || 0,
      toleransPlus: parseFloat(values.tolerans_plus) || 0,
      toleransMinus: parseFloat(values.tolerans_minus) || 0,
      icCap: parseInt(values.ic_cap) || 0,
      disCap: parseInt(values.dis_cap) || 0,
      kg: parseInt(values.kg) || 0,
      unwinding: values.unwinding || false,
      shrink: values.shrink || false
    };
  };

  // YM ST'leri otomatik seç
  const autoSelectYmSt = async (values) => {
    try {
      // Önce çapa ve kod_2'ye göre veritabanında mevcut YM ST'leri ara
      const searchParams = new URLSearchParams();
      searchParams.append('kod_2', values.kod_2);
      searchParams.append('cap', values.cap);

      const response = await fetchWithAuth(`${API_URLS.galYmSt}?${searchParams.toString()}`);

      if (!response || !response.ok) {
        throw new Error(`YM ST araması başarısız: ${response?.status}`);
      }

      const data = await response.json();

      if (data.length > 0) {
        // Veritabanında YM ST'ler bulundu
        const formattedItems = data.map(item => ({
          id: item.id,
          stockCode: item.stok_kodu,
          description: item.aciklama,
          cap: parseFloat(item.cap) || 0,
          kod_2: item.kod_2 || '',
          kaplama: parseInt(item.kaplama) || 0,
          minMukavemet: parseInt(item.min_mukavemet) || 0,
          maxMukavemet: parseInt(item.max_mukavemet) || 0,
          toleransPlus: parseFloat(item.tolerans_plus) || 0,
          toleransMinus: parseFloat(item.tolerans_minus) || 0,
          icCap: parseInt(item.ic_cap) || 0,
          disCap: parseInt(item.dis_cap) || 0,
          kg: parseInt(item.kg) || 0,
          unwinding: item.unwinding || false,
          shrink: item.shrink || false,
          source: 'database',
          sourceLabel: 'Veritabanından'
        }));

        return formattedItems;
      } else {
        // Veritabanında YM ST yoksa otomatik oluştur
        const capValue = parseFloat(values.cap);
        const formattedCap = capValue.toFixed(2);

        // YM ST sayısını belirle (çapa göre)
        let ymStCount = 2; // Varsayılan olarak 2 YM ST

        // Çap değeri 2.0'dan küçükse 3 YM ST oluştur
        if (capValue < 2.0) {
          ymStCount = 3;
        }
        // Çap değeri 4.0'dan büyükse 1 YM ST oluştur
        else if (capValue > 4.0) {
          ymStCount = 1;
        }

        // YM ST'leri oluştur
        const autoItems = [];
        for (let i = 0; i < ymStCount; i++) {
          // Sıra numarasını 01, 02, 03 gibi formatla
          const siraNo = (i + 1).toString().padStart(2, '0');

          autoItems.push({
            stockCode: `YM.ST.${values.kod_2}.${formattedCap.replace('.', '').padStart(4, '0')}.${siraNo}`,
            description: `YM.ST.${values.kod_2} Ø${formattedCap} ${values.min_mukavemet}-${values.max_mukavemet}N/MM²`,
            cap: capValue,
            kod_2: values.kod_2,
            kaplama: 0, // YM ST için kaplama 0
            minMukavemet: parseInt(values.min_mukavemet) || 0,
            maxMukavemet: parseInt(values.max_mukavemet) || 0,
            toleransPlus: parseFloat(values.tolerans_plus) || 0,
            toleransMinus: parseFloat(values.tolerans_minus) || 0,
            icCap: parseInt(values.ic_cap) || 0,
            disCap: parseInt(values.dis_cap) || 0,
            kg: parseInt(values.kg) || 0,
            unwinding: values.unwinding || false,
            shrink: values.shrink || false,
            source: 'auto-generated',
            sourceLabel: 'Otomatik oluşturuldu'
          });
        }

        return autoItems;
      }
    } catch (error) {
      handleError(`YM ST otomatik seçme hatası: ${error.message}`, error);
      return [];
    }
  };

  // Reçete verilerini oluştur
  const createReceteData = (mmGt, ymGt, ymStList) => {
    // MM GT Reçetesi
    const mmGtRecete = [
      { stockCode: 'YM.GT.X.XX', stockName: `YM.GT.${mmGt.kod_2} ${mmGt.cap.toFixed(2)}`, amount: 1, unit: 'KG', sira: 1 },
      { stockCode: 'GELKAP01', stockName: 'GELENEKSEL KAP', amount: 1, unit: 'AD', sira: 2 },
      { stockCode: 'MMBSKL', stockName: 'BAŞLIK', amount: 2, unit: 'AD', sira: 3 },
      { stockCode: 'MMKPAK01', stockName: 'MM KAPAK', amount: 1, unit: 'AD', sira: 4 },
      { stockCode: 'MMŞRINK', stockName: 'MM SHRINK', amount: 1, unit: 'AD', sira: 5 },
      { stockCode: 'MMSBKL01', stockName: 'SABUNLUK', amount: 1, unit: 'AD', sira: 6 },
      { stockCode: 'MMETKTS1', stockName: 'MM.ETİKET STANDART', amount: 1, unit: 'AD', sira: 7 },
      { stockCode: 'MMPALT01', stockName: 'MM PALET', amount: 0.0125, unit: 'AD', sira: 8 }
    ];

    // YM GT Reçetesi - SM.DESİ.PAK ve GTPKT01 satırları hariç
    const ymGtRecete = [
      { stockCode: 'YM.ST.X.XX', stockName: `YM.ST.${ymGt.kod_2} ${ymGt.cap.toFixed(2)}`, amount: 1, unit: 'KG', sira: 1 },
      { stockCode: 'YMBSKL01', stockName: 'YM BAŞLIK', amount: 2, unit: 'AD', sira: 2 },
      { stockCode: 'YMKPAK01', stockName: 'YM KAPAK', amount: 1, unit: 'AD', sira: 3 },
      { stockCode: 'YMSBNLK1', stockName: 'YM SABUNLUK', amount: 1, unit: 'AD', sira: 4 }
    ];

    // YM ST Reçeteleri
    const ymStRecete = {};

    ymStList.forEach((ymSt, index) => {
      ymStRecete[ymSt.id || 'temp'] = [
        { stockCode: 'DUZ.TEL.01', stockName: 'DÜZ TEL', amount: 1, unit: 'KG', sira: 1 },
        { stockCode: 'CINKO.01', stockName: 'ÇİNKO', amount: (mmGt.kaplama / 100), unit: 'KG', sira: 2 }
      ];
    });

    return {
      mmGtRecete,
      ymGtRecete,
      ymStRecete
    };
  };

  // Stok Kartı Excel oluştur
  const createStokKartiExcel = async () => {
    try {
      if (!mmGtData || !ymGtData || selectedYmSt.length === 0) {
        toast.error('Excel dosyası oluşturmak için MM GT, YM GT ve YM ST verileri gerekli');
        return;
      }

      setLoading(true);

      // Excel workbook oluştur
      const workbook = new ExcelJS.Workbook();

      // MM GT sayfasını ekle
      const mmGtSheet = workbook.addWorksheet('MM GT');

      // MM GT başlıkları
      mmGtSheet.columns = [
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
        { header: 'Pay-1', key: 'pay_1', width: 10 },
        { header: 'Payda-1', key: 'payda_1', width: 10 },
        { header: 'Çevrim Değeri-1', key: 'cevrim_degeri_1', width: 15 },
        { header: 'Ölçü Br-3', key: 'olcu_br_3', width: 10 },
        { header: 'Çevrim Pay-2', key: 'cevrim_pay_2', width: 15 },
        { header: 'Çevrim Payda-2', key: 'cevrim_payda_2', width: 15 },
        { header: 'Çevrim Değeri-2', key: 'cevrim_degeri_2', width: 15 },
        { header: 'Çap', key: 'cap', width: 10 },
        { header: 'Kaplama', key: 'kaplama', width: 10 },
        { header: 'Min Mukavemet', key: 'min_mukavemet', width: 15 },
        { header: 'Max Mukavemet', key: 'max_mukavemet', width: 15 },
        { header: 'KG', key: 'kg', width: 10 },
        { header: 'İç Çap/Boy Çubuk AD', key: 'ic_cap', width: 20 },
        { header: 'Dış Çap/En Çubuk AD', key: 'dis_cap', width: 20 },
        { header: 'Çap2', key: 'cap2', width: 10 },
        { header: 'Shrink', key: 'shrink', width: 10 },
        { header: 'Tolerans(+)', key: 'tolerans_plus', width: 12 },
        { header: 'Tolerans(-)', key: 'tolerans_minus', width: 12 },
        { header: 'Ebat(En)', key: 'ebat_en', width: 10 },
        { header: 'Göz Aralığı', key: 'goz_araligi', width: 12 },
        { header: 'Ebat(Boy)', key: 'ebat_boy', width: 10 },
        { header: 'Hasır Tipi', key: 'hasir_tipi', width: 12 },
        { header: 'Özel Saha 8 (Alf.)', key: 'ozel_saha_8_alf', width: 20 },
        { header: 'Alış Fiyatı', key: 'alis_fiyati', width: 12 },
        { header: 'Fiyat Birimi', key: 'fiyat_birimi', width: 12 },
        { header: 'Satış Fiyatı-1', key: 'satis_fiyati_1', width: 15 },
        { header: 'Satış Fiyatı-2', key: 'satis_fiyati_2', width: 15 },
        { header: 'Satış Fiyatı-3', key: 'satis_fiyati_3', width: 15 },
        { header: 'Satış Fiyatı-4', key: 'satis_fiyati_4', width: 15 },
        { header: 'Satış Tipi', key: 'satis_tipi', width: 12 },
        { header: 'Döviz Alış', key: 'doviz_alis', width: 12 },
        { header: 'Döviz Maliyeti', key: 'doviz_maliyeti', width: 15 },
        { header: 'Döviz Satış Fiyatı', key: 'doviz_satis_fiyati', width: 18 },
        { header: 'Azami Stok', key: 'azami_stok', width: 12 },
        { header: 'Asgari Stok', key: 'asgari_stok', width: 12 },
        { header: 'Döv.Tutar', key: 'dov_tutar', width: 12 },
        { header: 'Döv.Tipi', key: 'dov_tipi', width: 10 },
        { header: 'Bekleme Süresi', key: 'bekleme_suresi', width: 15 },
        { header: 'Temin Süresi', key: 'temin_suresi', width: 12 },
        { header: 'Birim Ağırlık', key: 'birim_agirlik', width: 12 },
        { header: 'Nakliye Tutar', key: 'nakliye_tutar', width: 12 },
        { header: 'Satış KDV Oranı', key: 'satis_kdv_orani', width: 15 },
        { header: 'Alış KDV Oranı', key: 'alis_kdv_orani', width: 15 },
        { header: 'Stok Türü', key: 'stok_turu', width: 10 },
        { header: 'Mali Grup Kodu', key: 'mali_grup_kodu', width: 15 },
        { header: 'Barkod 1', key: 'barkod_1', width: 12 },
        { header: 'Barkod 2', key: 'barkod_2', width: 12 },
        { header: 'Barkod 3', key: 'barkod_3', width: 12 },
        { header: 'Kod-3', key: 'kod_3', width: 10 },
        { header: 'Kod-4', key: 'kod_4', width: 10 },
        { header: 'Kod-5', key: 'kod_5', width: 10 },
        { header: 'Esnek Yapılandır', key: 'esnek_yapilandir', width: 18 },
        { header: 'Süper Reçete Kullanılsın', key: 'super_recete_kullanilsin', width: 22 },
        { header: 'Bağlı Stok Kodu', key: 'bagli_stok_kodu', width: 18 },
        { header: 'Yapılandırma Kodu', key: 'yapilandirma_kodu', width: 18 },
        { header: 'Yap. Açıklama', key: 'yap_aciklama', width: 15 },
        { header: 'Alış Döviz Tipi', key: 'alis_doviz_tipi', width: 15 },
        { header: 'Gümrük Tarife Kodu', key: 'gumruk_tarife_kodu', width: 18 },
        { header: 'Dağıtıcı Kodu', key: 'dagitici_kodu', width: 15 },
        { header: 'Menşei', key: 'mensei', width: 10 },
        { header: 'METARIAL', key: 'metarial', width: 12 },
        { header: 'DIA (MM)', key: 'dia_mm', width: 10 },
        { header: 'DIA TOL (MM) +', key: 'dia_tol_mm_plus', width: 15 },
        { header: 'DIA TOL (MM) -', key: 'dia_tol_mm_minus', width: 15 },
        { header: 'ZING COATING (GR/M2)', key: 'zing_coating', width: 20 },
        { header: 'TENSILE ST. (MPA) MIN', key: 'tensile_st_min', width: 20 },
        { header: 'TENSILE ST. (MPA) MAX', key: 'tensile_st_max', width: 20 },
        { header: 'WAX', key: 'wax', width: 10 },
        { header: 'LIFTING LUGS', key: 'lifting_lugs', width: 15 },
        { header: 'UNWINDING', key: 'unwinding', width: 15 },
        { header: 'CAST KONT. (CM)', key: 'cast_kont', width: 15 },
        { header: 'HELIX KONT. (CM)', key: 'helix_kont', width: 15 },
        { header: 'ELONGATION (%) MIN', key: 'elongation', width: 18 },
        { header: 'COIL DIMENSIONS (CM) ID', key: 'coil_dimensions_id', width: 22 },
        { header: 'COIL DIMENSIONS (CM) OD', key: 'coil_dimensions_od', width: 22 },
        { header: 'COIL WEIGHT (KG)', key: 'coil_weight', width: 18 },
        { header: 'COIL WEIGHT (KG) MIN', key: 'coil_weight_min', width: 20 },
        { header: 'COIL WEIGHT (KG) MAX', key: 'coil_weight_max', width: 20 }
      ];

      // MM GT satırını ekle
      mmGtSheet.addRow({
        stok_kodu: mmGtData.stockCode,
        stok_adi: mmGtData.description,
        grup_kodu: 'MAMUL',
        kod_1: 'GALV',
        kod_2: mmGtData.kod_2,
        br_1: 'KG',
        br_2: 'KG',
        pay_1: 1,
        payda_1: 1,
        cevrim_degeri_1: 1,
        cap: mmGtData.cap.toString().replace('.', ','),
        kaplama: mmGtData.kaplama,
        min_mukavemet: mmGtData.minMukavemet,
        max_mukavemet: mmGtData.maxMukavemet,
        kg: mmGtData.kg,
        ic_cap: mmGtData.icCap,
        dis_cap: mmGtData.disCap,
        shrink: mmGtData.shrink ? 'EVET' : 'HAYIR',
        tolerans_plus: mmGtData.toleransPlus.toString().replace('.', ','),
        tolerans_minus: mmGtData.toleransMinus.toString().replace('.', ','),
        metarial: 'STEEL',
        dia_mm: mmGtData.cap.toString().replace('.', ','),
        dia_tol_mm_plus: mmGtData.toleransPlus.toString().replace('.', ','),
        dia_tol_mm_minus: mmGtData.toleransMinus.toString().replace('.', ','),
        zing_coating: mmGtData.kaplama,
        tensile_st_min: mmGtData.minMukavemet,
        tensile_st_max: mmGtData.maxMukavemet,
        unwinding: mmGtData.unwinding ? 'EVET' : 'HAYIR',
        coil_dimensions_id: mmGtData.icCap,
        coil_dimensions_od: mmGtData.disCap,
        coil_weight: mmGtData.kg
      });

      // YM GT sayfasını ekle
      const ymGtSheet = workbook.addWorksheet('YM GT');

      // YM GT için aynı sütunları kullan
      ymGtSheet.columns = mmGtSheet.columns;

      // YM GT satırını ekle
      ymGtSheet.addRow({
        stok_kodu: ymGtData.stockCode,
        stok_adi: ymGtData.description,
        grup_kodu: 'YARIHA',
        kod_1: 'GALV',
        kod_2: ymGtData.kod_2,
        br_1: 'KG',
        br_2: 'KG',
        pay_1: 1,
        payda_1: 1,
        cevrim_degeri_1: 1,
        cap: ymGtData.cap.toString().replace('.', ','),
        kaplama: ymGtData.kaplama,
        min_mukavemet: ymGtData.minMukavemet,
        max_mukavemet: ymGtData.maxMukavemet,
        kg: ymGtData.kg,
        ic_cap: ymGtData.icCap,
        dis_cap: ymGtData.disCap,
        shrink: ymGtData.shrink ? 'EVET' : 'HAYIR',
        tolerans_plus: ymGtData.toleransPlus.toString().replace('.', ','),
        tolerans_minus: ymGtData.toleransMinus.toString().replace('.', ','),
        metarial: 'STEEL',
        dia_mm: ymGtData.cap.toString().replace('.', ','),
        dia_tol_mm_plus: ymGtData.toleransPlus.toString().replace('.', ','),
        dia_tol_mm_minus: ymGtData.toleransMinus.toString().replace('.', ','),
        zing_coating: ymGtData.kaplama,
        tensile_st_min: ymGtData.minMukavemet,
        tensile_st_max: ymGtData.maxMukavemet,
        unwinding: ymGtData.unwinding ? 'EVET' : 'HAYIR',
        coil_dimensions_id: ymGtData.icCap,
        coil_dimensions_od: ymGtData.disCap,
        coil_weight: ymGtData.kg
      });

      // Her YM ST için bir sayfa ekle
      selectedYmSt.forEach((ymSt, index) => {
        const ymStSheet = workbook.addWorksheet(`YM ST ${index + 1}`);

        // YM ST için aynı sütunları kullan
        ymStSheet.columns = mmGtSheet.columns;

        // YM ST satırını ekle
        ymStSheet.addRow({
          stok_kodu: ymSt.stockCode,
          stok_adi: ymSt.description,
          grup_kodu: 'YARIHA',
          kod_1: 'SIYAH',
          kod_2: ymSt.kod_2,
          br_1: 'KG',
          br_2: 'KG',
          pay_1: 1,
          payda_1: 1,
          cevrim_degeri_1: 1,
          cap: ymSt.cap.toString().replace('.', ','),
          kaplama: 0, // YM ST için kaplama değeri 0
          min_mukavemet: ymSt.minMukavemet,
          max_mukavemet: ymSt.maxMukavemet,
          kg: ymSt.kg,
          ic_cap: ymSt.icCap,
          dis_cap: ymSt.disCap,
          shrink: ymSt.shrink ? 'EVET' : 'HAYIR',
          tolerans_plus: ymSt.toleransPlus.toString().replace('.', ','),
          tolerans_minus: ymSt.toleransMinus.toString().replace('.', ','),
          metarial: 'STEEL',
          dia_mm: ymSt.cap.toString().replace('.', ','),
          dia_tol_mm_plus: ymSt.toleransPlus.toString().replace('.', ','),
          dia_tol_mm_minus: ymSt.toleransMinus.toString().replace('.', ','),
          tensile_st_min: ymSt.minMukavemet,
          tensile_st_max: ymSt.maxMukavemet,
          unwinding: ymSt.unwinding ? 'EVET' : 'HAYIR',
          coil_dimensions_id: ymSt.icCap,
          coil_dimensions_od: ymSt.disCap,
          coil_weight: ymSt.kg
        });
      });

      // Excel dosyasını indir
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const cap = mmGtData.cap.toString().replace('.', ','); // Virgül formatında çap
      saveAs(blob, `Galvanizli_Tel_Stok_Kartı_Ø${cap}_${mmGtData.kod_2}_${new Date().toLocaleDateString('tr-TR')}.xlsx`);

      setLoading(false);
      toast.success('Stok Kartı Excel dosyası oluşturuldu');
    } catch (error) {
      handleError(`Stok Kartı Excel oluşturma hatası: ${error.message}`, error);
    }
  };

  // Excel dosyası oluştur - orijinal formata uygun
  const createReceteExcel = async () => {
    try {
      if (!mmGtData || !ymGtData || selectedYmSt.length === 0) {
        toast.error('Excel dosyası oluşturmak için MM GT, YM GT ve YM ST verileri gerekli');
        return;
      }

      setLoading(true);

      // Reçete verilerini hazırla
      const receteData = createReceteData(mmGtData, ymGtData, selectedYmSt);
      setReceteData(receteData);

      // Yeni bir Excel çalışma kitabı oluştur
      const workbook = new ExcelJS.Workbook();

      // MM GT Sayfası
      const mmGtSheet = workbook.addWorksheet('MM GT REÇETE');

      // Başlık satırı
      mmGtSheet.addRow(['STOK KODU', 'STOK ADI', 'MİKTAR', 'BİRİM']);
      mmGtSheet.getRow(1).font = { bold: true };

      // MM GT bilgileri
      mmGtSheet.addRow([mmGtData.stockCode, mmGtData.description, '', '']);
      mmGtSheet.getRow(2).font = { bold: true };

      // Boş satır
      mmGtSheet.addRow([]);

      // MM GT reçete satırları - 8 satır için
      receteData.mmGtRecete.forEach(item => {
        mmGtSheet.addRow([item.stockCode, item.stockName, item.amount, item.unit]);
      });

      // YM GT Sayfası
      const ymGtSheet = workbook.addWorksheet('YM GT REÇETE');

      // Başlık satırı
      ymGtSheet.addRow(['STOK KODU', 'STOK ADI', 'MİKTAR', 'BİRİM']);
      ymGtSheet.getRow(1).font = { bold: true };

      // YM GT bilgileri
      ymGtSheet.addRow([ymGtData.stockCode, ymGtData.description, '', '']);
      ymGtSheet.getRow(2).font = { bold: true };

      // Boş satır
      ymGtSheet.addRow([]);

      // YM GT reçete satırları - 4 satır için
      receteData.ymGtRecete.forEach(item => {
        ymGtSheet.addRow([item.stockCode, item.stockName, item.amount, item.unit]);
      });

      // YM ST Sayfası
      selectedYmSt.forEach((ymSt, index) => {
        const ymStSheet = workbook.addWorksheet(`YM ST REÇETE ${index + 1}`);

        // Başlık satırı
        ymStSheet.addRow(['STOK KODU', 'STOK ADI', 'MİKTAR', 'BİRİM']);
        ymStSheet.getRow(1).font = { bold: true };

        // YM ST bilgileri
        ymStSheet.addRow([ymSt.stockCode, ymSt.description, '', '']);
        ymStSheet.getRow(2).font = { bold: true };

        // Boş satır
        ymStSheet.addRow([]);

        // YM ST reçete satırları - 2 satır için
        const ymStItems = receteData.ymStRecete[ymSt.id || 'temp'] || [];
        ymStItems.forEach(item => {
          ymStSheet.addRow([item.stockCode, item.stockName, item.amount, item.unit]);
        });
      });

      // Excel dosyasını indir
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `Galvanizli_Tel_Reçete_${mmGtData.cap}_${mmGtData.kod_2}_${new Date().toISOString().slice(0, 10)}.xlsx`);

      setLoading(false);
      toast.success('Excel dosyası oluşturuldu');
    } catch (error) {
      handleError(`Excel oluşturma hatası: ${error.message}`, error);
    }
  };

  // Tüm otomatik hesaplamaları yap
  const processAutomaticCalculations = async (values) => {
    try {
      // MM GT ve YM GT önizlemeleri oluştur
      const mmGtPreview = createMmGtPreview(values);
      setMmGtData(mmGtPreview);

      const ymGtPreview = createYmGtPreview(values, mmGtPreview);
      setYmGtData(ymGtPreview);

      // YM ST'leri otomatik seç
      const selectedItems = await autoSelectYmSt(values);

      if (selectedItems && selectedItems.length > 0) {
        setSelectedYmSt(selectedItems);
      } else {
        throw new Error('YM ST değerleri hesaplanamadı');
      }

      // Reçete verilerini oluştur
      const receteData = createReceteData(mmGtPreview, ymGtPreview, selectedItems);
      setReceteData(receteData);

      return true;
    } catch (error) {
      handleError(`Otomatik hesaplama hatası: ${error.message}`, error);
      return false;
    }
  };

  // Veritabanına kaydetme işlemi
  const handleSaveToDatabase = async () => {
    try {
      setLoading(true);
      
      if (!mmGtData || !ymGtData || selectedYmSt.length === 0 || !receteData) {
        throw new Error('Kaydedilecek veri eksik');
      }
      
      // Sıra numarası al
      const capValue = parseFloat(formValues.cap);
      const formattedCap = capValue.toFixed(2).replace('.', '').padStart(4, '0');
      
      const seqResponse = await fetchWithAuth(
        `${API_URLS.galSequence}/next?kod_2=${formValues.kod_2}&cap=${capValue}`
      );
      
      if (!seqResponse || !seqResponse.ok) {
        throw new Error(`Sıra numarası alınamadı: ${seqResponse?.status}`);
      }
      
      const seqData = await seqResponse.json();
      console.log("Sıra numarası:", seqData);
      
      // MM GT stok kodunu güncelle
      const formattedSeq = seqData.formatted_sequence;
      const mmGtStockCode = `GT.${formValues.kod_2}.${formattedCap}.${formattedSeq}`;
      
      // MM GT oluştur
      const mmGtPayload = {
        stok_kodu: mmGtStockCode,
        aciklama: mmGtData.description,
        cap: capValue,
        kod_2: formValues.kod_2,
        kaplama: formValues.kaplama,
        min_mukavemet: formValues.min_mukavemet,
        max_mukavemet: formValues.max_mukavemet,
        tolerans_plus: formValues.tolerans_plus,
        tolerans_minus: formValues.tolerans_minus,
        ic_cap: formValues.ic_cap,
        dis_cap: formValues.dis_cap,
        kg: formValues.kg,
        unwinding: formValues.unwinding,
        shrink: formValues.shrink
      };
      
      console.log("MM GT kaydediliyor:", mmGtPayload);
      const mmGtResponse = await fetchWithAuth(API_URLS.galMmGt, {
        method: 'POST',
        body: JSON.stringify(mmGtPayload)
      });
      
      if (!mmGtResponse || !mmGtResponse.ok) {
        throw new Error(`MM GT kaydedilemedi: ${mmGtResponse?.status}`);
      }
      
      const mmGtResult = await mmGtResponse.json();
      console.log("MM GT kaydedildi:", mmGtResult);
      
      // YM GT oluştur
      const ymGtStockCode = `YM.${formValues.kod_2}.${formattedCap}.01`;
      const ymGtPayload = {
        stok_kodu: ymGtStockCode,
        aciklama: ymGtData.description,
        mm_gt_id: mmGtResult.id,
        cap: capValue,
        kod_2: formValues.kod_2,
        kaplama: formValues.kaplama,
        min_mukavemet: formValues.min_mukavemet,
        max_mukavemet: formValues.max_mukavemet,
        tolerans_plus: formValues.tolerans_plus,
        tolerans_minus: formValues.tolerans_minus,
        ic_cap: formValues.ic_cap,
        dis_cap: formValues.dis_cap,
        kg: formValues.kg,
        unwinding: formValues.unwinding,
        shrink: formValues.shrink
      };
      
      console.log("YM GT kaydediliyor:", ymGtPayload);
      const ymGtResponse = await fetchWithAuth(API_URLS.galYmGt, {
        method: 'POST',
        body: JSON.stringify(ymGtPayload)
      });
      
      if (!ymGtResponse || !ymGtResponse.ok) {
        throw new Error(`YM GT kaydedilemedi: ${ymGtResponse?.status}`);
      }
      
      const ymGtResult = await ymGtResponse.json();
      console.log("YM GT kaydedildi:", ymGtResult);
      
      // YM ST'leri kaydet
      const ymStResults = [];
      for (const ymSt of selectedYmSt) {
        // Zaten veritabanında var mı kontrol et
        if (ymSt.id && ymSt.source === 'database') {
          console.log("YM ST zaten veritabanında var:", ymSt);
          ymStResults.push(ymSt);
          
          // MM GT - YM ST ilişkisini oluştur
          await fetchWithAuth(API_URLS.galMmGtYmSt, {
            method: 'POST',
            body: JSON.stringify({
              mm_gt_id: mmGtResult.id,
              ym_st_id: ymSt.id,
              sira: ymStResults.length
            })
          });
          
          continue;
        }
        
        // Yeni YM ST oluştur
        const ymStStockCode = `YM.ST.${formValues.kod_2}.${formattedCap}.${ymStResults.length + 1}`.padEnd(2, '0');
        const ymStPayload = {
          stok_kodu: ymStStockCode,
          aciklama: `YM.ST.${formValues.kod_2} Ø${formValues.cap.toFixed(2)} ${formValues.min_mukavemet}-${formValues.max_mukavemet}N/MM²`,
          cap: capValue,
          kod_2: formValues.kod_2,
          kaplama: 0, // YM ST için kaplama değeri 0
          min_mukavemet: formValues.min_mukavemet,
          max_mukavemet: formValues.max_mukavemet,
          tolerans_plus: formValues.tolerans_plus,
          tolerans_minus: formValues.tolerans_minus,
          ic_cap: formValues.ic_cap,
          dis_cap: formValues.dis_cap,
          kg: formValues.kg,
          unwinding: formValues.unwinding,
          shrink: formValues.shrink
        };
        
        console.log("YM ST kaydediliyor:", ymStPayload);
        const ymStResponse = await fetchWithAuth(API_URLS.galYmSt, {
          method: 'POST',
          body: JSON.stringify(ymStPayload)
        });
        
        if (!ymStResponse || !ymStResponse.ok) {
          throw new Error(`YM ST kaydedilemedi: ${ymStResponse?.status}`);
        }
        
        const ymStResult = await ymStResponse.json();
        console.log("YM ST kaydedildi:", ymStResult);
        ymStResults.push(ymStResult);
        
        // MM GT - YM ST ilişkisini oluştur
        await fetchWithAuth(API_URLS.galMmGtYmSt, {
          method: 'POST',
          body: JSON.stringify({
            mm_gt_id: mmGtResult.id,
            ym_st_id: ymStResult.id,
            sira: ymStResults.length
          })
        });
      }
      
      // Reçeteleri kaydet
      // MM GT Reçetesi
      for (const item of receteData.mmGtRecete) {
        const mmGtRecetePayload = {
          mm_gt_id: mmGtResult.id,
          stok_kodu: item.stockCode,
          stok_adi: item.stockName,
          miktar: item.amount,
          birim: item.unit,
          sira: item.sira
        };
        
        await fetchWithAuth(API_URLS.galMmGtRecete, {
          method: 'POST',
          body: JSON.stringify(mmGtRecetePayload)
        });
      }
      
      // YM GT Reçetesi
      for (const item of receteData.ymGtRecete) {
        const ymGtRecetePayload = {
          ym_gt_id: ymGtResult.id,
          stok_kodu: item.stockCode,
          stok_adi: item.stockName,
          miktar: item.amount,
          birim: item.unit,
          sira: item.sira
        };
        
        await fetchWithAuth(API_URLS.galYmGtRecete, {
          method: 'POST',
          body: JSON.stringify(ymGtRecetePayload)
        });
      }
      
      // Her bir YM ST için reçete kaydet
      for (let i = 0; i < ymStResults.length; i++) {
        const ymSt = ymStResults[i];
        const receteItems = receteData.ymStRecete[ymSt.id || 'temp'] || [];
        
        for (const item of receteItems) {
          const ymStRecetePayload = {
            ym_st_id: ymSt.id,
            stok_kodu: item.stockCode,
            stok_adi: item.stockName,
            miktar: item.amount,
            birim: item.unit,
            sira: item.sira
          };
          
          await fetchWithAuth(API_URLS.galYmStRecete, {
            method: 'POST',
            body: JSON.stringify(ymStRecetePayload)
          });
        }
      }
      
      setLoading(false);
      toast.success('Veriler başarıyla kaydedildi');
      
      // Formu sıfırla
      clearForm();
      return true;
    } catch (error) {
      handleError(`Veritabanına kaydetme hatası: ${error.message}`, error);
      return false;
    }
  };
  
  // Formu temizle
  const clearForm = () => {
    setFormValues({
      cap: '',
      kod_2: 'NIT',
      kaplama: '',
      min_mukavemet: '',
      max_mukavemet: '',
      tolerans_plus: '',
      tolerans_minus: '',
      ic_cap: '',
      dis_cap: '',
      kg: '',
      unwinding: false,
      shrink: false
    });
    
    setMmGtData(null);
    setYmGtData(null);
    setSelectedYmSt([]);
    setReceteData(null);
    setIsEditMode(false);
    setDataExist(false);
    setError(null);
  };
  
  // "Otomatik Hesapla" butonu için işleyici
  const handleAutoCalculateYmSt = async () => {
    try {
      if (!formValues || !formValues.cap || !formValues.kod_2) {
        toast.error('Hesaplama için çap ve kod_2 değerleri gerekli');
        return;
      }
      
      setLoading(true);
      
      // YM ST'leri otomatik seç
      const selectedItems = await autoSelectYmSt(formValues);
      
      if (selectedItems && selectedItems.length > 0) {
        // Seçilen YM ST'lerin kaynağını belirt
        const itemsWithSource = selectedItems.map(item => ({
          ...item,
          source: item.source || 'auto-generated',
          sourceLabel: item.sourceLabel || 'Otomatik oluşturuldu'
        }));
        
        setSelectedYmSt(itemsWithSource);
        toast.success('YM ST değerleri otomatik olarak hesaplandı');
      } else {
        toast.error('YM ST değerleri hesaplanamadı');
      }
      
      setLoading(false);
    } catch (error) {
      handleError(`YM ST hesaplama hatası: ${error.message}`, error);
    }
  };
  
  // Form değişikliklerini işle
  const handleFormChange = (field, value) => {
    // Sayısal değerlerde virgülü noktaya çevir
    if (['cap', 'kaplama', 'min_mukavemet', 'max_mukavemet', 'tolerans_plus', 'tolerans_minus', 'ic_cap', 'dis_cap', 'kg'].includes(field)) {
      value = normalizeInputValue(value);
    }
    
    setFormValues(prev => ({
      ...prev,
      [field]: value
    }));
    
    // İhtiyaç duyulan hesaplamaları yap
    if (field === 'cap' || field === 'kod_2') {
      // Çap değişince MM GT önizlemesini güncelle
      const updatedValues = {
        ...formValues,
        [field]: value
      };
      
      const preview = createMmGtPreview(updatedValues);
      setMmGtData(preview);
      
      // YM GT önizlemesini de güncelle
      const ymGtPreview = createYmGtPreview(updatedValues, preview);
      setYmGtData(ymGtPreview);
    }
  };
  
  // Talepler için görüntüleme işleyicisi
  const handleViewTalepDetails = async (talepId) => {
    setSelectedTalepId(talepId);
    
    try {
      const talepData = await fetchTalepDetails(talepId);
      
      if (talepData) {
        setSelectedTalep(talepData);
        setShowTalepDetailModal(true);
      }
    } catch (error) {
      handleError(`Talep detayları yüklenirken hata oluştu: ${error.message}`, error);
    }
  };
  
  // Talep onaylama işleyicisi
  const handleApproveTalep = async () => {
    if (!selectedTalepId) {
      toast.error('İşlenecek talep seçilmedi');
      return;
    }
    
    try {
      const success = await approveTalep(selectedTalepId);
      
      if (success) {
        setShowTalepDetailModal(false);
        setSelectedTalep(null);
        setSelectedTalepId(null);
      }
    } catch (error) {
      handleError(`Talep onaylanırken hata oluştu: ${error.message}`, error);
    }
  };
  
  // Talep reddetme modalını göster
  const handleShowRejectModal = () => {
    if (!selectedTalepId) {
      toast.error('İşlenecek talep seçilmedi');
      return;
    }
    
    setShowRejectModal(true);
  };
  
  // Talep reddetme işleyicisi
  const handleRejectTalep = async () => {
    if (!selectedTalepId) {
      toast.error('İşlenecek talep seçilmedi');
      return;
    }
    
    if (!rejectionReason) {
      toast.error('Reddetme sebebi belirtmelisiniz');
      return;
    }
    
    try {
      const success = await rejectTalep(selectedTalepId, rejectionReason);
      
      if (success) {
        setShowRejectModal(false);
        setShowTalepDetailModal(false);
        setSelectedTalep(null);
        setSelectedTalepId(null);
        setRejectionReason('');
      }
    } catch (error) {
      handleError(`Talep reddedilirken hata oluştu: ${error.message}`, error);
    }
  };
  
  // Talep filtrelerini değiştirme işleyicisi
  const handleTalepFilterChange = (field, value) => {
    setTalepFilter(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Filtrelenmiş talep öğeleri
  useEffect(() => {
    if (talepList.length > 0) {
      filterTalepItems();
    }
  }, [talepList, talepFilter]);
  
  // Talep öğelerini filtrele
  const filterTalepItems = () => {
    const { status, search } = talepFilter;
    const searchTerm = search.toLowerCase();
    
    const filteredData = talepList.filter(item =>
      (status === 'all' || item.status === status) &&
      (!searchTerm ||
        (item.cap && item.cap.toString().includes(searchTerm)) ||
        (item.kod_2 && item.kod_2.toLowerCase().includes(searchTerm)))
    );
    
    setFilteredTalepItems(filteredData);
  };
  
  // Bileşen yüklendiğinde talepleri getir
  useEffect(() => {
    fetchTalepList();
  }, [fetchTalepList]);
  
  // Seçilen kayıt için düzenleme moduna geç
  const handleEditItem = async (item) => {
    try {
      setIsEditMode(true);
      setDataExist(true);
      
      // MM GT verilerini yükle
      const mmGtValues = {
        cap: parseFloat(item.cap) || 0,
        kod_2: item.kod_2 || '',
        kaplama: parseInt(item.kaplama) || 0,
        min_mukavemet: parseInt(item.min_mukavemet) || 0,
        max_mukavemet: parseInt(item.max_mukavemet) || 0,
        tolerans_plus: parseFloat(item.tolerans_plus) || 0,
        tolerans_minus: parseFloat(item.tolerans_minus) || 0,
        ic_cap: parseInt(item.ic_cap) || 0,
        dis_cap: parseInt(item.dis_cap) || 0,
        kg: parseInt(item.kg) || 0,
        unwinding: item.unwinding || false,
        shrink: item.shrink || false
      };
      
      setFormValues(mmGtValues);
      
      // MM GT verilerini ayarla
      const mmGtData = {
        id: item.id,
        stockCode: item.stok_kodu,
        description: item.aciklama,
        cap: parseFloat(item.cap) || 0,
        kod_2: item.kod_2 || '',
        kaplama: parseInt(item.kaplama) || 0,
        minMukavemet: parseInt(item.min_mukavemet) || 0,
        maxMukavemet: parseInt(item.max_mukavemet) || 0,
        toleransPlus: parseFloat(item.tolerans_plus) || 0,
        toleransMinus: parseFloat(item.tolerans_minus) || 0,
        icCap: parseInt(item.ic_cap) || 0,
        disCap: parseInt(item.dis_cap) || 0,
        kg: parseInt(item.kg) || 0,
        unwinding: item.unwinding || false,
        shrink: item.shrink || false
      };
      
      setMmGtData(mmGtData);
      
      // İlişkili YM GT verilerini yükle
      const ymGtResponse = await fetchWithAuth(`${API_URLS.galYmGt}?mm_gt_id=${item.id}`);
      
      if (ymGtResponse && ymGtResponse.ok) {
        const ymGtData = await ymGtResponse.json();
        
        if (ymGtData.length > 0) {
          const ymGt = ymGtData[0];
          
          setYmGtData({
            id: ymGt.id,
            stockCode: ymGt.stok_kodu,
            description: ymGt.aciklama,
            mmGtId: ymGt.mm_gt_id,
            cap: parseFloat(ymGt.cap) || 0,
            kod_2: ymGt.kod_2 || '',
            kaplama: parseInt(ymGt.kaplama) || 0,
            minMukavemet: parseInt(ymGt.min_mukavemet) || 0,
            maxMukavemet: parseInt(ymGt.max_mukavemet) || 0,
            toleransPlus: parseFloat(ymGt.tolerans_plus) || 0,
            toleransMinus: parseFloat(ymGt.tolerans_minus) || 0,
            icCap: parseInt(ymGt.ic_cap) || 0,
            disCap: parseInt(ymGt.dis_cap) || 0,
            kg: parseInt(ymGt.kg) || 0,
            unwinding: ymGt.unwinding || false,
            shrink: ymGt.shrink || false
          });
          
          // İlişkili YM GT reçetelerini yükle
          const ymGtReceteResponse = await fetchWithAuth(`${API_URLS.galYmGtRecete}?ym_gt_id=${ymGt.id}`);
          
          if (ymGtReceteResponse && ymGtReceteResponse.ok) {
            const ymGtReceteData = await ymGtReceteResponse.json();
            
            // Bu aşamada reçete verilerini setReceteData ile ayarlayabilirsiniz
          }
        }
      }
      
      // İlişkili MM GT-YM ST ilişkilerini yükle
      const mmGtYmStResponse = await fetchWithAuth(`${API_URLS.galMmGtYmSt}?mm_gt_id=${item.id}`);
      
      if (mmGtYmStResponse && mmGtYmStResponse.ok) {
        const mmGtYmStData = await mmGtYmStResponse.json();
        
        if (mmGtYmStData.length > 0) {
          // İlişkili YM ST'leri yükle
          const ymStIds = mmGtYmStData.map(relation => relation.ym_st_id);
          
          const ymStIdsParam = ymStIds.join(',');
          const ymStResponse = await fetchWithAuth(`${API_URLS.galYmSt}?ids=${ymStIdsParam}`);
          
          if (ymStResponse && ymStResponse.ok) {
            const ymStData = await ymStResponse.json();
            
            // YM ST'leri formatlayıp set et
            const formattedYmSts = ymStData.map(ymSt => ({
              id: ymSt.id,
              stockCode: ymSt.stok_kodu,
              description: ymSt.aciklama,
              cap: parseFloat(ymSt.cap) || 0,
              kod_2: ymSt.kod_2 || '',
              kaplama: parseInt(ymSt.kaplama) || 0,
              minMukavemet: parseInt(ymSt.min_mukavemet) || 0,
              maxMukavemet: parseInt(ymSt.max_mukavemet) || 0,
              toleransPlus: parseFloat(ymSt.tolerans_plus) || 0,
              toleransMinus: parseFloat(ymSt.tolerans_minus) || 0,
              icCap: parseInt(ymSt.ic_cap) || 0,
              disCap: parseInt(ymSt.dis_cap) || 0,
              kg: parseInt(ymSt.kg) || 0,
              unwinding: ymSt.unwinding || false,
              shrink: ymSt.shrink || false,
              source: 'database',
              sourceLabel: 'Veritabanından'
            }));
            
            setSelectedYmSt(formattedYmSts);
          }
        }
      }
      
      // Düzenleme moduna geç ve ana sekmeye dön
      setActiveTab('main');
    } catch (error) {
      handleError(`Kayıt yüklenirken hata oluştu: ${error.message}`, error);
    }
  };
  
  // Yeni talep oluştur
  const handleCreateTalep = async () => {
    try {
      if (!mmGtData) {
        toast.error('Talep oluşturmak için önce hesaplama yapmalısınız');
        return;
      }
      
      setLoading(true);
      
      // Talep verisi oluştur
      const talepData = {
        title: `Galvanizli Tel Talebi: ${formValues.kod_2} Ø${formValues.cap}`,
        description: `${formValues.kod_2} Ø${formValues.cap} ${formValues.kaplama}GR/M² ${formValues.min_mukavemet}-${formValues.max_mukavemet}N/MM² Tel Talebi`,
        created_by: user?.id || 'system',
        status: 'pending',
        data: {
          cap: formValues.cap,
          kod_2: formValues.kod_2,
          kaplama: formValues.kaplama,
          min_mukavemet: formValues.min_mukavemet,
          max_mukavemet: formValues.max_mukavemet,
          tolerans_plus: formValues.tolerans_plus,
          tolerans_minus: formValues.tolerans_minus,
          ic_cap: formValues.ic_cap,
          dis_cap: formValues.dis_cap,
          kg: formValues.kg,
          unwinding: formValues.unwinding,
          shrink: formValues.shrink
        }
      };
      
      // Talebi gönder
      const response = await fetchWithAuth(API_URLS.galSalRequests, {
        method: 'POST',
        body: JSON.stringify(talepData)
      });
      
      if (!response || !response.ok) {
        throw new Error(`Talep oluşturulamadı: ${response?.status}`);
      }
      
      const result = await response.json();
      console.log("Talep oluşturuldu:", result);
      
      setLoading(false);
      toast.success('Talep başarıyla oluşturuldu');
      
      // Talep listesini güncelle ve talepler sekmesine geç
      await fetchTalepList();
      setActiveTab('talepler');
    } catch (error) {
      handleError(`Talep oluşturma hatası: ${error.message}`, error);
    }
  };
  
  // "Kaydet ve Excel Oluştur" butonu için işleyici
  const handleSaveAndCreateExcel = async () => {
    try {
      // Önce veritabanına kaydet
      const saveSuccess = await handleSaveToDatabase();

      if (saveSuccess) {
        // Sonra Excel'leri oluştur
        await createReceteExcel();
        await createStokKartiExcel();
      }
    } catch (error) {
      handleError(`Kaydetme ve Excel oluşturma hatası: ${error.message}`, error);
    }
  };
  
  // MM GT, YM GT ve YM ST'leri otomatik hesapla
  const handleCalculateAll = async () => {
    try {
      if (!formValues || !formValues.cap || !formValues.kod_2) {
        toast.error('Hesaplama için çap ve kod_2 değerleri gerekli');
        return;
      }
      
      setLoading(true);
      
      // Tüm hesaplamaları yap
      await processAutomaticCalculations(formValues);
      
      setLoading(false);
      toast.success('Tüm değerler başarıyla hesaplandı');
    } catch (error) {
      handleError(`Hesaplama hatası: ${error.message}`, error);
    }
  };
  
  // UI Render
  return (
    <div className="container mx-auto p-4 max-w-6xl">
      {/* Error and Success messages */}
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

      {/* Main title bar with tabs */}
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
                          className={`w-full p-2 border rounded-md ${
                            errors.cap && touched.cap ? 'border-red-500' : 'border-gray-300'
                          }`}
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
                          className={`w-full p-2 border rounded-md ${
                            errors.kod_2 && touched.kod_2 ? 'border-red-500' : 'border-gray-300'
                          }`}
                        >
                          <option value="">Seçiniz</option>
                          <option value="NIT">NIT (Normal İnce Tel)</option>
                          <option value="PAD">PAD (Paketleme Demirli)</option>
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
                          className={`w-full p-2 border rounded-md ${
                            errors.kaplama && touched.kaplama ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                        <ErrorMessage name="kaplama" component="div" className="text-red-500 text-sm mt-1" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Min Mukavemet (N/mm²)
                        </label>
                        <Field
                          type="text"
                          name="min_mukavemet"
                          className={`w-full p-2 border rounded-md ${
                            errors.min_mukavemet && touched.min_mukavemet ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                        <ErrorMessage name="min_mukavemet" component="div" className="text-red-500 text-sm mt-1" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Max Mukavemet (N/mm²)
                        </label>
                        <Field
                          type="text"
                          name="max_mukavemet"
                          className={`w-full p-2 border rounded-md ${
                            errors.max_mukavemet && touched.max_mukavemet ? 'border-red-500' : 'border-gray-300'
                          }`}
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
                          className={`w-full p-2 border rounded-md ${
                            errors.tolerans_plus && touched.tolerans_plus ? 'border-red-500' : 'border-gray-300'
                          }`}
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
                          className={`w-full p-2 border rounded-md ${
                            errors.tolerans_minus && touched.tolerans_minus ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                        <ErrorMessage name="tolerans_minus" component="div" className="text-red-500 text-sm mt-1" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          İç Çap (cm)
                        </label>
                        <Field
                          as="select"
                          name="ic_cap"
                          className={`w-full p-2 border rounded-md ${
                            errors.ic_cap && touched.ic_cap ? 'border-red-500' : 'border-gray-300'
                          }`}
                        >
                          <option value="">Seçiniz</option>
                          <option value="45">45</option>
                          <option value="50">50</option>
                          <option value="55">55</option>
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
                          className={`w-full p-2 border rounded-md ${
                            errors.dis_cap && touched.dis_cap ? 'border-red-500' : 'border-gray-300'
                          }`}
                          readOnly
                        />
                        <ErrorMessage name="dis_cap" component="div" className="text-red-500 text-sm mt-1" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Ağırlık (kg)
                        </label>
                        <Field
                          type="text"
                          name="kg"
                          className={`w-full p-2 border rounded-md ${
                            errors.kg && touched.kg ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                        <ErrorMessage name="kg" component="div" className="text-red-500 text-sm mt-1" />
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 mt-4">
                      <Field
                        type="checkbox"
                        name="unwinding"
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label className="text-sm font-medium text-gray-700">
                        Unwinding
                      </label>
                    </div>

                    <div className="flex justify-end space-x-2 mt-6">
                      <button
                        type="button"
                        onClick={handleAutoCalculateAllRecete}
                        className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 flex items-center space-x-1"
                      >
                        <Calculator className="h-4 w-4" />
                        <span>Otomatik Hesapla</span>
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        {isSubmitting ? (
                          <div className="flex items-center">
                            <Loader2 className="animate-spin h-4 w-4 mr-2" />
                            <span>İşleniyor...</span>
                          </div>
                        ) : (
                          <span>İleri</span>
                        )}
                      </button>
                    </div>
                  </Form>
                )}
              </Formik>
            </div>
          )}

          {currentStep === 'summary' && (
            <div className="bg-white p-6 rounded-md shadow-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Ürün Özeti</h3>
                <div className="space-x-2">
                  <button
                    onClick={handleNewProduct}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                  >
                    Yeni Ürün
                  </button>
                  <button
                    onClick={() => setCurrentStep('form')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Düzenle
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Sol kolon - Ürün bilgileri */}
                <div className="space-y-6">
                  <div className="bg-gray-50 p-4 rounded-md">
                    <h4 className="font-semibold mb-2">MM GT Bilgileri</h4>
                    <div className="space-y-2">
                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Stok Kodu:</span>
                        <span>{mmGtData?.stockCode}</span>
                      </div>
                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Açıklama:</span>
                        <span>{mmGtData?.description}</span>
                      </div>
                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Çap:</span>
                        <span>{mmGtData?.cap} mm</span>
                      </div>
                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Kaplama Türü:</span>
                        <span>{mmGtData?.kod_2}</span>
                      </div>
                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Kaplama Miktarı:</span>
                        <span>{mmGtData?.kaplama} gr/m²</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-md">
                    <h4 className="font-semibold mb-2">YM GT Bilgileri</h4>
                    <div className="space-y-2">
                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Stok Kodu:</span>
                        <span>{ymGtData?.stockCode}</span>
                      </div>
                      <div className="grid grid-cols-2">
                        <span className="text-gray-600">Açıklama:</span>
                        <span>{ymGtData?.description}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-md">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-semibold">YM ST Bilgileri</h4>
                      <div className="space-x-2">
                        <button
                          onClick={() => setShowYmStSearchModal(true)}
                          className="px-2 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                          YM ST Seç
                        </button>
                        <button
                          onClick={() => setShowYmStCreateModal(true)}
                          className="px-2 py-1 text-xs bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                        >
                          Yeni YM ST
                        </button>
                      </div>
                    </div>

                    {selectedYmSt.length > 0 ? (
                      <div className="space-y-3">
                        {selectedYmSt.map((ymSt, index) => (
                          <div key={ymSt.id || `temp-${index}`} className="bg-white p-3 rounded-md border border-gray-200 relative">
                            <div className="absolute top-2 right-2">
                              <YmStStatusIndicator ymSt={ymSt} />
                            </div>
                            <div className="space-y-1 pr-28">
                              <div className="font-medium">{ymSt.stockCode || ymSt.stok_kodu}</div>
                              <div className="text-sm text-gray-500">{ymSt.description || ymSt.stok_adi}</div>
                              <div className="text-sm">Çap: {ymSt.cap} mm</div>
                              {(ymSt.filmasin && ymSt.quality) && (
                                <div className="text-sm">Filmaşin: {ymSt.filmasin} / {ymSt.quality}</div>
                              )}
                            </div>

                            <button
                              onClick={() => handleRemoveYmSt(ymSt.id || `temp-${index}`)}
                              className="absolute bottom-2 right-2 text-red-500 hover:text-red-700"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center p-4 text-gray-500">
                        Henüz seçili YM ST yok. Lütfen "YM ST Seç" butonunu kullanarak seçim yapın.
                      </div>
                    )}
                  </div>
                </div>

                {/* Sağ kolon - Reçete ve işlemler */}
                <div className="space-y-6">
                  <div className="bg-gray-50 p-4 rounded-md">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-semibold">Reçete Bilgileri</h4>
                      <button
                        onClick={handleAutoCalculateAllRecete}
                        className="px-2 py-1 text-xs bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors flex items-center space-x-1"
                      >
                        <Calculator className="h-3 w-3" />
                        <span>Otomatik Hesapla</span>
                      </button>
                    </div>

                    {receteGosterimValues ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-white p-2 rounded-md border border-gray-200">
                            <div className="text-xs text-gray-500">Boraks</div>
                            <div className="font-medium">{receteGosterimValues.cinko.deger}</div>
                            <div className="text-xs text-gray-500">{receteGosterimValues.cinko.kod}</div>
                          </div>
                          <div className="bg-white p-2 rounded-md border border-gray-200">
                            <div className="text-xs text-gray-500">Asit</div>
                            <div className="font-medium">{receteGosterimValues.asit.deger}</div>
                            <div className="text-xs text-gray-500">{receteGosterimValues.asit.kod}</div>
                          </div>
                          <div className="bg-white p-2 rounded-md border border-gray-200">
                            <div className="text-xs text-gray-500">Desi</div>
                            <div className="font-medium">{receteGosterimValues.silkajel.deger}</div>
                            <div className="text-xs text-gray-500">{receteGosterimValues.silkajel.kod}</div>
                          </div>
                          <div className="bg-white p-2 rounded-md border border-gray-200">
                            <div className="text-xs text-gray-500">Tel Çekme</div>
                            <div className="font-medium">{receteGosterimValues.tel_cekme.deger} {receteGosterimValues.tel_cekme.birim}</div>
                            <div className="text-xs text-gray-500">{receteGosterimValues.tel_cekme.kod}</div>
                          </div>
                          <div className="bg-white p-2 rounded-md border border-gray-200">
                            <div className="text-xs text-gray-500">Galvanizleme</div>
                            <div className="font-medium">{receteGosterimValues.galvanizleme.deger} {receteGosterimValues.galvanizleme.birim}</div>
                            <div className="text-xs text-gray-500">{receteGosterimValues.galvanizleme.kod}</div>
                          </div>
                          <div className="bg-white p-2 rounded-md border border-gray-200">
                            <div className="text-xs text-gray-500">Paketleme</div>
                            <div className="font-medium">{receteGosterimValues.paketleme.deger} {receteGosterimValues.paketleme.birim}</div>
                            <div className="text-xs text-gray-500">{receteGosterimValues.paketleme.kod}</div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center p-4 text-gray-500">
                        Reçete verisi mevcut değil. "Otomatik Hesapla" butonuna tıklayarak hesaplayabilirsiniz.
                      </div>
                    )}
                  </div>

                  <div className="bg-gray-50 p-4 rounded-md">
                    <h4 className="font-semibold mb-4">İşlemler</h4>
                    <div className="space-y-2">
                      <button
                        onClick={() => handleSaveToDatabase()}
                        disabled={loading || !mmGtData || !ymGtData || selectedYmSt.length === 0}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center space-x-1"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="animate-spin h-4 w-4 mr-2" />
                            <span>Kaydediliyor...</span>
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            <span>Veritabanına Kaydet</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => {
                          createStokKartiExcel();
                          createReceteExcel();
                        }}
                        disabled={loading || !mmGtData || !ymGtData || selectedYmSt.length === 0}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center space-x-1"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="animate-spin h-4 w-4 mr-2" />
                            <span>Oluşturuluyor...</span>
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4" />
                            <span>Kaydet ve Excel Oluştur</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={createStokKartiExcel}
                        disabled={loading || !mmGtData || !ymGtData || selectedYmSt.length === 0}
                        className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center space-x-1"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="animate-spin h-4 w-4 mr-2" />
                            <span>Oluşturuluyor...</span>
                          </>
                        ) : (
                          <>
                            <FileText className="h-4 w-4" />
                            <span>Stok Kartı Excel</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Talepler Sekmesi */}
          {activePage === 'talepler' && (
            <div className="bg-white p-6 rounded-md shadow-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Galvanizli Tel Talepleri</h3>
                <div className="flex space-x-2">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Ara..."
                      value={talepFilter.search}
                      onChange={(e) => {
                        setTalepFilter(prev => ({ ...prev, search: e.target.value }));
                      }}
                      className="p-2 pr-8 border border-gray-300 rounded-md w-48"
                    />
                    <Search className="h-4 w-4 absolute top-3 right-2 text-gray-400" />
                  </div>
                  <select
                    value={talepFilter.status}
                    onChange={(e) => {
                      setTalepFilter(prev => ({ ...prev, status: e.target.value }));
                    }}
                    className="p-2 border border-gray-300 rounded-md"
                  >
                    <option value="all">Tümü</option>
                    <option value="pending">Bekleyenler</option>
                    <option value="approved">Onaylananlar</option>
                    <option value="rejected">Reddedilenler</option>
                  </select>
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="flex flex-col items-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-2" />
                    <span className="text-gray-600">Talepler yükleniyor...</span>
                  </div>
                </div>
              ) : (
                <div className="border rounded-md overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Çap
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Kod
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
                          Tarih
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          İşlemler
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredTalepItems.length > 0 ? (
                        filteredTalepItems.map(talep => {
                          // Eğer data property varsa kullan, yoksa doğrudan kullan
                          const cap = talep.data?.cap || talep.cap;
                          const kod_2 = talep.data?.kod_2 || talep.kod_2;
                          const kaplama = talep.data?.kaplama || talep.kaplama;
                          const min_mukavemet = talep.data?.min_mukavemet || talep.min_mukavemet;
                          const max_mukavemet = talep.data?.max_mukavemet || talep.max_mukavemet;

                          return (
                            <tr key={talep.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {cap} mm
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {kod_2}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {kaplama} gr/m²
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {min_mukavemet}-{max_mukavemet}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  talep.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  talep.status === 'approved' ? 'bg-green-100 text-green-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {talep.status === 'pending' ? 'Bekliyor' :
                                   talep.status === 'approved' ? 'Onaylandı' :
                                   'Reddedildi'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(talep.created_at).toLocaleDateString('tr-TR')}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                <button
                                  onClick={() => {
                                    setSelectedTalepId(talep.id);
                                    setSelectedTalep(talep);
                                    setShowTalepDetailModal(true);
                                  }}
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  Detay
                                </button>
                                {talep.status === 'pending' && (
                                  <>
                                    <button
                                      onClick={() => approveTalep(talep.id)}
                                      className="text-green-600 hover:text-green-900"
                                    >
                                      Onayla
                                    </button>
                                    <button
                                      onClick={() => {
                                        setSelectedTalepId(talep.id);
                                        setShowRejectModal(true);
                                      }}
                                      className="text-red-600 hover:text-red-900"
                                    >
                                      Reddet
                                    </button>
                                  </>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="7" className="px-6 py-10 text-center text-gray-500">
                            Talep bulunamadı
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default GalvanizliTelManager;
