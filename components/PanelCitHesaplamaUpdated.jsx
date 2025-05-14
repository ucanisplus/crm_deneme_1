// PanelCitHesaplama.jsx

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import ClientAuthCheck from '@/components/ClientAuthCheck';
import { API_URLS } from '../api-config';
import { debugApiCalls, directlySubmitPanel } from '../debug-network';
import { postData, putData } from '../lib/api-helpers';
import { getSafeTimestamp, processTimestampFields } from '../lib/date-utils';
import { debugProfilValues } from './debug-profil';
import { fixTimestamps, fixProfilData, applyGlobalTimestampFix } from '../lib/timestamp-fix';
import ProfilHesaplama from './ProfilHesaplama';
import GalvanizliSecimPopup from './GalvanizliSecimPopup';

// Install network debugging and timestamp fixes
if (typeof window !== 'undefined') {
  debugApiCalls();
  applyGlobalTimestampFix(); // Apply global timestamp fix
}
import {
  Calculator,
  Filter,
  FileSpreadsheet,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Edit,
  Search,
  Sparkles,
  DollarSign,
  Euro,
  TrendingUp
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

// Palet ağırlıkları için referans tabloları ve diğer yardımcı fonksiyonlar...

// Ana PanelCitHesaplama bileşeni
const PanelCitHesaplama = () => {
  // State tanımlamaları
  const [satisListesi, setSatisListesi] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sectionLoading, setSectionLoading] = useState({
    genel: false,
    panelCit: false,
    profil: false,
    panelList: false
  });
  const [calculating, setCalculating] = useState(false);
  const [activeTab, setActiveTab] = useState('main-panel');
  const [genelDegiskenler, setGenelDegiskenler] = useState({});
  const [panelCitDegiskenler, setPanelCitDegiskenler] = useState({});
  const [profilDegiskenler, setProfilDegiskenler] = useState({});
  const [panelList, setPanelList] = useState([]);
  const [filteredPanelList, setFilteredPanelList] = useState([]);
  const [maliyetListesi, setMaliyetListesi] = useState([]);
  const [geciciHesaplar, setGeciciHesaplar] = useState([]);
  const [ozelPanelList, setOzelPanelList] = useState([]);
  const [selectedPanelType, setSelectedPanelType] = useState('all');
  const [showResults, setShowResults] = useState(false);
  const [showSalesView, setShowSalesView] = useState(false);
  const [panelSearch, setPanelSearch] = useState('');
  const [columnFilters, setColumnFilters] = useState({});
  const [resultFilter, setResultFilter] = useState({
    currency: 'all',
    unit: 'all',
    type: 'all'
  });
  const [salesFilter, setSalesFilter] = useState({
    currency: 'USD',
    unit: 'all'
  });
  const [salesMargins, setSalesMargins] = useState({
    bronze: 10,
    silver: 20,
    gold: 30
  });
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: 'ascending'
  });
  const [showGalvanizliPopup, setShowGalvanizliPopup] = useState(false);
  const [popupAction, setPopupAction] = useState(null);
  const [galvanizliSecimi, setGalvanizliSecimi] = useState(true);

  // Debounce için zamanlayıcı
  const [debounceTimer, setDebounceTimer] = useState(null);

  // Sayfa yüklendiğinde verileri çek
  useEffect(() => {
    fetchInitialData();
  }, []);

  // Diğer useEffect ve fonksiyonlar...

  // Galvanizli/Galvanizsiz seçimi için popup işlevi
  const handleHesaplaClick = (action) => {
    setPopupAction(action);
    setShowGalvanizliPopup(true);
  };

  // Popup'tan gelen seçimi işleme
  const handleGalvanizliSecim = (isGalvanizli) => {
    setGalvanizliSecimi(isGalvanizli);
    setShowGalvanizliPopup(false);
    
    // Seçime göre işlemi yap
    if (popupAction === 'main-panel') {
      calculateCosts(true); // Ana panel hesaplama
    } else if (popupAction === 'special-panel') {
      calculateCosts(false); // Özel panel hesaplama
    }
  };

  // Maliyet hesaplama fonksiyonu...
  const calculateCosts = async (isPanelList = true) => {
    // Mevcut kod...
    
    // Hesaplamaları client-side olarak yap
    const results = performClientSideCalculations(panelsToCalculate, galvanizliSecimi);
    
    // Geri kalan kod...
  };

  // Client-side hesaplamalar - galvanizli seçimi parametresi eklenmiş
  const performClientSideCalculations = (panelsToCalculate, isGalvanizli = true) => {
    // Diğer değişkenler ve hesaplamalar...
    
    // Galvanizli tel kullanımını seçime göre belirle
    const galvanizliTelFiyat = safeParseFloat(panelCitDegiskenler.galvanizli_tel_ton_usd);
    const galvanizsizTelFiyat = safeParseFloat(profilDegiskenler.galvanizsiz_profil_kg_usd);
    const galvanizliTel = isGalvanizli ? galvanizliTelFiyat : galvanizsizTelFiyat;
    
    // Diğer hesaplamalar...
  };

  // Sekme butonlarını render eden fonksiyon - YENİ SEKME EKLENDİ
  const renderTabButtons = () => (
    <div className="flex flex-wrap gap-2 mb-4">
      <button
        onClick={() => setActiveTab('main-panel')}
        className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors duration-200 ${activeTab === 'main-panel'
          ? 'bg-red-600 text-white'
          : 'bg-gray-800 text-gray-300 hover:bg-red-500 hover:text-white'
        }`}
      >
        Ana Panel Listesi
      </button>
      <button
        onClick={() => setActiveTab('special-panel')}
        className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors duration-200 ${activeTab === 'special-panel'
          ? 'bg-red-600 text-white'
          : 'bg-gray-800 text-gray-300 hover:bg-red-500 hover:text-white'
        }`}
      >
        Özel Panel Girişi
      </button>
      <button
        onClick={() => setActiveTab('profil-hesaplama')}
        className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors duration-200 ${activeTab === 'profil-hesaplama'
          ? 'bg-red-600 text-white'
          : 'bg-gray-800 text-gray-300 hover:bg-red-500 hover:text-white'
        }`}
      >
        Profil Hesaplama
      </button>
      <button
        onClick={() => setActiveTab('results')}
        className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors duration-200 ${activeTab === 'results'
          ? 'bg-red-600 text-white'
          : 'bg-gray-800 text-gray-300 hover:bg-red-500 hover:text-white'
        }`}
      >
        Hesap Sonuçları
      </button>
      <button
        onClick={() => setActiveTab('temp-calculations')}
        className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors duration-200 ${activeTab === 'temp-calculations'
          ? 'bg-red-600 text-white'
          : 'bg-gray-800 text-gray-300 hover:bg-red-500 hover:text-white'
        }`}
      >
        Geçici Hesaplamalar
      </button>
    </div>
  );

  // Sekme içeriklerini gösteren fonksiyon - YENİ SEKMEYİ EKLE
  const renderActiveTabContent = () => {
    return (
      <>
        {activeTab === 'main-panel' && (
          <div key="main-panel-content" className="tab-panel">
            {renderPanelList()}
          </div>
        )}
        
        {activeTab === 'special-panel' && (
          <div key="special-panel-content" className="tab-panel">
            {renderSpecialPanelEntry()}
          </div>
        )}
        
        {activeTab === 'profil-hesaplama' && (
          <div key="profil-hesaplama-content" className="tab-panel">
            <ProfilHesaplama 
              genelDegiskenler={genelDegiskenler} 
              profilDegiskenler={profilDegiskenler}
              fetchGenelDegiskenler={() => fetchSectionData('genel')}
              fetchProfilDegiskenler={() => fetchSectionData('profil')}
            />
          </div>
        )}
        
        {activeTab === 'results' && (
          <div key="results-content" className="tab-panel">
            {showSalesView ? renderSalesView() : renderResults()}
          </div>
        )}
        
        {activeTab === 'temp-calculations' && (
          <div key="temp-calculations-content" className="tab-panel">
            {renderTempCalculations()}
          </div>
        )}
      </>
    );
  };

  // Ana paneldeki hesapla butonunu güncelle
  const renderPanelList = () => {
    // Diğer kodlar...
    
    // Hesapla butonu değiştirilmiş hali:
    const calculateButton = (
      <button
        onClick={() => handleHesaplaClick('main-panel')}
        disabled={calculating || filteredPanelList.length === 0}
        className="flex items-center px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md shadow transition-colors"
      >
        <Calculator className="mr-1 h-4 w-4" />
        Hesapla
      </button>
    );
    
    // Geri kalan kodlar...
  };

  // Özel panel sekmesindeki hesapla butonunu güncelle
  const renderSpecialPanelEntry = () => {
    // Diğer kodlar...
    
    // Hesapla butonu değiştirilmiş hali:
    const calculateButton = (
      <button
        onClick={() => handleHesaplaClick('special-panel')}
        disabled={calculating || ozelPanelList.length === 0}
        className="flex items-center px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md shadow transition-colors"
      >
        <Calculator className="mr-1 h-4 w-4" />
        Hesapla
      </button>
    );
    
    // Geri kalan kodlar...
  };

  // Yükleme animasyonu
  const renderLoading = () => (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center">
        <RefreshCw className="animate-spin text-red-600 mb-4" size={40} />
        <p className="text-gray-600">Veriler yükleniyor, lütfen bekleyin...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Panel Çit Maliyet Hesaplama</h2>
      {renderTabButtons()}
      {renderDegiskenlerAccordion()}
      {loading ? renderLoading() : renderActiveTabContent()}
      
      {/* Galvanizli/Galvanizsiz Seçim Popup'ı */}
      <GalvanizliSecimPopup
        isOpen={showGalvanizliPopup}
        onClose={() => setShowGalvanizliPopup(false)}
        onSelect={handleGalvanizliSecim}
        title="Tel Tipi Seçimi"
        description="Hesaplamada hangi tel tipi kullanılsın?"
      />
    </div>
  );
};

export default PanelCitHesaplama;