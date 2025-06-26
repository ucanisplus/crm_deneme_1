// Galvanizli Tel Maliyet Hesaplama - Ana Component
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { API_URLS, fetchWithAuth, normalizeInputValue } from '@/api-config';
import { fetchWithCorsProxy, CORS_PROXY_API_URLS } from '@/lib/cors-proxy';
import { toast } from 'react-toastify';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const GalvanizliTelNetsis = () => {
  const { user, hasPermission } = useAuth();
  
  // Coklu onay islemi engelleme ref i
  const isProcessingApproval = useRef(false);
  
  // Onay sirasinda modal cakismasi engellemek icin
  const [isInApprovalProcess, setIsInApprovalProcess] = useState(false);
  
  // Ana state ler
  const [currentStep, setCurrentStep] = useState('input'); // input, summary, processing
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Islem sirasi - DB ye kayit sirasinda belirlenir
  const [processSequence, setProcessSequence] = useState('00');
  
  // Hesaplamalar icin kullanici input lari
  const [userInputValues, setUserInputValues] = useState({
    ash: 5.54, // Kul miktari
    lapa: 2.73, // Lapa miktari
    uretim_kapasitesi_aylik: 2800,
    toplam_tuketilen_asit: 30000,
    ortalama_uretim_capi: 3.08,
    paketlemeDkAdet: 10
  });
  
  // Talep yonetimi state leri
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [showRequestDetailModal, setShowRequestDetailModal] = useState(false);
  const [isRequestUsed, setIsRequestUsed] = useState(false); // Talep kullanilma durumu
  const [isEditingRequest, setIsEditingRequest] = useState(false); // Talep duzenleme durumu
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [showApproveConfirmModal, setShowApproveConfirmModal] = useState(false);
  
  // Filtreleme ve siralama durumlari
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Kullanici adlarini gostermek icin ID yerine isim esleme
  const [users, setUsers] = useState({}); // Map of id -> username
  
  // Mevcut MM GT secimi icin state'ler
  const [existingMmGts, setExistingMmGts] = useState([]);
  const [selectedExistingMmGt, setSelectedExistingMmGt] = useState(null);
  const [showExistingMmGtModal, setShowExistingMmGtModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleteType, setDeleteType] = useState('mmgt'); // 'mmgt' or 'ymst'
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [deleteAllConfirmText, setDeleteAllConfirmText] = useState('');
  
  // Kullanici girdi degerleri icin ayarlar modali
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  
  // YM ST ekleme modali
  const [showAddYmStModal, setShowAddYmStModal] = useState(false);
  const [newYmStData, setNewYmStData] = useState({
    cap: '',
    filmasin: '',
    quality: ''
  });
  
  // YM ST veritabani secim modali
  const [showYmStSelectionModal, setShowYmStSelectionModal] = useState(false);
  const [allYmStsForSelection, setAllYmStsForSelection] = useState([]);
  const [ymStSearchQuery, setYmStSearchQuery] = useState('');
  const [selectedYmStsForAdd, setSelectedYmStsForAdd] = useState([]);
  
  // YMST listesi icin stateler
  const [existingYmSts, setExistingYmSts] = useState([]);
  const [activeDbTab, setActiveDbTab] = useState('mmgt'); // 'mmgt' or 'ymst'
  const [mainYmStIndex, setMainYmStIndex] = useState(0); // Ana YMST'nin index'i (1:1:n iliskisi icin)
  
  // Kopya onay dialog durumlari
  const [showDuplicateConfirmModal, setShowDuplicateConfirmModal] = useState(false);
  const [duplicateProducts, setDuplicateProducts] = useState([]);
  const [pendingSaveData, setPendingSaveData] = useState(null);
  
  // Mevcut urunu veritabanindan goruntuleyip goruntulemedigi takibi
  const [isViewingExistingProduct, setIsViewingExistingProduct] = useState(false);
  
  // Urun cakisma uyari modali
  const [showProductConflictModal, setShowProductConflictModal] = useState(false);
  const [conflictProduct, setConflictProduct] = useState(null);
  const [conflictType, setConflictType] = useState(''); // 'exact' or 'nonkey'
  
  // YMST mevcut uyari modali
  const [showYmStExistsModal, setShowYmStExistsModal] = useState(false);
  const [existingYmStsForModal, setExistingYmStsForModal] = useState([]);
  
  // Oturum takibi - ayni oturumda kaydedilen urunler
  const [sessionSavedProducts, setSessionSavedProducts] = useState({
    mmGtIds: [],
    ymGtId: null,
    ymStIds: []
  });
  
  // Ondalik sayilar icin nokta kullanan fonksiyon
  const normalizeDecimalDisplay = (value) => {
    // Bos degerler icin kontrol
    if (value === null || value === undefined) {
      return '';
    }
    
    // Sayilar icin nokta formatinda
    if (typeof value === 'number') {
      // String cevirme ile nokta ayracini zorla
      return value.toString();
    }
    
    // Virgullu stringler icin nokta cevirimi
    if (typeof value === 'string' && value.includes(',')) {
      return value.replace(/,/g, '.');
    }
    
    // Zaten dogru formatta olanlar icin
    if (typeof value === 'string') {
      return value;
    }
    
    // Varsayilan
    return value ? value.toString() : '';
  };

  // Excel icin ondalik formatla - fazla sifirlari kaldir
  const formatDecimalForExcel = (value) => {
    if (value === null || value === undefined || value === '') {
      return '';
    }
    
    // Convert to number and remove trailing zeros
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) {
      return String(value);
    }
    
    // Use parseFloat to remove trailing zeros, then convert to string and replace . with ,
    return parseFloat(numValue.toString()).toString().replace('.', ',');
  };
  
  // Form verileri - NOKTA kullan decimal icin
  const [mmGtData, setMmGtData] = useState({
    cap: '2.50', // Ensure point decimal separator 
    kod_2: 'NIT',
    kaplama: '50', // Integer value
    min_mukavemet: '350', // Integer value
    max_mukavemet: '550', // Integer value
    kg: '500', // Integer value
    ic_cap: 45,
    dis_cap: 75,
    tolerans_plus: '0.05', // Ensure point decimal separator
    tolerans_minus: '0.06', // Ensure point decimal separator
    shrink: 'evet',
    unwinding: '',
    cast_kont: '',
    helix_kont: '',
    elongation: ''
  });
  
  // Hesaplanan/olusturulan veriler
  const [ymGtData, setYmGtData] = useState(null);
  const [suitableYmSts, setSuitableYmSts] = useState([]);
  const [selectedYmSts, setSelectedYmSts] = useState([]);
  const [autoGeneratedYmSts, setAutoGeneratedYmSts] = useState([]);
  
  // Recete verileri - Her YM ST icin MM GT, YM GT ve YM ST receteleri
  const [allRecipes, setAllRecipes] = useState({
    mmGtRecipes: {}, // { ymStIndex: { recipe } }
    ymGtRecipe: {}, // Tek YM GT recetesi (sequence matching)
    ymStRecipes: {} // { ymStIndex: { recipe } }
  });
  
  // Recete durumu takibi - hangi alan nereden geldi
  const [recipeStatus, setRecipeStatus] = useState({
    mmGtRecipes: {}, // { ymStIndex: { bilesen_kodu: 'database' | 'auto' | 'manual' } }
    ymGtRecipe: {}, // { bilesen_kodu: 'database' | 'auto' | 'manual' }
    ymStRecipes: {} // { ymStIndex: { bilesen_kodu: 'database' | 'auto' | 'manual' } }
  });
  
  // Aktif recete sekmesi
  const [activeRecipeTab, setActiveRecipeTab] = useState(0); // Hangi YM ST'nin recetesi gosteriliyor
  
  // Dropdown values for the active tab - managed in state for proper synchronization
  const [activeTabDropdownValues, setActiveTabDropdownValues] = useState({
    filmasinCode: 'FLM.0600.1006',
    shrinkType: ''
  });
  
  // Veritabani state'leri
  const [savedToDatabase, setSavedToDatabase] = useState(false);
  const [databaseIds, setDatabaseIds] = useState({
    mmGtIds: [], // Coklu MM GT ID'ler
    ymGtId: null,
    ymStIds: []
  });
  
  // State for edit notes modal
  const [showEditNotesModal, setShowEditNotesModal] = useState(false);
  const [editNotes, setEditNotes] = useState('');
  
  // TLC_Hizlar cache - we'll fetch the data from the database
  const [tlcHizlarCache, setTlcHizlarCache] = useState({});
  const [tlcHizlarLoading, setTlcHizlarLoading] = useState(false);
  
  // Request selection state for Excel export
  const [selectedRequestIds, setSelectedRequestIds] = useState([]);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  // Dostca alan adlari
  const friendlyNames = {
    'TLC01': 'Tel Cekme Sure (TLC01)',
    'SM.HIDROLIK.ASIT': 'HCL Asit (SM.HIDROLIK.ASIT)',
    '150 03': 'Cinko (150 03)',
    'AMB.APEX CEMBER 38X080': 'Celik cember (AMB.APEX CEMBER 38X080)',
    'AMB.TOKA.SIGNODE.114P. DKP': 'Cember tokasi (AMB.TOKA.SIGNODE.114P. DKP)',
    'SM.7MMHALKA': 'Kaldirma kancasi (SM.7MMHALKA)',
    'AMB.SHRINK.200*140CM': 'Shrink Tuketimi (KG)',
    'AMB.SHRINK.200*160CM': 'Shrink Tuketimi (KG)',
    'AMB.SHRINK.200*190CM': 'Shrink Tuketimi (KG)',
    'AMB.CEM.KARTON.GAL': 'Karton (AMB.CEM.KARTON.GAL)',
    'GTPKT01': 'Paketleme Sure (GTPKT01)',
    'GLV01': 'Galvaniz Sure (GLV01)',
    'SM.DESI.PAK': 'Silkajel Tuketimi (AD)'
  };

  // All useEffect hooks - moved before permission check to comply with Rules of Hooks
  
  // Sayfa yuklendiginde talepleri getir
  useEffect(() => {
    fetchRequests();
    fetchExistingMmGts();
    fetchExistingYmSts();
    fetchUserInputValues();
    fetchUsers(); // Fetch users for username lookup
  }, []);
  
  // Cap degeri degistiginde Dis Cap'i otomatik hesapla
  useEffect(() => {
    if (mmGtData.cap && mmGtData.ic_cap) {
      const cap = parseFloat(mmGtData.cap) || 0;
      const icCap = parseInt(mmGtData.ic_cap) || 45;
      let disCap;
      
      // Cap ve ic capa gore dis cap hesaplama
      if (icCap === 45) disCap = 75;
      else if (icCap === 50) disCap = 90;
      else if (icCap === 55) disCap = 105;
      else disCap = icCap + (cap * 10); // Genel hesaplama
      
      setMmGtData(prev => ({ ...prev, dis_cap: disCap }));
    }
  }, [mmGtData.cap, mmGtData.ic_cap]);
  
  // Kod-2 degisikliginde kaplama degerini guncelle
  useEffect(() => {
    if (mmGtData.kod_2 === 'PAD') {
      setMmGtData(prev => ({ ...prev, kaplama: '50' }));
    }
  }, [mmGtData.kod_2]);
  
  // Load TLC_Hizlar data from the database when component mounts
  useEffect(() => {
    fetchTlcHizlarData();
  }, []);
  
  // Cleanup sessionStorage on component unmount
  useEffect(() => {
    return () => {
      // Clean up sessionStorage when component unmounts
      sessionStorage.removeItem('lastEditedRequestId');
    };
  }, []);

  // Update dropdown values when switching tabs
  useEffect(() => {
    const allYmSts = [...selectedYmSts, ...autoGeneratedYmSts];
    const activeYmSt = allYmSts[activeRecipeTab];
    
    if (activeYmSt) {
      // Calculate filmasin code for the active YM ST
      const filmasinCode = getFilmasinKodu(activeYmSt);
      
      // Calculate shrink type for the active tab
      const shrinkKeys = ['AMB.SHRINK.200*140CM', 'AMB.SHRINK.200*160CM', 'AMB.SHRINK.200*190CM'];
      const currentShrinkKey = shrinkKeys.find(sk => allRecipes.mmGtRecipes[activeRecipeTab]?.[sk] > 0);
      const shrinkType = currentShrinkKey || '';
      
      // Update dropdown values in state
      setActiveTabDropdownValues({
        filmasinCode: filmasinCode,
        shrinkType: shrinkType
      });
      
    } else {
      // Reset to defaults if no active YM ST
      setActiveTabDropdownValues({
        filmasinCode: 'FLM.0600.1006',
        shrinkType: ''
      });
    }
  }, [activeRecipeTab, selectedYmSts, autoGeneratedYmSts, allRecipes.mmGtRecipes]);

  // Izin kontrolu
  if (!hasPermission('access:galvanizli-tel')) {
    return (
      <div className="p-4 text-center">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-700">Bu module erisim izniniz bulunmamaktadir.</p>
        </div>
      </div>
    );
  }

  // Fetch user input values from database
  const fetchUserInputValues = async () => {
    try {
      // Check if the API endpoint URL is defined
      if (!API_URLS.galUserInputValues) {
        console.warn('galUserInputValues API endpoint is not defined, using default values');
        return;
      }
      
      const response = await fetch(API_URLS.galUserInputValues);
      if (response && response.ok) {
        const data = await response.json();
        // En son kaydi al
        if (data && data.length > 0) {
          // En son kaydi almak icin tarihe gore sirala
          const sortedData = data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          const latestValues = sortedData[0];
          
          setUserInputValues({
            ash: parseFloat(latestValues.ash) || 5.54,
            lapa: parseFloat(latestValues.lapa) || 2.73,
            uretim_kapasitesi_aylik: parseFloat(latestValues.uretim_kapasitesi_aylik) || 2800,
            toplam_tuketilen_asit: parseFloat(latestValues.toplam_tuketilen_asit) || 30000,
            ortalama_uretim_capi: parseFloat(latestValues.ortalama_uretim_capi) || 3.08,
            paketlemeDkAdet: parseFloat(latestValues.paketlemeDkAdet) || 10
          });
        }
      }
    } catch (error) {
      console.error('Error fetching user input values:', error);
    }
  };
  
  // Save user input values to database
  const saveUserInputValues = async () => {
    try {
      setIsLoading(true);
      
      // Tum girdilerin gecerli sayi oldugunu kontrol et
      const validatedInputs = {
        ash: parseFloat(userInputValues.ash) || 5.54,
        lapa: parseFloat(userInputValues.lapa) || 2.73,
        uretim_kapasitesi_aylik: parseFloat(userInputValues.uretim_kapasitesi_aylik) || 2800,
        toplam_tuketilen_asit: parseFloat(userInputValues.toplam_tuketilen_asit) || 30000,
        ortalama_uretim_capi: parseFloat(userInputValues.ortalama_uretim_capi) || 3.08,
        paketlemeDkAdet: parseFloat(userInputValues.paketlemeDkAdet) || 10
      };
      
      // Dogrulanan degerlerle state'i guncelle
      setUserInputValues(validatedInputs);
      
      // API endpoint tanimli mi kontrol et
      if (API_URLS.galUserInputValues) {
        // Endpoint varsa veritabanina kaydet
        const response = await fetch(API_URLS.galUserInputValues, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(validatedInputs)
        });
        
        if (response.ok) {
          toast.success('Hesaplama degerleri basariyla kaydedildi.');
        } else {
          toast.error('Hesaplama degerleri kaydedilirken bir hata olustu.');
        }
      } else {
        // Just update local state if no endpoint
        toast.success('Hesaplama degerleri guncellendi.');
      }
      
      // Close the modal
      setShowSettingsModal(false);
      
      // Recalculate recipes with new values if any exist
      if (Object.keys(allRecipes.ymGtRecipe).length > 0 || 
          Object.keys(allRecipes.ymStRecipes).length > 0) {
        calculateAutoRecipeValues();
      }
    } catch (error) {
      console.error('Error saving user input values:', error);
      toast.error('Hesaplama degerleri kaydedilirken bir hata olustu.');
    } finally {
      setIsLoading(false);
    }
  };


  // Talepleri getir
  // Kullanici listesi getir
  const fetchUsers = async () => {
    try {
      const response = await fetchWithAuth(API_URLS.crmUsers);
      if (response && response.ok) {
        const data = await response.json();
        const userMap = {};
        data.forEach(user => {
          // Map both ID and username to username for consistent display
          userMap[user.id] = user.username;
          userMap[user.username] = user.username; // Also map username to itself
        });
        setUsers(userMap);
      }
    } catch (error) {
      console.error('Kullanicilar yukleme hatasi:', error);
    }
  };

  // Kullanici ID'sini username'e cevir
  const getUsernameById = (userId) => {
    if (!userId) return '-';
    return users[userId] || userId;
  };

  const fetchRequests = async () => {
    try {
      setIsLoading(true);
      // Get all requests regardless of status for filtering in the UI
      const response = await fetchWithAuth(`${API_URLS.galSalRequests}`);
      if (response && response.ok) {
        const data = await response.json();
        setRequests(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Talepler getirilirken hata:', error);
      toast.error('Talepler getirilemedi');
    } finally {
      setIsLoading(false);
    }
  };

  // Mevcut MM GT'leri getir
  const fetchExistingMmGts = async () => {
    try {
      const response = await fetchWithAuth(API_URLS.galMmGt);
      if (response && response.ok) {
        const data = await response.json();
        setExistingMmGts(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Mevcut MM GT listesi getirilirken hata:', error);
      toast.error('Mevcut MM GT listesi getirilemedi');
    }
  };

  // Mevcut YM ST'leri getir
  const fetchExistingYmSts = async () => {
    try {
      const response = await fetchWithAuth(API_URLS.galYmSt);
      if (response && response.ok) {
        const data = await response.json();
        setExistingYmSts(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Mevcut YM ST listesi getirilirken hata:', error);
      toast.error('Mevcut YM ST listesi getirilemedi');
    }
  };

  // Mevcut recete verilerini getir (daha guclu)
  const fetchExistingRecipes = async (mmGtId, ymGtId, ymStIds) => {
    try {
      setIsLoading(true);
      let statusUpdates = {
        mmGtRecipes: {},
        ymGtRecipe: {},
        ymStRecipes: {}
      };
      
      // MM GT recetelerini getir
      if (mmGtId) {
        const mmGtRecipeResponse = await fetchWithAuth(`${API_URLS.galMmGtRecete}?mm_gt_id=${mmGtId}`);
        if (mmGtRecipeResponse && mmGtRecipeResponse.ok) {
          const mmGtRecipeData = await mmGtRecipeResponse.json();
          // Parse recipe data
          const parsedMmGtRecipe = {};
          mmGtRecipeData.forEach(item => {
            parsedMmGtRecipe[item.bilesen_kodu] = item.miktar;
            if (!statusUpdates.mmGtRecipes[0]) statusUpdates.mmGtRecipes[0] = {};
            statusUpdates.mmGtRecipes[0][item.bilesen_kodu] = 'database';
          });
          setAllRecipes(prev => ({
            ...prev,
            mmGtRecipes: { ...prev.mmGtRecipes, 0: parsedMmGtRecipe }
          }));
        }
      }
      
      // YM GT recetesini getir
      if (ymGtId) {
        const ymGtRecipeResponse = await fetchWithAuth(`${API_URLS.galYmGtRecete}?ym_gt_id=${ymGtId}`);
        if (ymGtRecipeResponse && ymGtRecipeResponse.ok) {
          const ymGtRecipeData = await ymGtRecipeResponse.json();
          const parsedYmGtRecipe = {};
          ymGtRecipeData.forEach(item => {
            parsedYmGtRecipe[item.bilesen_kodu] = item.miktar;
            statusUpdates.ymGtRecipe[item.bilesen_kodu] = 'database';
          });
          setAllRecipes(prev => ({
            ...prev,
            ymGtRecipe: parsedYmGtRecipe
          }));
        }
      }
      
      // YM ST recetelerini getir
      if (ymStIds.length > 0) {
        for (let i = 0; i < ymStIds.length; i++) {
          const ymStId = ymStIds[i];
          const ymStRecipeResponse = await fetchWithAuth(`${API_URLS.galYmStRecete}?ym_st_id=${ymStId}`);
          if (ymStRecipeResponse && ymStRecipeResponse.ok) {
            const ymStRecipeData = await ymStRecipeResponse.json();
            const parsedYmStRecipe = {};
            ymStRecipeData.forEach(item => {
              parsedYmStRecipe[item.bilesen_kodu] = item.miktar;
              if (!statusUpdates.ymStRecipes[i]) statusUpdates.ymStRecipes[i] = {};
              statusUpdates.ymStRecipes[i][item.bilesen_kodu] = 'database';
            });
            setAllRecipes(prev => ({
              ...prev,
              ymStRecipes: { ...prev.ymStRecipes, [i]: parsedYmStRecipe }
            }));
          }
        }
      }
      
      // Recete durumlarini guncelle
      setRecipeStatus(statusUpdates);
      
    } catch (error) {
      console.error('Mevcut receteler getirilirken hata:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Veritabanindan recete getir fonksiyonu - Enhanced with relationship table
  const fetchRecipesFromDatabase = async () => {
    try {
      setIsLoading(true);
      const allYmSts = [...selectedYmSts, ...autoGeneratedYmSts];
      let foundAny = false;
      let statusUpdates = {
        mmGtRecipes: {},
        ymGtRecipe: {},
        ymStRecipes: {}
      };
      
      
      if (allYmSts.length === 0) {
        toast.warning('Henuz YM ST secilmemis. Once YM ST sedin veya olusturun.');
        setIsLoading(false);
        return;
      }
      
      // Try to find MM GT based on current form data
      const capFormatted = Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0');
      const sequence = processSequence || '00';
      const mmGtStokKodu = `GT.${mmGtData.kod_2}.${capFormatted}.${sequence}`;
      
      
      // Find MM GT
      const mmGtResponse = await fetchWithAuth(`${API_URLS.galMmGt}?stok_kodu=${encodeURIComponent(mmGtStokKodu)}`);
      if (mmGtResponse && mmGtResponse.ok) {
        const mmGtData = await mmGtResponse.json();
        if (mmGtData.length > 0) {
          const mmGt = mmGtData[0];
          
          // 🆕 NEW: Use enhanced relationship table to find YM GT and YM STs
          const relationResponse = await fetchWithAuth(`${API_URLS.galMmGtYmSt}?mm_gt_id=${mmGt.id}`);
          if (relationResponse && relationResponse.ok) {
            const relations = await relationResponse.json();
            
            if (relations.length > 0) {
              const ymGtId = relations[0].ym_gt_id; // All relations should have same ym_gt_id
              
              // Load MM GT recipes
              const mmGtRecipeResponse = await fetchWithAuth(`${API_URLS.galMmGtRecete}?mm_gt_id=${mmGt.id}`);
              if (mmGtRecipeResponse && mmGtRecipeResponse.ok) {
                const mmGtRecipeData = await mmGtRecipeResponse.json();
                if (mmGtRecipeData.length > 0) {
                  
                  // Apply MM GT recipes to all YM ST indices
                  for (let i = 0; i < allYmSts.length; i++) {
                    const parsedMmGtRecipe = {};
                    mmGtRecipeData.forEach(item => {
                      // Special handling for Cinko: database stores as '150' but we display as '150 03'
                      let displayCode = item.bilesen_kodu;
                      if (item.bilesen_kodu === '150' && item.aciklama === 'Cinko Tuketim Miktari') {
                        displayCode = '150 03';
                      }
                      
                      parsedMmGtRecipe[displayCode] = parseFloat(item.miktar || 0); // Clean number, no trailing zeros
                      if (!statusUpdates.mmGtRecipes[i]) statusUpdates.mmGtRecipes[i] = {};
                      statusUpdates.mmGtRecipes[i][displayCode] = 'database';
                    });
                    setAllRecipes(prev => ({
                      ...prev,
                      mmGtRecipes: { ...prev.mmGtRecipes, [i]: parsedMmGtRecipe }
                    }));
                  }
                  foundAny = true;
                }
              }
              
              // 🆕 NEW: Load YM GT recipes using the relationship
              if (ymGtId) {
                const ymGtRecipeResponse = await fetchWithAuth(`${API_URLS.galYmGtRecete}?ym_gt_id=${ymGtId}`);
                if (ymGtRecipeResponse && ymGtRecipeResponse.ok) {
                  const ymGtRecipeData = await ymGtRecipeResponse.json();
                  if (ymGtRecipeData.length > 0) {
                    
                    const parsedYmGtRecipe = {};
                    ymGtRecipeData.forEach(item => {
                      // Special handling for Cinko: database stores as '150' but we display as '150 03'
                      let displayCode = item.bilesen_kodu;
                      if (item.bilesen_kodu === '150' && item.aciklama === 'Cinko Tuketim Miktari') {
                        displayCode = '150 03';
                      }
                      
                      parsedYmGtRecipe[displayCode] = parseFloat(item.miktar || 0); // Clean number, no trailing zeros
                      statusUpdates.ymGtRecipe[displayCode] = 'database';
                    });
                    setAllRecipes(prev => ({
                      ...prev,
                      ymGtRecipe: parsedYmGtRecipe
                    }));
                    foundAny = true;
                  }
                }
              }
              
              // 🆕 NEW: Load YM STs and their recipes using the enhanced relationship table
              
              // Sort relations by sequence_index to maintain order
              const sortedRelations = relations.sort((a, b) => (a.sequence_index || 0) - (b.sequence_index || 0));
              
              // First, load the actual YM ST products
              const loadedYmSts = [];
              let mainIndex = 0;
              
              // Load YM ST products and their recipes
              for (let i = 0; i < sortedRelations.length; i++) {
                const relation = sortedRelations[i];
                const ymStId = relation.ym_st_id;
                
                
                // First load the YM ST product itself
                try {
                  const ymStResponse = await fetchWithAuth(`${API_URLS.galYmSt}?id=${ymStId}`);
                  if (ymStResponse && ymStResponse.ok) {
                    const ymStData = await ymStResponse.json();
                    const ymSt = Array.isArray(ymStData) ? ymStData[0] : ymStData;
                    if (ymSt) {
                      loadedYmSts.push({ ...ymSt, source: 'database' });
                      
                      if (relation.is_main) {
                        mainIndex = i;
                      }
                      
                    }
                  }
                } catch (error) {
                  console.error(`Error loading YM ST ${ymStId}:`, error);
                }
                
                // Then load YM ST recetesini getir
                const ymStRecipeResponse = await fetchWithAuth(`${API_URLS.galYmStRecete}?ym_st_id=${ymStId}`);
                if (ymStRecipeResponse && ymStRecipeResponse.ok) {
                  const ymStRecipeData = await ymStRecipeResponse.json();
                  if (ymStRecipeData.length > 0) {
                    
                    const parsedYmStRecipe = {};
                    ymStRecipeData.forEach(item => {
                      // Special handling for Cinko: database stores as '150' but we display as '150 03'
                      let displayCode = item.bilesen_kodu;
                      if (item.bilesen_kodu === '150' && item.aciklama === 'Cinko Tuketim Miktari') {
                        displayCode = '150 03';
                      }
                      
                      parsedYmStRecipe[displayCode] = parseFloat(item.miktar || 0); // Clean number, no trailing zeros
                      if (!statusUpdates.ymStRecipes[i]) statusUpdates.ymStRecipes[i] = {};
                      statusUpdates.ymStRecipes[i][displayCode] = 'database';
                    });
                    setAllRecipes(prev => ({
                      ...prev,
                      ymStRecipes: { ...prev.ymStRecipes, [i]: parsedYmStRecipe }
                    }));
                    foundAny = true;
                  }
                }
              }
              
              // Set loaded YM STs if any were found
              if (loadedYmSts.length > 0) {
                setSelectedYmSts(loadedYmSts);
                setMainYmStIndex(mainIndex);
                
                // Clear any auto-generated YM STs since we're using database ones
                setAutoGeneratedYmSts([]);
              }
            }
          }
        }
      }
      
      // If MM GT wasn't found, try fallback for individual YM ST search (for manual recipe loading)
      if (!foundAny) {
        
        // Fallback: YM ST recetelerini tek tek getir
        for (let i = 0; i < allYmSts.length; i++) {
          const ymSt = allYmSts[i];
          
          // YM ST'yi bul
          let ymStResponse;
          if (ymSt.id) {
            // Veritabanindan secilmis YM ST
            ymStResponse = await fetchWithAuth(`${API_URLS.galYmSt}/${ymSt.id}`);
          } else {
            // Otomatik olusturulmus YM ST icin stok koduna gore ara
            ymStResponse = await fetchWithAuth(`${API_URLS.galYmSt}?stok_kodu=${encodeURIComponent(ymSt.stok_kodu)}`);
          }
          
          if (ymStResponse && ymStResponse.ok) {
            let ymStData = await ymStResponse.json();
            if (Array.isArray(ymStData)) ymStData = ymStData[0];
            
            if (ymStData && ymStData.id) {
              // YM ST recetesini getir
              const ymStRecipeResponse = await fetchWithAuth(`${API_URLS.galYmStRecete}?ym_st_id=${ymStData.id}`);
              if (ymStRecipeResponse && ymStRecipeResponse.ok) {
                const ymStRecipeData = await ymStRecipeResponse.json();
                if (ymStRecipeData.length > 0) {
                  const parsedYmStRecipe = {};
                  ymStRecipeData.forEach(item => {
                    // Special handling for Cinko: database stores as '150' but we display as '150 03'
                    let displayCode = item.bilesen_kodu;
                    if (item.bilesen_kodu === '150' && item.aciklama === 'Cinko Tuketim Miktari') {
                      displayCode = '150 03';
                    }
                    
                    parsedYmStRecipe[displayCode] = item.miktar;
                    if (!statusUpdates.ymStRecipes[i]) statusUpdates.ymStRecipes[i] = {};
                    statusUpdates.ymStRecipes[i][displayCode] = 'database';
                  });
                  setAllRecipes(prev => ({
                    ...prev,
                    ymStRecipes: { ...prev.ymStRecipes, [i]: parsedYmStRecipe }
                  }));
                  foundAny = true;
                }
              }
            }
          }
        }
      }
      
      // Recete durumlarini guncelle
      setRecipeStatus(statusUpdates);
      
      if (!foundAny) {
        toast.info('Veritabaninda eslesen recete bulunamadi');
        // Alanlari temizle
        setAllRecipes({
          mmGtRecipes: {},
          ymGtRecipe: {},
          ymStRecipes: {}
        });
        setRecipeStatus({
          mmGtRecipes: {},
          ymGtRecipe: {},
          ymStRecipes: {}
        });
      } else {
        toast.success('Veritabanindan receteler basariyla getirildi');
      }
    } catch (error) {
      console.error('Veritabanindan recete getirme hatasi:', error);
      toast.error('Veritabanindan recete getirme hatasi: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Talep sil fonksiyonu
  const deleteRequest = async (requestId) => {
    try {
      setIsLoading(true);
      const response = await fetchWithAuth(`${API_URLS.galSalRequests}/${requestId}`, {
        method: 'DELETE'
      });
      
      if (response && response.ok) {
        toast.success('Talep basariyla silindi');
        fetchRequests(); // Listeyi yenile
      } else {
        toast.error('Talep silinirken hata olustu');
      }
    } catch (error) {
      console.error('Talep silme hatasi:', error);
      toast.error('Talep silme hatasi: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // MM GT silme fonksiyonu - Iliskili YM GT'leri de siler
  const deleteMmGt = async (mmGt) => {
    try {
      setIsLoading(true);
      
      
      const mmGtId = mmGt.id;
      
      // First, find related YM GTs from relationship table
      try {
        const relationResponse = await fetchWithAuth(`${API_URLS.galMmGtYmSt}?mm_gt_id=${mmGtId}`);
        if (relationResponse && relationResponse.ok) {
          const relations = await relationResponse.json();
          
          // Step 1: Delete relationship records first
          for (const relation of relations) {
            try {
              const relationDeleteResponse = await fetchWithAuth(`${API_URLS.galMmGtYmSt}/${relation.id}`, {
                method: 'DELETE'
              });
              if (relationDeleteResponse.ok) {
              }
            } catch (relationError) {
              console.error(`Error deleting relationship ${relation.id}:`, relationError);
            }
          }
          
          // Step 2: Delete related YM GTs after relationships are removed
          for (const relation of relations) {
            if (relation.ym_gt_id) {
              try {
                const ymGtDeleteResponse = await fetchWithAuth(`${API_URLS.galYmGt}/${relation.ym_gt_id}`, {
                  method: 'DELETE'
                });
                if (ymGtDeleteResponse.ok) {
                } else {
                  console.error(`Failed to delete YM GT ${relation.ym_gt_id}: ${ymGtDeleteResponse.status}`);
                }
              } catch (ymGtError) {
                console.error(`Error deleting YM GT ${relation.ym_gt_id}:`, ymGtError);
              }
            }
          }
        }
      } catch (relationError) {
        console.error('❌ Error finding related YM GTs:', relationError);
      }
      
      // Step 3: Finally delete the MM GT
      const deleteResponse = await fetchWithAuth(`${API_URLS.galMmGt}/${mmGtId}`, { 
        method: 'DELETE'
      });
      
      if (!deleteResponse.ok) {
        throw new Error(`Failed to delete MM GT: ${deleteResponse.status}`);
      }
      
      
      // Refresh MM GT list only (YM GT refresh not needed since function doesn't exist in this scope)
      await fetchExistingMmGts();
      
      setShowDeleteConfirm(false);
      setItemToDelete(null);
      toast.success(`MM GT ${mmGt.stok_kodu} ve baglantili YM GT'ler basariyla silindi`);
    } catch (error) {
      console.error('MM GT silme hatasi:', error);
      toast.error('MM GT silme hatasi: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // YMST silme fonksiyonu
  const deleteYmSt = async (ymSt) => {
    try {
      setIsLoading(true);
      
      
      // Delete YM ST using backend cascade (backend handles related data automatically)
      try {
        const deleteResponse = await fetchWithAuth(`${API_URLS.galYmSt}/${ymSt.id}`, { 
          method: 'DELETE'
        });
        
        if (!deleteResponse.ok) {
          throw new Error(`Failed to delete YM ST: ${deleteResponse.status}`);
        }
        
      } catch (error) {
        console.error('YM ST deletion error:', error);
        throw error;
      }
      
      // Refresh the list
      await fetchExistingYmSts();
      
      setShowDeleteConfirm(false);
      setItemToDelete(null);
      toast.success(`YM ST ${ymSt.stok_kodu} basariyla silindi`);
    } catch (error) {
      console.error('YM ST silme hatasi:', error);
      toast.error('YM ST silme hatasi: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Silme onayi ac
  const handleDeleteClick = (item, type) => {
    setItemToDelete(item);
    setDeleteType(type);
    setShowDeleteConfirm(true);
  };

  // Silme onayi kapat
  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
    setItemToDelete(null);
    setDeleteType('mmgt');
  };

  // Tumunu sil fonksiyonu - Optimized bulk delete
  const handleDeleteAll = async () => {
    if (deleteAllConfirmText !== 'Hepsini Sil') {
      toast.error('Lutfen "Hepsini Sil" yazin');
      return;
    }

    try {
      setIsLoading(true);
      
      // Use batch operations with limited concurrency to avoid overwhelming the server
      const batchSize = 5; // Process 5 items at a time to prevent server overload
      
      if (activeDbTab === 'mmgt') {
        // Delete MM GTs one by one using the same logic as individual delete
        
        for (const mmGt of existingMmGts) {
          try {
            
            // Find related YM GTs from relationship table
            const relationResponse = await fetchWithAuth(`${API_URLS.galMmGtYmSt}?mm_gt_id=${mmGt.id}`);
            if (relationResponse && relationResponse.ok) {
              const relations = await relationResponse.json();
              
              // Step 1: Delete relationship records first
              for (const relation of relations) {
                try {
                  const relationDeleteResponse = await fetchWithAuth(`${API_URLS.galMmGtYmSt}/${relation.id}`, {
                    method: 'DELETE'
                  });
                  if (relationDeleteResponse.ok) {
                  }
                } catch (relationError) {
                  console.error(`Error deleting relationship ${relation.id}:`, relationError);
                }
              }
              
              // Step 2: Delete related YM GTs after relationships are removed
              for (const relation of relations) {
                if (relation.ym_gt_id) {
                  try {
                    const ymGtDeleteResponse = await fetchWithAuth(`${API_URLS.galYmGt}/${relation.ym_gt_id}`, {
                      method: 'DELETE'
                    });
                    if (ymGtDeleteResponse.ok) {
                    } else {
                      console.error(`Failed to delete YM GT ${relation.ym_gt_id}: ${ymGtDeleteResponse.status}`);
                    }
                  } catch (ymGtError) {
                    console.error(`Error deleting YM GT ${relation.ym_gt_id}:`, ymGtError);
                  }
                }
              }
            }
            
            // Step 3: Delete the MM GT
            const deleteResponse = await fetchWithAuth(`${API_URLS.galMmGt}/${mmGt.id}`, { 
              method: 'DELETE'
            });
            
            if (deleteResponse.ok) {
            } else {
              console.error(`Failed to delete MM GT ${mmGt.stok_kodu}: ${deleteResponse.status}`);
            }
            
          } catch (error) {
            console.error(`Error processing MM GT ${mmGt.stok_kodu}:`, error);
          }
        }
      } else if (activeDbTab === 'ymst') {
        // Delete only YM STs and their recipes
        const ymStIds = existingYmSts.map(ymSt => ymSt.id);
        
        if (ymStIds.length > 0) {
          for (let i = 0; i < ymStIds.length; i += batchSize) {
            const batch = ymStIds.slice(i, i + batchSize);
            const batchPromises = batch.map(id => 
              fetchWithAuth(`${API_URLS.galYmSt}/${id}`, { 
                method: 'DELETE'
              }).catch(error => {
                console.error(`Failed to delete YM ST ${id}:`, error);
                return null; // Continue with other deletions
              })
            );
            await Promise.all(batchPromises);
          }
        }
      }
      
      // Refresh data
      await Promise.all([
        fetchExistingMmGts(),
        fetchExistingYmSts()
      ]);
      
      setShowDeleteAllConfirm(false);
      setDeleteAllConfirmText('');
      
      // Show success message based on active tab
      if (activeDbTab === 'mmgt') {
        const deletedCount = existingMmGts.length;
        toast.success(`${deletedCount} MM GT ve iliskili YM GT'ler ile tum receteler basariyla silindi`);
      } else {
        const deletedCount = existingYmSts.length;
        toast.success(`${deletedCount} YM ST ve receteleri basariyla silindi`);
      }
      
      
    } catch (error) {
      console.error('Toplu silme hatasi:', error);
      toast.error('Toplu silme hatasi: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Talep secimi icin detay modali acma
  const handleSelectRequest = (request) => {
    // CRITICAL: Reset application state when selecting ANY request (new or different)
    // This ensures clean state for each request selection
    resetApplicationState();
    
    setSelectedRequest(request);
    setShowRequestsModal(false);
    setShowRequestDetailModal(true);
  };
  
  // Helper function to format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('tr-TR');
  };
  
  // Helper function to get status badge color
  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };
  
  // Helper function to get status text
  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return 'Beklemede';
      case 'approved':
        return 'Onaylandi';
      case 'rejected':
        return 'Reddedildi';
      case 'in_progress':
        return 'Isleniyor';
      case 'completed':
        return 'Tamamlandi';
      default:
        return status;
    }
  };
  
  // Filter and sort requests
  const getFilteredAndSortedRequests = () => {
    let filteredRequests = [...requests];
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filteredRequests = filteredRequests.filter(request => request.status === statusFilter);
    }
    
    // Apply search query
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filteredRequests = filteredRequests.filter(request => 
        (request.cap && request.cap.toString().includes(query)) ||
        (request.kod_2 && request.kod_2.toLowerCase().includes(query)) ||
        (request.kaplama && request.kaplama.toString().includes(query)) ||
        (request.id && request.id.toLowerCase().includes(query)) ||
        (request.cast_kont && request.cast_kont.toString().includes(query)) ||
        (request.unwinding && request.unwinding.toLowerCase().includes(query)) ||
        (request.helix_kont && request.helix_kont.toString().includes(query)) ||
        (request.elongation && request.elongation.toString().includes(query))
      );
    }
    
    // Apply sorting
    filteredRequests.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      // Handle null values
      if (aValue === null) return 1;
      if (bValue === null) return -1;
      
      // Handle date fields
      if (sortField === 'created_at' || sortField === 'processed_at') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }
      
      // Handle numeric fields
      if (sortField === 'cap' || sortField === 'kaplama' || sortField === 'kg' || sortField === 'cast_kont') {
        aValue = parseFloat(aValue);
        bValue = parseFloat(bValue);
      }
      
      // Apply sort direction
      const modifier = sortDirection === 'asc' ? 1 : -1;
      
      if (aValue < bValue) return -1 * modifier;
      if (aValue > bValue) return 1 * modifier;
      return 0;
    });
    
    return filteredRequests;
  };
  
  // Talebi duzenleme - Direct edit without notes popup
  const handleEditRequest = async () => {
    try {
      setIsLoading(true);
      
      // NOTE: No need to reset here - already reset in handleSelectRequest
      // resetApplicationState(); // REMOVED - already done when request was selected
      
      // Update the request status directly without asking for edit notes
      const updateResponse = await fetchWithAuth(`${API_URLS.galSalRequests}/${selectedRequest.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'in_progress',  // Mark as in progress while being edited
          processed_by: user?.username || user?.id || 'system',
          processed_at: new Date().toISOString()
        })
      });
      
      if (!updateResponse || !updateResponse.ok) {
        throw new Error('Talep durumu guncellenemedi');
      }
      
      toast.success('Talep duzenlemeye acildi');
      
      // Store request ID in sessionStorage to preserve it across state resets
      sessionStorage.setItem('lastEditedRequestId', selectedRequest.id);
      
      // Set data for editing
      setMmGtData({
        cap: selectedRequest.cap ? normalizeDecimalDisplay(selectedRequest.cap) : '',
        kod_2: selectedRequest.kod_2 || 'NIT',
        kaplama: selectedRequest.kaplama ? normalizeDecimalDisplay(selectedRequest.kaplama) : '',
        min_mukavemet: selectedRequest.min_mukavemet ? normalizeDecimalDisplay(selectedRequest.min_mukavemet) : '',
        max_mukavemet: selectedRequest.max_mukavemet ? normalizeDecimalDisplay(selectedRequest.max_mukavemet) : '',
        kg: selectedRequest.kg ? normalizeDecimalDisplay(selectedRequest.kg) : '',
        ic_cap: selectedRequest.ic_cap || 45,
        dis_cap: selectedRequest.dis_cap || 75,
        tolerans_plus: selectedRequest.tolerans_plus ? normalizeDecimalDisplay(selectedRequest.tolerans_plus) : '',
        tolerans_minus: selectedRequest.tolerans_minus ? normalizeDecimalDisplay(selectedRequest.tolerans_minus) : '',
        shrink: selectedRequest.shrink || 'evet',
        unwinding: selectedRequest.unwinding || 'Anti-Clockwise',
        cast_kont: selectedRequest.cast_kont || '',
        helix_kont: selectedRequest.helix_kont || '',
        elongation: selectedRequest.elongation || ''
      });
      
      // Mark that we're editing a request and set request as used
      setIsEditingRequest(true);
      setIsRequestUsed(true);
      
      // Clear modal and go to input screen
      setShowRequestDetailModal(false);
      setCurrentStep('input');
      
    } catch (error) {
      console.error('Talep duzenleme hatasi:', error);
      toast.error('Talep duzenlenemedi: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Talebi onaylama
  const handleDetailApproveRequest = async () => {
    try {
      setIsLoading(true);
      
      // DON'T RESET STATE HERE - we need existing data for approval process
      // resetApplicationState(); // REMOVED - this was breaking the approval flow
      
      // Update request status to approved
      const response = await fetchWithAuth(`${API_URLS.galSalRequests}/${selectedRequest.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'approved',
          processed_by: user?.username || user?.id || 'system',
          processed_at: new Date().toISOString()
          // Do not include updated_at as it doesn't exist in the database yet
        })
      });
      
      if (!response || !response.ok) {
        throw new Error('Talep durumu guncellenemedi');
      }
      
      toast.success('Talep basariyla onaylandi');
      
      // Set request as used and mark as NOT editing (it's now approved)
      setIsRequestUsed(true);
      setIsEditingRequest(false);
      
      // Use normalized decimal display for all numeric values to ensure points not commas
      setMmGtData({
        cap: selectedRequest.cap ? normalizeDecimalDisplay(selectedRequest.cap) : '',
        kod_2: selectedRequest.kod_2 || 'NIT',
        kaplama: selectedRequest.kaplama ? normalizeDecimalDisplay(selectedRequest.kaplama) : '',
        min_mukavemet: selectedRequest.min_mukavemet ? normalizeDecimalDisplay(selectedRequest.min_mukavemet) : '',
        max_mukavemet: selectedRequest.max_mukavemet ? normalizeDecimalDisplay(selectedRequest.max_mukavemet) : '',
        kg: selectedRequest.kg ? normalizeDecimalDisplay(selectedRequest.kg) : '',
        ic_cap: selectedRequest.ic_cap || 45,
        dis_cap: selectedRequest.dis_cap || 75,
        tolerans_plus: selectedRequest.tolerans_plus ? normalizeDecimalDisplay(selectedRequest.tolerans_plus) : '',
        tolerans_minus: selectedRequest.tolerans_minus ? normalizeDecimalDisplay(selectedRequest.tolerans_minus) : '',
        shrink: selectedRequest.shrink || 'evet',
        unwinding: selectedRequest.unwinding || 'Anti-Clockwise',
        cast_kont: selectedRequest.cast_kont || '',
        helix_kont: selectedRequest.helix_kont || '',
        elongation: selectedRequest.elongation || ''
      });
      
      setShowRequestDetailModal(false);
      setCurrentStep('summary');
      generateYmGtData();
      findSuitableYmSts();
      
    } catch (error) {
      console.error('Talep onaylama hatasi:', error);
      toast.error('Talep onaylanamadi: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Talebi reddetme modalini acma
  const handleOpenRejectModal = () => {
    setShowRejectionModal(true);
  };
  
  // Talebi reddetme islemini gerceklestirme
  const handleDetailRejectConfirm = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Lutfen bir ret nedeni girin');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Update request status to rejected with reason
      const response = await fetchWithAuth(`${API_URLS.galSalRequests}/${selectedRequest.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'rejected',
          rejection_reason: rejectionReason,
          processed_by: user?.username || user?.id || 'system',
          processed_at: new Date().toISOString()
          // Do not include updated_at as it doesn't exist in the database yet
        })
      });
      
      if (!response || !response.ok) {
        throw new Error('Talep durumu guncellenemedi');
      }
      
      toast.success('Talep reddedildi');
      setRejectionReason('');
      setShowRejectionModal(false);
      setShowRequestDetailModal(false);
      
      // Refresh the requests list
      fetchRequests();
      
    } catch (error) {
      console.error('Talep reddetme hatasi:', error);
      toast.error('Talep reddedilemedi: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Mevcut MM GT secimi
  const handleSelectExistingMmGt = async (mmGt) => {
    try {
      setIsLoading(true);
      setSelectedExistingMmGt(mmGt);
      setIsViewingExistingProduct(true); // Mark as viewing existing product
      
      // Extract sequence from existing product's stok_kodu
      const existingSequence = mmGt.stok_kodu ? mmGt.stok_kodu.split('.').pop() : '00';
      setProcessSequence(existingSequence);
      
      // Use normalized decimal display for numeric values to ensure points not commas
      setMmGtData({
        cap: mmGt.cap ? normalizeDecimalDisplay(mmGt.cap) : '',
        kod_2: mmGt.kod_2 || 'NIT',
        kaplama: mmGt.kaplama ? normalizeDecimalDisplay(mmGt.kaplama) : '',
        min_mukavemet: mmGt.min_mukavemet ? normalizeDecimalDisplay(mmGt.min_mukavemet) : '',
        max_mukavemet: mmGt.max_mukavemet ? normalizeDecimalDisplay(mmGt.max_mukavemet) : '',
        kg: mmGt.kg ? normalizeDecimalDisplay(mmGt.kg) : '',
        ic_cap: mmGt.ic_cap || 45,
        dis_cap: mmGt.dis_cap || 75,
        tolerans_plus: mmGt.tolerans_plus ? normalizeDecimalDisplay(mmGt.tolerans_plus) : '',
        tolerans_minus: mmGt.tolerans_minus ? normalizeDecimalDisplay(mmGt.tolerans_minus) : '',
        shrink: mmGt.shrink || 'evet',
        unwinding: mmGt.unwinding || '',
        cast_kont: mmGt.cast_kont || '',
        helix_kont: mmGt.helix_kont || '',
        elongation: mmGt.elongation || ''
      });
      
      // Clear existing selections first to avoid conflicts
      setSelectedYmSts([]);
      setAutoGeneratedYmSts([]);
      setAllRecipes({ mmGtRecipes: {}, ymGtRecipe: {}, ymStRecipes: {} });
      setRecipeStatus({ mmGtRecipes: {}, ymGtRecipe: {}, ymStRecipes: {} });
      
      // 🔄 STEP 1: Find all related data through the enhanced relationship table
      const mmGtYmStResponse = await fetchWithAuth(`${API_URLS.galMmGtYmSt}?mm_gt_id=${mmGt.id}`);
      
      let loadedYmSts = [];
      let relatedYmGtId = null;
      let mainYmStIndex = 0;
      
      if (mmGtYmStResponse && mmGtYmStResponse.ok) {
        const mmGtYmStRelations = await mmGtYmStResponse.json();
        
        if (mmGtYmStRelations.length > 0) {
          // 🆕 NEW: Get YM GT ID from the relationship (all relations should have the same ym_gt_id)
          relatedYmGtId = mmGtYmStRelations[0].ym_gt_id;
          
          // 🆕 NEW: Sort relations by sequence_index to maintain order
          const sortedRelations = mmGtYmStRelations.sort((a, b) => (a.sequence_index || 0) - (b.sequence_index || 0));
          
          // Load each related YM ST in the correct order
          for (let i = 0; i < sortedRelations.length; i++) {
            const relation = sortedRelations[i];
            try {
              const ymStResponse = await fetchWithAuth(`${API_URLS.galYmSt}?id=${relation.ym_st_id}`);
              if (ymStResponse && ymStResponse.ok) {
                const ymStData = await ymStResponse.json();
                const ymSt = Array.isArray(ymStData) ? ymStData[0] : ymStData;
                if (ymSt) {
                  loadedYmSts.push({ ...ymSt, source: 'database' });
                  
                  // 🆕 NEW: Track which YM ST is the main one
                  if (relation.is_main) {
                    mainYmStIndex = i;
                  }
                  
                }
              } else {
                console.warn(`⚠️ Failed to load YM ST with ID: ${relation.ym_st_id}`);
              }
            } catch (ymStError) {
              console.error(`Error loading YM ST ${relation.ym_st_id}:`, ymStError);
            }
          }
        }
      } else {
      }
      
      // If no YM STs were loaded from relationships, continue without them
      // User can still add new ones manually
      if (loadedYmSts.length === 0) {
      }
      
      // Set the loaded YM STs and main index
      setSelectedYmSts(loadedYmSts);
      if (loadedYmSts.length > 0) {
        setMainYmStIndex(mainYmStIndex); // 🆕 NEW: Use the actual main index from database
      }
      
      // 🔄 STEP 2: Load all recipes
      const updatedAllRecipes = { 
        mmGtRecipes: {}, 
        ymGtRecipe: {}, 
        ymStRecipes: {} 
      };
      const updatedRecipeStatus = { 
        mmGtRecipes: {}, 
        ymGtRecipe: {}, 
        ymStRecipes: {} 
      };
      
      // 2A. Load MM GT recipes
      try {
        const mmGtRecipeResponse = await fetchWithAuth(`${API_URLS.galMmGtRecete}?mm_gt_id=${mmGt.id}`);
        if (mmGtRecipeResponse && mmGtRecipeResponse.ok) {
          const mmGtRecipes = await mmGtRecipeResponse.json();
          
          // Initialize MM GT recipes for each YM ST index (including if no YM STs yet)
          const ymStCount = Math.max(loadedYmSts.length, 1); // At least 1 for the case where no YM STs are loaded yet
          for (let index = 0; index < ymStCount; index++) {
            updatedAllRecipes.mmGtRecipes[index] = {};
            updatedRecipeStatus.mmGtRecipes[index] = {};
            
            // Add each recipe
            mmGtRecipes.forEach(recipe => {
              if (recipe.bilesen_kodu && recipe.miktar !== null && recipe.miktar !== undefined) {
                // Special handling for Cinko: database stores as '150' but we display as '150 03'
                let displayCode = recipe.bilesen_kodu;
                if (recipe.bilesen_kodu === '150' && recipe.aciklama === 'Cinko Tuketim Miktari') {
                  displayCode = '150 03';
                }
                
                updatedAllRecipes.mmGtRecipes[index][displayCode] = parseFloat(recipe.miktar);
                updatedRecipeStatus.mmGtRecipes[index][displayCode] = 'database';
              }
            });
          }
        } else {
        }
      } catch (mmGtError) {
        console.error('❌ Error loading MM GT recipes:', mmGtError);
      }
      
      // 2B. Load YM GT recipes using the relationship
      if (relatedYmGtId) {
        try {
          
          // 🆕 NEW: Use the YM GT ID from the relationship instead of searching by stok_kodu
          const ymGtRecipeResponse = await fetchWithAuth(`${API_URLS.galYmGtRecete}?ym_gt_id=${relatedYmGtId}`);
          if (ymGtRecipeResponse && ymGtRecipeResponse.ok) {
            const ymGtRecipes = await ymGtRecipeResponse.json();
            
            // Store YM GT recipes from database exactly as they are
            ymGtRecipes.forEach(recipe => {
              if (recipe.bilesen_kodu && recipe.miktar !== null && recipe.miktar !== undefined) {
                // Special handling for Cinko: database stores as '150' but we display as '150 03'
                let displayCode = recipe.bilesen_kodu;
                if (recipe.bilesen_kodu === '150' && recipe.aciklama === 'Cinko Tuketim Miktari') {
                  displayCode = '150 03';
                }
                
                updatedAllRecipes.ymGtRecipe[displayCode] = parseFloat(recipe.miktar);
                updatedRecipeStatus.ymGtRecipe[displayCode] = 'database';
              }
            });
          } else {
          }
        } catch (ymGtError) {
          console.error('❌ Error loading YM GT recipes:', ymGtError);
        }
      } else {
        
        // Generate YM GT data first
        generateYmGtData();
        
        // Only calculate YM GT recipes if NO database recipes exist
        if (loadedYmSts.length > 0) {
          const mainYmSt = loadedYmSts[mainYmStIndex] || loadedYmSts[0];
          
          // Simply set the main YM ST relationship - calculations will be done later if needed
          const ymGtRecipeValues = {
            [mainYmSt.stok_kodu]: 1 // Ana hammadde - other recipes should come from database
          };
          
          // Set the calculated values
          Object.entries(ymGtRecipeValues).forEach(([code, value]) => {
            if (value > 0) {
              updatedAllRecipes.ymGtRecipe[code] = value;
              updatedRecipeStatus.ymGtRecipe[code] = 'auto';
            }
          });
          
        }
      }
      
      // 2C. Load YM ST recipes for each loaded YM ST
      for (let i = 0; i < loadedYmSts.length; i++) {
        const ymSt = loadedYmSts[i];
        try {
          const ymStRecipeResponse = await fetchWithAuth(`${API_URLS.galYmStRecete}?ym_st_id=${ymSt.id}`);
          if (ymStRecipeResponse && ymStRecipeResponse.ok) {
            const ymStRecipes = await ymStRecipeResponse.json();
            
            // Initialize recipe object for this YM ST
            updatedAllRecipes.ymStRecipes[i] = {};
            updatedRecipeStatus.ymStRecipes[i] = {};
            
            // Store each recipe
            ymStRecipes.forEach(recipe => {
              if (recipe.bilesen_kodu && recipe.miktar !== null && recipe.miktar !== undefined) {
                // Special handling for Cinko: database stores as '150' but we display as '150 03'
                let displayCode = recipe.bilesen_kodu;
                if (recipe.bilesen_kodu === '150' && recipe.aciklama === 'Cinko Tuketim Miktari') {
                  displayCode = '150 03';
                }
                
                updatedAllRecipes.ymStRecipes[i][displayCode] = parseFloat(recipe.miktar);
                updatedRecipeStatus.ymStRecipes[i][displayCode] = 'database';
              }
            });
          } else {
          }
        } catch (ymStRecipeError) {
          console.error(`Error loading recipes for YM ST ${ymSt.stok_kodu}:`, ymStRecipeError);
        }
      }
      
      // 🔄 STEP 3: Update all states
      setAllRecipes(updatedAllRecipes);
      setRecipeStatus(updatedRecipeStatus);
      
      // Load existing YM GT data if available, otherwise generate it
      if (relatedYmGtId) {
        try {
          const ymGtResponse = await fetchWithAuth(`${API_URLS.galYmGt}?id=${relatedYmGtId}`);
          if (ymGtResponse && ymGtResponse.ok) {
            const ymGtData = await ymGtResponse.json();
            const ymGt = Array.isArray(ymGtData) ? ymGtData[0] : ymGtData;
            if (ymGt) {
              setYmGtData({
                stok_kodu: ymGt.stok_kodu,
                stok_adi: ymGt.stok_adi,
                cap: ymGt.cap ? normalizeDecimalDisplay(ymGt.cap) : '',
                kod_2: ymGt.kod_2 || 'NIT',
                kaplama: ymGt.kaplama ? normalizeDecimalDisplay(ymGt.kaplama) : '',
                min_mukavemet: ymGt.min_mukavemet ? normalizeDecimalDisplay(ymGt.min_mukavemet) : '',
                max_mukavemet: ymGt.max_mukavemet ? normalizeDecimalDisplay(ymGt.max_mukavemet) : '',
                kg: ymGt.kg ? normalizeDecimalDisplay(ymGt.kg) : '',
                ic_cap: ymGt.ic_cap || 45,
                dis_cap: ymGt.dis_cap || 75,
                tolerans_plus: ymGt.tolerans_plus ? normalizeDecimalDisplay(ymGt.tolerans_plus) : '',
                tolerans_minus: ymGt.tolerans_minus ? normalizeDecimalDisplay(ymGt.tolerans_minus) : '',
                shrink: ymGt.shrink || 'evet',
                unwinding: ymGt.unwinding || ''
              });
            }
          } else {
            generateYmGtData();
          }
        } catch (error) {
          console.error('❌ Error loading YM GT:', error);
          generateYmGtData();
        }
      } else {
        generateYmGtData();
      }
      
      // Move to summary step
      setShowExistingMmGtModal(false);
      setCurrentStep('summary');
      
        mmGtRecipes: Object.keys(updatedAllRecipes.mmGtRecipes).length,
        ymGtRecipe: Object.keys(updatedAllRecipes.ymGtRecipe).length,
        ymStRecipes: Object.keys(updatedAllRecipes.ymStRecipes).length
      });
      
      // Show success message
      toast.success(`Mevcut urun yuklendi: ${loadedYmSts.length} YM ST ve tum receteler getirildi`);
      
    } catch (error) {
      console.error('❌ Error in handleSelectExistingMmGt:', error);
      toast.error('Mevcut urun verileri yuklenirken hata olustu: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // YM GT verilerini otomatik olustur
  const generateYmGtData = () => {
    if (!mmGtData.cap) return;
    
    // Cap formatini duzelt: 2.50 -> 0250 (tam 4 karakter)
    const capValue = parseFloat(mmGtData.cap);
    const capFormatted = Math.round(capValue * 100).toString().padStart(4, '0');
    const sequence = processSequence || '00'; // Use processSequence state instead of hardcoded '00'
    
    const ymGt = {
      stok_kodu: `YM.GT.${mmGtData.kod_2}.${capFormatted}.${sequence}`,
      stok_adi: `YM Galvanizli Tel ${capValue.toFixed(2)} mm -${Math.abs(parseFloat(mmGtData.tolerans_minus || 0)).toFixed(2)}/+${parseFloat(mmGtData.tolerans_plus || 0).toFixed(2)} ${mmGtData.kaplama || '0'} gr/m²${mmGtData.min_mukavemet || '0'}-${mmGtData.max_mukavemet || '0'} MPa ID:${mmGtData.ic_cap || '45'} cm OD:${mmGtData.dis_cap || '75'} cm ${mmGtData.kg || '0'} kg`,
      cap: capValue,
      kod_2: mmGtData.kod_2,
      kaplama: parseInt(mmGtData.kaplama) || 0,
      min_mukavemet: parseInt(mmGtData.min_mukavemet) || 0,
      max_mukavemet: parseInt(mmGtData.max_mukavemet) || 0,
      kg: parseInt(mmGtData.kg) || 0,
      ic_cap: mmGtData.ic_cap,
      dis_cap: mmGtData.dis_cap,
      tolerans_plus: parseFloat(mmGtData.tolerans_plus) || 0,
      tolerans_minus: parseFloat(mmGtData.tolerans_minus) || 0,
      shrink: mmGtData.shrink,
      unwinding: mmGtData.unwinding
    };
    
    setYmGtData(ymGt);
  };

  // Uygun YM ST'leri bul - yeniden arama yapma fonksiyonu
  const findSuitableYmSts = async () => {
    try {
      setIsLoading(true);
      const response = await fetchWithAuth(API_URLS.galYmSt);
      if (response && response.ok) {
        const allYmSts = await response.json();
        const cap = parseFloat(mmGtData.cap) || 0;
        let filtered = [];
        
        if (Array.isArray(allYmSts)) {
          // Once tam eslesme olup olmadigini kontrol et
          const exactMatch = allYmSts.find(ymSt => {
            const ymStCap = parseFloat(ymSt.cap) || 0;
            return Math.abs(ymStCap - cap) < 0.01; // Tam eslesme icin tolerance
          });
          
          if (exactMatch) {
            filtered.push(exactMatch);
          }
          
          // Ardindan genis aralikta filtrele
          if (mmGtData.kod_2 === 'PAD') {
            // PAD icin cap araligi kriterlerine gore filtrele
            if (cap >= 0.12 && cap <= 0.14) {
              const rangeFilter = allYmSts.filter(ymSt => {
                const ymStCap = parseFloat(ymSt.cap) || 0;
                return ymStCap >= 0.12 && ymStCap <= 0.14 && !filtered.includes(ymSt);
              });
              filtered = [...filtered, ...rangeFilter];
            } else if (cap >= 0.15 && cap <= 2.55) {
              const rangeFilter = allYmSts.filter(ymSt => {
                const ymStCap = parseFloat(ymSt.cap) || 0;
                return ymStCap >= 0.15 && ymStCap <= 2.55 && !filtered.includes(ymSt);
              });
              filtered = [...filtered, ...rangeFilter];
            } else if (cap >= 2.60 && cap <= 4.25) {
              const rangeFilter = allYmSts.filter(ymSt => {
                const ymStCap = parseFloat(ymSt.cap) || 0;
                return ymStCap >= 2.60 && ymStCap <= 4.25 && !filtered.includes(ymSt);
              });
              filtered = [...filtered, ...rangeFilter];
            } else if (cap >= 4.30 && cap <= 5.90) {
              const rangeFilter = allYmSts.filter(ymSt => {
                const ymStCap = parseFloat(ymSt.cap) || 0;
                return ymStCap >= 4.30 && ymStCap <= 5.90 && !filtered.includes(ymSt);
              });
              filtered = [...filtered, ...rangeFilter];
            } else if (cap >= 6.00 && cap <= 7.00) {
              const rangeFilter = allYmSts.filter(ymSt => {
                const ymStCap = parseFloat(ymSt.cap) || 0;
                return ymStCap >= 6.00 && ymStCap <= 7.00 && !filtered.includes(ymSt);
              });
              filtered = [...filtered, ...rangeFilter];
            } else if (cap >= 7.30 && cap <= 7.40) {
              const rangeFilter = allYmSts.filter(ymSt => {
                const ymStCap = parseFloat(ymSt.cap) || 0;
                return ymStCap >= 7.30 && ymStCap <= 7.40 && !filtered.includes(ymSt);
              });
              filtered = [...filtered, ...rangeFilter];
            } else if (cap >= 7.70 && cap <= 8.00) {
              const rangeFilter = allYmSts.filter(ymSt => {
                const ymStCap = parseFloat(ymSt.cap) || 0;
                return ymStCap >= 7.70 && ymStCap <= 8.00 && !filtered.includes(ymSt);
              });
              filtered = [...filtered, ...rangeFilter];
            }
          } else if (mmGtData.kod_2 === 'NIT') {
            // NIT icin hesaplanan cap araligina gore filtrele (prompt'ta belirtilen formullerle)
            const minYmStCap = cap * 0.935; // %6.5 azalma
            const maxYmStCap = cap * 0.995; // %0.5 azalma
            const rangeFilter = allYmSts.filter(ymSt => {
              const ymStCap = parseFloat(ymSt.cap) || 0;
              return ymStCap >= minYmStCap && ymStCap <= maxYmStCap && !filtered.includes(ymSt);
            });
            filtered = [...filtered, ...rangeFilter];
          }
          
          // En yakin 5 urunle sinirla
          filtered = filtered.slice(0, 5);
        }
        
        setSuitableYmSts(filtered);
      }
    } catch (error) {
      console.error('YM ST listesi getirilirken hata:', error);
      toast.error('YM ST listesi getirilemedi');
    } finally {
      setIsLoading(false);
    }
  };

  // Otomatik YM ST olustur - kaplama degerine gore cap azaltmasi yaparak
  const generateAutoYmSts = async () => {
    const cap = parseFloat(mmGtData.cap) || 0;
    const kaplama = parseInt(mmGtData.kaplama) || 0;
    const kodType = mmGtData.kod_2; // 'PAD' or 'NIT'
    
    // Calculate cap reduction based on kaplama value
    // Decrease by 0.01mm for each 35gr of kaplama
    // Round to 2 decimal places for precise control over the output value
    const capReductionFactor = Math.round((kaplama / 35) * 0.01 * 100) / 100;
    
    // Calculate the base cap (apply kaplama-based reduction)
    // Same calculation for both PAD and NIT - reduce cap by the kaplama factor
    // Round to 2 decimal places to ensure we get values like 2.48 not 2.4774
    const baseAdjustedCap = Math.round((cap - capReductionFactor) * 100) / 100;
    const safeAdjustedCap = Math.max(baseAdjustedCap, 0.1); // Minimum 0.1mm
    
    // No need for additional toFixed formatting since we already rounded to 2 decimals
    const filmasinCap = getFilmasinForCap(safeAdjustedCap);
    const quality = getQualityForCap(safeAdjustedCap);
    
    
    // Calculate the stok_kodlar for auto-generated YM STs
    const capStr1 = Math.round(safeAdjustedCap * 100).toString().padStart(4, '0');
    const alternativeCap = Math.round((safeAdjustedCap - 0.01) * 100) / 100;
    const safeAlternativeCap = Math.max(alternativeCap, 0.1); // Minimum 0.1mm
    const capStr2 = Math.round(safeAlternativeCap * 100).toString().padStart(4, '0');
    
    const stokKodu1 = `YM.ST.${capStr1}.${filmasinCap}.${quality}`;
    const stokKodu2 = `YM.ST.${capStr2}.${filmasinCap}.${quality}`;
    
    try {
      // Check if these YM STs already exist in database
      const existingYmSt1 = await checkExistingProduct(API_URLS.galYmSt, stokKodu1);
      const existingYmSt2 = await checkExistingProduct(API_URLS.galYmSt, stokKodu2);
      
      const existingYmSts = [];
      if (existingYmSt1) existingYmSts.push(existingYmSt1);
      if (existingYmSt2) existingYmSts.push(existingYmSt2);
      
      if (existingYmSts.length > 0) {
        // Show professional modal asking user what to do
        setExistingYmStsForModal(existingYmSts);
        setShowYmStExistsModal(true);
        return;
      }
    } catch (error) {
      console.error('Error checking existing YM STs:', error);
      // Continue with auto-generation if check fails
    }
    
    // If no existing YM STs found, proceed with auto-generation
    const autoYmSts = [];
    
    // Ilk YM ST
    autoYmSts.push({
      stok_kodu: stokKodu1,
      stok_adi: `YM Siyah Tel ${safeAdjustedCap.toFixed(2)} mm HM:${filmasinCap}.${quality}`,
      cap: safeAdjustedCap,
      filmasin: parseInt(filmasinCap),
      quality: quality,
      kaplama: kaplama, // Add coating property for proper differentiation
      source: 'auto-generated'
    });
    
    // Ikinci YM ST - bir tik daha azaltilmis (0.01mm daha az)
    autoYmSts.push({
      stok_kodu: stokKodu2,
      stok_adi: `YM Siyah Tel ${safeAlternativeCap.toFixed(2)} mm HM:${filmasinCap}.${quality}`,
      cap: safeAlternativeCap,
      filmasin: parseInt(filmasinCap),
      quality: quality,
      kaplama: kaplama, // Add coating property for proper differentiation
      source: 'auto-generated'
    });
    
    setAutoGeneratedYmSts(autoYmSts);
    
    // If this is the first time we're adding YMSTs and there are none selected yet,
    // auto-set the first auto-generated YMST as the main one
    const totalYmSts = selectedYmSts.length + autoYmSts.length;
    if (totalYmSts > 0 && selectedYmSts.length === 0 && autoYmSts.length > 0) {
      setMainYmStIndex(0);
    }
    
    // Otomatik olusturulan YM ST'ler icin receteleri hesapla
    setTimeout(() => {
      calculateAutoRecipeValues();
    }, 100);
  };

  // Cap degerine gore filmasin sec
  const getFilmasinForCap = (cap) => {
    // NEW RULE: For YM ST diameters ≤ 2mm, use 6mm filmasin
    if (cap <= 2.00) return '0600';  // 6.00mm for all diameters up to 2.00mm
    
    // Original logic for larger diameters
    // Filmasin diameter must be HIGHER than YMST cap for production logic
    // FLM gets thinner during production to create YMST, then galvanized to create YMGT
    if (cap <= 4.50) return '0600';  // 6.00mm → 2.01-4.50mm
    if (cap <= 4.49) return '0600';  // 6.00mm → 2.00-4.49mm (1008 quality)
    if (cap <= 6.10) return '0700';  // 7.00mm → 4.50-6.10mm
    if (cap <= 6.90) return '0800';  // 8.00mm → 5.50-6.90mm
    if (cap <= 7.50) return '0900';  // 9.00mm → 7.00-7.50mm
    return '1000';  // 10.00mm for higher diameters
  };

  // Cap degerine gore kalite sec - matches filmasin production ranges
  const getQualityForCap = (cap) => {
    // NEW RULE: For YM ST diameters ≤ 2mm, use 1006 quality with 6mm filmasin
    if (cap <= 2.00) return '1006';  // 6.00mm 1006 for all diameters up to 2.00mm
    
    // Original logic for larger diameters
    if (cap <= 4.50) return '1006';  // 6.00mm 1006 → 2.01-4.50mm
    if (cap <= 4.49) return '1008';  // 6.00mm 1008 → 2.00-4.49mm
    if (cap <= 6.10) return '1008';  // 7.00mm 1008 → 4.50-6.10mm
    if (cap <= 6.10) return '1010';  // 7.00mm 1010 → 3.50-6.10mm (alternative)
    if (cap <= 6.90) return '1010';  // 8.00mm 1010 → 5.50-6.90mm
    if (cap <= 7.50) return '1010';  // 9.00mm 1010 → 7.00-7.50mm
    return '1010';  // Default for higher ranges
  };

  // Handle YMST exists modal actions
  const handleUseExistingYmSts = async () => {
    try {
      // Use existing YM STs with their saved values
      const selectedExisting = existingYmStsForModal.map(ym => ({
        ...ym,
        source: 'database'
      }));
      
      // Clear auto-generated since we're using existing
      setAutoGeneratedYmSts([]);
      
      // Store the previous length to calculate correct indices later
      const prevSelectedLength = selectedYmSts.length;
      const currentAllRecipes = allRecipes;
      const currentRecipeStatus = recipeStatus;
      
      // Add to selected YM STs
      setSelectedYmSts(prev => {
        const newSelection = [...prev, ...selectedExisting];
        
        // Set main YM ST index if this is the first selection
        if (prev.length === 0 && selectedExisting.length > 0) {
          setMainYmStIndex(0);
        }
        
        return newSelection;
      });
      
      // Close modal immediately
      setShowYmStExistsModal(false);
      setExistingYmStsForModal([]);
      
      // Wait for state to update then load recipe data properly
      setTimeout(async () => {
        // Now the selectedYmSts state has been updated, so we can load recipes correctly
        // Create a modified version of loadExistingRecipeData logic that uses correct indices
        const updatedAllRecipes = { ...currentAllRecipes };
        const updatedRecipeStatus = { ...currentRecipeStatus };
        
        for (let i = 0; i < selectedExisting.length; i++) {
          const ymSt = selectedExisting[i];
          const correctIndex = prevSelectedLength + i; // Calculate the correct index
          
          if (ymSt.id) {
            try {
              // Fetch existing recipes for this YM ST
              const recipeResponse = await fetchWithAuth(`${API_URLS.galYmStRecete}?ym_st_id=${ymSt.id}`);
              if (recipeResponse && recipeResponse.ok) {
                const recipes = await recipeResponse.json();
                
                if (recipes && recipes.length > 0) {
                  // Initialize recipe object for this YM ST at the correct index
                  if (!updatedAllRecipes.ymStRecipes[correctIndex]) {
                    updatedAllRecipes.ymStRecipes[correctIndex] = {};
                  }
                  if (!updatedRecipeStatus.ymStRecipes[correctIndex]) {
                    updatedRecipeStatus.ymStRecipes[correctIndex] = {};
                  }
                  
                  recipes.forEach(recipe => {
                    if (recipe.bilesen_kodu && recipe.miktar !== null && recipe.miktar !== undefined) {
                      // Store the recipe value
                      updatedAllRecipes.ymStRecipes[correctIndex][recipe.bilesen_kodu] = parseFloat(recipe.miktar);
                      updatedRecipeStatus.ymStRecipes[correctIndex][recipe.bilesen_kodu] = 'database';
                    }
                  });
                  
                }
              }
            } catch (error) {
              console.error(`Error loading recipe for YM ST ${ymSt.stok_kodu}:`, error);
            }
          }
        }
        
        // Now check if these YM STs have relationships with MM GT and YM GT
        // and load their recipes as well
        for (let i = 0; i < selectedExisting.length; i++) {
          const ymSt = selectedExisting[i];
          if (ymSt.id) {
            try {
              // Find relationships for this YM ST
              const relationResponse = await fetchWithAuth(`${API_URLS.galMmGtYmSt}?ym_st_id=${ymSt.id}`);
              if (relationResponse && relationResponse.ok) {
                const relations = await relationResponse.json();
                
                if (relations && relations.length > 0) {
                  // Found relationships - load MM GT and YM GT recipes
                  for (const relation of relations) {
                    const ymStIndex = prevSelectedLength + i;
                    
                    // Load MM GT recipes if relation has mm_gt_id
                    if (relation.mm_gt_id) {
                      const mmGtRecipeResponse = await fetchWithAuth(`${API_URLS.galMmGtRecete}?mm_gt_id=${relation.mm_gt_id}`);
                      if (mmGtRecipeResponse && mmGtRecipeResponse.ok) {
                        const mmGtRecipes = await mmGtRecipeResponse.json();
                        
                        if (!updatedAllRecipes.mmGtRecipes[ymStIndex]) {
                          updatedAllRecipes.mmGtRecipes[ymStIndex] = {};
                        }
                        if (!updatedRecipeStatus.mmGtRecipes[ymStIndex]) {
                          updatedRecipeStatus.mmGtRecipes[ymStIndex] = {};
                        }
                        
                        mmGtRecipes.forEach(recipe => {
                          if (recipe.bilesen_kodu && recipe.miktar !== null) {
                            updatedAllRecipes.mmGtRecipes[ymStIndex][recipe.bilesen_kodu] = parseFloat(recipe.miktar);
                            updatedRecipeStatus.mmGtRecipes[ymStIndex][recipe.bilesen_kodu] = 'database';
                          }
                        });
                        
                      }
                    }
                    
                    // Load YM GT recipes if relation has ym_gt_id
                    if (relation.ym_gt_id) {
                      const ymGtRecipeResponse = await fetchWithAuth(`${API_URLS.galYmGtRecete}?ym_gt_id=${relation.ym_gt_id}`);
                      if (ymGtRecipeResponse && ymGtRecipeResponse.ok) {
                        const ymGtRecipes = await ymGtRecipeResponse.json();
                        
                        if (!updatedAllRecipes.ymGtRecipe) {
                          updatedAllRecipes.ymGtRecipe = {};
                        }
                        if (!updatedRecipeStatus.ymGtRecipe) {
                          updatedRecipeStatus.ymGtRecipe = {};
                        }
                        
                        ymGtRecipes.forEach(recipe => {
                          if (recipe.bilesen_kodu && recipe.miktar !== null) {
                            updatedAllRecipes.ymGtRecipe[recipe.bilesen_kodu] = parseFloat(recipe.miktar);
                            updatedRecipeStatus.ymGtRecipe[recipe.bilesen_kodu] = 'database';
                          }
                        });
                        
                      }
                    }
                    
                    // Only process the first relationship (main relationship)
                    break;
                  }
                }
              }
            } catch (error) {
              console.error(`Error loading relationships for YM ST ${ymSt.stok_kodu}:`, error);
            }
          }
        }
        
        // Update the state with loaded recipes
        setAllRecipes(updatedAllRecipes);
        setRecipeStatus(updatedRecipeStatus);
        
        // Switch to the first newly added YM ST tab
        if (selectedExisting.length > 0) {
          setActiveRecipeTab(prevSelectedLength);
        }
        
        // Trigger recipe calculation
        setTimeout(() => {
          calculateAutoRecipeValues();
        }, 100);
        
        toast.success(`${selectedExisting.length} mevcut YM ST secildi ve tum recete verileri yuklendi`);
      }, 100);
      
    } catch (error) {
      console.error('Error using existing YM STs:', error);
      toast.error('Mevcut YM ST\'ler secilirken hata olustu');
    }
  };
  
  const handleGoToYmStSelection = () => {
    setShowYmStExistsModal(false);
    setExistingYmStsForModal([]);
    setShowYmStSelectionModal(true);
  };
  
  // Load existing recipe data for selected YM STs
  const loadExistingRecipeData = async (ymSts) => {
    try {
      const updatedAllRecipes = { ...allRecipes };
      const updatedRecipeStatus = { ...recipeStatus };
      
      // Get the current total YM STs to find the correct indices
      const currentTotalYmSts = [...selectedYmSts, ...autoGeneratedYmSts];
      
      for (let i = 0; i < ymSts.length; i++) {
        const ymSt = ymSts[i];
        
        // Find the index of this YM ST in the combined array
        const ymStIndex = currentTotalYmSts.findIndex(st => st.stok_kodu === ymSt.stok_kodu);
        
        if (ymSt.id && ymStIndex !== -1) {
          // Fetch existing recipes for this YM ST
          const recipeResponse = await fetchWithAuth(`${API_URLS.galYmStRecete}?ym_st_id=${ymSt.id}`);
          if (recipeResponse && recipeResponse.ok) {
            const recipes = await recipeResponse.json();
            
            if (recipes && recipes.length > 0) {
              // Initialize recipe object for this YM ST at the correct index
              if (!updatedAllRecipes.ymStRecipes[ymStIndex]) {
                updatedAllRecipes.ymStRecipes[ymStIndex] = {};
              }
              if (!updatedRecipeStatus.ymStRecipes[ymStIndex]) {
                updatedRecipeStatus.ymStRecipes[ymStIndex] = {};
              }
              
              recipes.forEach(recipe => {
                if (recipe.bilesen_kodu && recipe.miktar !== null && recipe.miktar !== undefined) {
                  // Store the recipe value
                  updatedAllRecipes.ymStRecipes[ymStIndex][recipe.bilesen_kodu] = parseFloat(recipe.miktar);
                  updatedRecipeStatus.ymStRecipes[ymStIndex][recipe.bilesen_kodu] = 'database';
                }
              });
              
            }
          }
        }
      }
      
      // Update the state with loaded recipes
      setAllRecipes(updatedAllRecipes);
      setRecipeStatus(updatedRecipeStatus);
      
      // Trigger recipe calculation to populate other fields
      setTimeout(() => {
        calculateAutoRecipeValues();
      }, 100);
      
    } catch (error) {
      console.error('Error loading existing recipe data:', error);
      toast.error('Recete verileri yuklenirken hata olustu');
    }
  };

  // Formul dogrulama fonksiyonu - Giris degerlerini kontrol et
  const validateCalculationInputs = () => {
    const errors = [];
    if (!userInputValues.ash || userInputValues.ash <= 0) errors.push('Kul (Ash) degeri gecersiz');
    if (!userInputValues.lapa || userInputValues.lapa <= 0) errors.push('Lapa degeri gecersiz');
    if (!userInputValues.paketlemeDkAdet || userInputValues.paketlemeDkAdet <= 0) errors.push('Paketleme Dk. Adet degeri gecersiz');
    if (!mmGtData.kg || parseFloat(mmGtData.kg) <= 0) errors.push('Agirlik degeri gecersiz');
    if (!mmGtData.cap || parseFloat(mmGtData.cap) <= 0) errors.push('Cap degeri gecersiz');
    return errors;
  };

  // Guvenli hesaplama fonksiyonu - Hata durumunda bos deger dondur
  const safeCalculate = (formula, fallbackValue, inputs, formulaName) => {
    try {
      const result = formula(inputs);
      if (isNaN(result) || !isFinite(result)) {
        console.warn(`${formulaName} formulu gecersiz sonuc verdi, bos birakiliyor`);
        return '';
      }
      return result;
    } catch (error) {
      console.error(`${formulaName} formul hatasi: ${error.message}, bos birakiliyor`);
      return '';
    }
  };

  // Formul hesaplama debug fonksiyonu
  const debugFormula = (name, inputs, result, steps = []) => {
    if (process.env.NODE_ENV === 'development') {
      console.group(`${name} Hesaplamasi`);
      // if (steps.length > 0) console.log('Adimlar:', steps);
      console.groupEnd();
    }
  };

  // Otomatik recete degerlerini hesapla - NOKTA kullan ve gelistirilmis hata kontrolu ile
  const calculateAutoRecipeValues = () => {
    // When viewing existing product, we still need to calculate values for newly added YM STs
    // Remove the early return to allow calculations for new items
    
    // Giris degerlerini dogrula
    const validationErrors = validateCalculationInputs();
    if (validationErrors.length > 0) {
      console.error('Hesaplama giris degerleri hatasi:', validationErrors);
      toast.error(`Hesaplama hatasi: ${validationErrors[0]}`);
      return;
    }
    
    // DUZELTME: mmGtSequence degiskenini tanimla
    const sequence = '00'; // Default sequence
    
    const cap = parseFloat(mmGtData.cap) || 0;
    const kg = parseFloat(mmGtData.kg) || 0;
    const kaplama = parseInt(mmGtData.kaplama) || 0;
    
    // Create copies of arrays to avoid direct state mutation
    const updatedSelectedYmSts = [...selectedYmSts];
    const updatedAutoGeneratedYmSts = [...autoGeneratedYmSts];
    const allYmSts = [...updatedSelectedYmSts, ...updatedAutoGeneratedYmSts];
    
    // Tum YM ST'ler icin receteler hesapla
    const newMmGtRecipes = {};
    const newYmStRecipes = {};
    let newYmGtRecipe = {};
    
    // Recete durumlarini guncelle
    const newRecipeStatus = {
      mmGtRecipes: {},
      ymGtRecipe: {},
      ymStRecipes: {}
    };
    
    // Her YM ST icin sequence deger hesapla
    allYmSts.forEach((ymSt, index) => {
      const sequence = index.toString().padStart(2, '0');
      const capFormatted = Math.round(cap * 100).toString().padStart(4, '0');
      
      // MM GT Recete - her MM GT icin
      // DUZELTME: YMGT kod olustur - sequence parametresini kullan
      let correctYmGtStokKodu = `YM.GT.${mmGtData.kod_2}.${capFormatted}.${sequence}`;
      
      // Otomatik Doldur: Shrink tipi ve miktarini otomatik belirle (Ic Cap'a gore)
      const shrinkCode = getShrinkCode(mmGtData.ic_cap);
      const shrinkAmount = calculateShrinkAmount(kg);
      
      // We'll calculate values without modifying the YM ST objects directly
      // This avoids interfering with the selection functionality
      // The original objects will be preserved, just recipes will be calculated
      
      // Updated formulas with adjusted coefficients to match target values
      // Target analysis: 900kg coil should give ~0.0011 NAYLON, 0.0013 CEMBER, 0.0044 TOKA/HALKA, 0.0089 KARTON, 0.011 GTPKT01
      
      // NAYLON (KG/TON): =(1*(1000/'COIL WEIGHT (KG)'))/1000 - Original formula
      const naylonValue = parseFloat(((1 * (1000 / kg)) / 1000).toFixed(5));
      
      // AMB.APEX CEMBER 38X080: =(1.2*(1000/'COIL WEIGHT (KG)'))/1000
      const cemberValue = parseFloat(((1.2 * (1000 / kg)) / 1000).toFixed(5));
      
      // AMB.TOKA.SIGNODE.114P. DKP: =(4*(1000/'COIL WEIGHT (KG)'))/1000
      const tokaValue = parseFloat(((4.0 * (1000 / kg)) / 1000).toFixed(5));
      
      // SM.7MMHALKA: =(4*(1000/'COIL WEIGHT (KG)'))/1000
      const halkaValue = parseFloat(((4.0 * (1000 / kg)) / 1000).toFixed(5));
      
      // AMB.CEM.KARTON.GAL: =(8*(1000/'COIL WEIGHT (KG)'))/1000
      const kartonValue = parseFloat(((8.0 * (1000 / kg)) / 1000).toFixed(5));
      
      // GTPKT01: Keep formula but coefficients should now better match target ~0.011
      const gtpktValue = parseFloat(((1000 / kg * userInputValues.paketlemeDkAdet) / 1000).toFixed(5));
      
      // DUZELTME: SM.DESI.PAK = 0.1231* AMB.CEM.KARTON.GAL + 0.0154* NAYLON (referans formulune gore)
      // Onceki hata: shrinkAmount kullaniliyordu, dogrusu naylonValue olmali
      const desiValue = safeCalculate(
        () => 0.1231 * kartonValue + 0.0154 * naylonValue,
        0.002, // Varsayilan desi degeri
        { kartonValue, naylonValue },
        'SM.DESI.PAK'
      );
      
      // Debug bilgisi
      debugFormula('SM.DESI.PAK', 
        { kartonValue, naylonValue }, 
        desiValue,
        [`0.1231 * ${kartonValue} + 0.0154 * ${naylonValue} = ${desiValue}`]
      );
      
      // Hesaplama sonuclarini debug et
      debugFormula('NAYLON', { kg }, naylonValue, [`(1 * (1000/${kg}))/1000 = ${naylonValue}`]);
      debugFormula('KARTON', { kg }, kartonValue, [`(8 * (1000/${kg}))/1000 = ${kartonValue}`]);
      debugFormula('GTPKT01', { kg, paketleme: userInputValues.paketlemeDkAdet }, gtpktValue);
      
      newMmGtRecipes[index] = {
        [correctYmGtStokKodu]: 1, // YM GT bileseni - MMGT ile ayni sequence kullanilmali
        'GTPKT01': parseFloat(gtpktValue.toFixed(5)),
        // NAYLON removed - it's already represented by AMB.SHRINK codes
        'AMB.CEM.KARTON.GAL': parseFloat(kartonValue.toFixed(5)),
        [shrinkCode]: parseFloat(shrinkAmount.toFixed(5)), // Shrink ayri bilesen olarak
        'SM.7MMHALKA': parseFloat(halkaValue.toFixed(5)),
        'AMB.APEX CEMBER 38X080': parseFloat(cemberValue.toFixed(5)),
        'AMB.TOKA.SIGNODE.114P. DKP': parseFloat(tokaValue.toFixed(5)),
        'SM.DESI.PAK': parseFloat(desiValue.toFixed(5))
      };
      
      // Recete durumlarini 'auto' olarak isaretle
      newRecipeStatus.mmGtRecipes[index] = {};
      Object.keys(newMmGtRecipes[index]).forEach(key => {
        newRecipeStatus.mmGtRecipes[index][key] = 'auto';
      });
      
      // YM ST Recete - use existing ymStCap value
      // Get filmasin kodu using the already defined ymStCap
      // Update ymSt with appropriate filmasin and quality values if missing
      // This will be done inside getFilmasinKodu for auto-generated YM STs
      const filmasinKodu = getFilmasinKodu(ymSt);
      
      // Extract HM_Cap from filmasinKodu (e.g., "FLM.0800.1010" -> 8)
      const hmCapMatch = filmasinKodu.match(/FLM\.0*(\d+)\./);
      const hmCap = hmCapMatch ? parseFloat(hmCapMatch[1]) / 100 : 6; // Default to 6 if not found
      
      
      // Otomatik Doldur: YM ST Filmasin ve Kalite degerlerini otomatik sec (kullanici degistirebilir)
      // NOTE: getFilmasinKodu already updates ymSt.filmasin and ymSt.quality for ≤ 2mm diameters
      // But we still need to handle cases where they weren't set properly
      if (!ymSt.filmasin || !ymSt.quality || ymSt.source === 'auto-generated') {
        if (hmCapMatch) {
          // Filmasin Capi (HM_Cap) otomatik belirle
          ymSt.filmasin = parseInt(hmCapMatch[1]);
        }
        const qualityMatch = filmasinKodu.match(/\.(\d{4})$/);
        if (qualityMatch) {
          // Filmasin Kalitesi otomatik belirle
          ymSt.quality = qualityMatch[1];
        }
        
        // Auto-selected flag ekle - kullanicinin degistirebilecegini belirt
        ymSt.autoSelected = true;
      }
      
      // Calculate TLC_Hiz using the lookup table with the DUSEYARA formula
      // TLC_Hiz= =DUSEYARA(BIRLESTIR(HM_Cap;"x"; Cap);'TLC_Hizlar'!C:F;4;YANLIS)*0.7
      // IMPORTANT: Cap here is the final product diameter (MM GT cap), not YM ST cap!
      const tlcHiz = calculateTlcHiz(hmCap, cap);
      
      // Log raw inputs and intermediate values to help debug
      
          // TLC01 hesaplama - Referans formulune gore duzeltildi
      // GTPKT01 gibi kucuk degerler uretmemeli, referans formul buyuk degerler verir
      // Not: GTPKT01 = 0.02 (dakika/kg), TLC01 = 9.89 (dakika/kg) olmali
      
      // TLC_Hiz degeri kontrol et - 0.7 multiplier nedeniyle dusuk degerler normal
      // Calculate Cinko consumption for this specific YMST (regardless of TLC_Hiz)
      // Formula: ((1000*4000/3.14/7.85/'DIA (MM)'/'DIA (MM)'*'DIA (MM)'*3.14/1000*'ZING COATING (GR/M2)'/1000)+(Ash*0.6)+(Lapa*0.7))/1000
      // Reference formula uses MM GT diameter for all diameter references
      const ymStKaplama = parseFloat(ymSt.kaplama) || kaplama; // Use YMST coating if available
      
      // Use YM ST cap for zinc consumption calculation to get accurate material usage
      const ymStCap = parseFloat(ymSt.cap); // Each YM ST must use its own cap value
      const zincConsumption = parseFloat((
        ((1000 * 4000 / Math.PI / 7.85 / ymStCap / ymStCap * ymStCap * Math.PI / 1000 * ymStKaplama / 1000) + 
        (userInputValues.ash * 0.6) + 
        (userInputValues.lapa * 0.7)) / 1000
      ).toFixed(5));
      

      if (!tlcHiz || tlcHiz <= 0) {
        newYmStRecipes[index] = {
          [filmasinKodu]: 1, // Use the Filmasin code directly
          'TLC01': '' // Empty if no valid TLC_Hiz
        };
      } else {
        
        // TLC01 formulu
        // dk/ton -> dk/kg cevirimi icin 1000'e bol
        // Her YM ST kendi cap degerini kullansin
        const ymStCap = parseFloat(ymSt.cap);
        const tlc01Raw = (1000 * 4000 / Math.PI / 7.85 / ymStCap / ymStCap / tlcHiz / 60);
        const tlcValue = parseFloat((tlc01Raw / 1000).toFixed(5));
        
        
        // Cinko tuketimi hesapla
        // Cinko formulu
        const ymStKaplama = parseFloat(ymSt.kaplama) || kaplama;
        
        // YM ST cap ile cinko hesapla
        const zincConsumption = parseFloat((
          ((1000 * 4000 / Math.PI / 7.85 / ymStCap / ymStCap * ymStCap * Math.PI / 1000 * ymStKaplama / 1000) + 
          (userInputValues.ash * 0.6) + 
          (userInputValues.lapa * 0.7)) / 1000
        ).toFixed(5));
        

        newYmStRecipes[index] = {
          [filmasinKodu]: 1, // Use the Filmasin code directly
          'TLC01': tlcValue
        };
      }
      
      // YM ST recete durumlarini 'auto' olarak isaretle
      newRecipeStatus.ymStRecipes[index] = {};
      Object.keys(newYmStRecipes[index]).forEach(key => {
        newRecipeStatus.ymStRecipes[index][key] = 'auto';
      });
    });
    
    // YM GT Recete (sequence 00 icin)
    // Calculate YM GT recipe fields regardless of YM ST selection
    // This allows users to see calculated values even before selecting YM STs
    
    // Calculate DV (Durdurma Vinc) value based on Min Mukavemet
    const dvValue = calculateDV(parseInt(mmGtData.min_mukavemet));
    
    // GLV01:= =1000*4000/ Cap/ Cap /PI()/7.85/'DV'* Cap
    // Excel shows 126.7 dk/ton, we need dk/kg so divide by 1000
    // Original formula gives dk/ton, convert to dk/kg
    const glvTimeRaw = (1000 * 4000 / cap / cap / Math.PI / 7.85 / dvValue * cap);
    const glvTime = parseFloat((glvTimeRaw / 1000).toFixed(5)); // Convert dk/ton to dk/kg
    
    // SM.HIDROLIK.ASIT: =('YuzeyAlani'*'tuketilenAsit')/1000
    const yuzeyAlani = calculateYuzeyAlani(cap);
    const tuketilenAsit = calculateTuketilenAsit();
    const acidConsumption = parseFloat(((yuzeyAlani * tuketilenAsit) / 1000).toFixed(5));
    
    // 150 03(Cinko) : =((1000*4000/3.14/7.85/'DIA (MM)'/'DIA (MM)'*'DIA (MM)'*3.14/1000*'ZING COATING (GR/M2)'/1000)+('Ash'*0.6)+('Lapa'*0.7))/1000
    const zincConsumption = parseFloat((
      ((1000 * 4000 / Math.PI / 7.85 / cap / cap * cap * Math.PI / 1000 * kaplama / 1000) + 
      (userInputValues.ash * 0.6) + 
      (userInputValues.lapa * 0.7)) / 1000
    ).toFixed(5));
    
    
    if (allYmSts.length > 0) {
      // If YM STs are selected, include the first YM ST stok_kodu in the recipe
      const firstYmSt = allYmSts[0];
      if (!firstYmSt || !firstYmSt.stok_kodu) {
        console.error('HATA: Ilk YM ST eksik veya stok_kodu tanimsiz!', firstYmSt);
        toast.error('Ilk YM ST eksik veya stok_kodu tanimsiz! YM GT recetesi olusturulamadi.');
        return;
      }
      
      
      newYmGtRecipe = {
        [firstYmSt.stok_kodu]: 1, // Ilk YM ST component - use verified firstYmSt
        'GLV01': glvTime, // Galvanizleme operasyonu
        '150 03': zincConsumption, // Cinko Tuketim Miktari - restored to YM GT for correct Excel format
        'SM.HIDROLIK.ASIT': acidConsumption // Asit tuketimi
      };
    } else {
      // If no YM STs are selected, still calculate the other fields
      // This allows the user to see the calculated values for GLV01, Zinc, and Acid
      newYmGtRecipe = {
        'GLV01': glvTime, // Galvanizleme operasyonu
        '150 03': zincConsumption, // Cinko Tuketim Miktari
        'SM.HIDROLIK.ASIT': acidConsumption // Asit tuketimi
      };
    }
    
    
    // YM GT recete durumlarini 'auto' olarak isaretle
    Object.keys(newYmGtRecipe).forEach(key => {
      newRecipeStatus.ymGtRecipe[key] = 'auto';
    });
    
    // YM ST dizilerini direkt guncellemeiyoruz - secim sorunlarini onlemek icin
    // Sadece receteler guncellenecek, orijinal YM ST objeleri korunacak
    
    // Tum hesaplamalarin basarili oldugunu dogrula
    const totalCalculations = Object.keys(newMmGtRecipes).length + 
                             Object.keys(newYmGtRecipe).length + 
                             Object.keys(newYmStRecipes).length;
    
    if (totalCalculations > 0) {
      setAllRecipes(prev => {
        // Preserve existing database values and only update auto-calculated ones
        const mergedMmGtRecipes = { ...prev.mmGtRecipes };
        const mergedYmGtRecipe = { ...prev.ymGtRecipe };
        const mergedYmStRecipes = { ...prev.ymStRecipes };
        
        // Merge MM GT recipes - preserve database values
        Object.keys(newMmGtRecipes).forEach(index => {
          if (!mergedMmGtRecipes[index]) {
            mergedMmGtRecipes[index] = {};
          }
          Object.keys(newMmGtRecipes[index]).forEach(key => {
            // Only update if not from database
            if (!recipeStatus.mmGtRecipes[index]?.[key] || recipeStatus.mmGtRecipes[index][key] !== 'database') {
              mergedMmGtRecipes[index][key] = newMmGtRecipes[index][key];
            }
          });
        });
        
        // Merge YM GT recipe - preserve database values
        Object.keys(newYmGtRecipe).forEach(key => {
          // Only update if not from database
          if (!recipeStatus.ymGtRecipe[key] || recipeStatus.ymGtRecipe[key] !== 'database') {
            mergedYmGtRecipe[key] = newYmGtRecipe[key];
            if (key === '150 03') {
            }
          }
        });
        
        // Merge YM ST recipes - preserve database values
        Object.keys(newYmStRecipes).forEach(index => {
          if (!mergedYmStRecipes[index]) {
            mergedYmStRecipes[index] = {};
          }
          Object.keys(newYmStRecipes[index]).forEach(key => {
            // Only update if not from database
            if (!recipeStatus.ymStRecipes[index]?.[key] || recipeStatus.ymStRecipes[index][key] !== 'database') {
              mergedYmStRecipes[index][key] = newYmStRecipes[index][key];
            }
          });
        });
        
        return {
          ...prev,
          mmGtRecipes: mergedMmGtRecipes,
          ymGtRecipe: mergedYmGtRecipe,
          ymStRecipes: mergedYmStRecipes
        };
      });
      
      setRecipeStatus(prev => {
        // Merge status, preserving 'database' status
        const mergedStatus = { ...prev };
        
        // Update MM GT recipe status
        Object.keys(newRecipeStatus.mmGtRecipes).forEach(index => {
          if (!mergedStatus.mmGtRecipes[index]) {
            mergedStatus.mmGtRecipes[index] = {};
          }
          Object.keys(newRecipeStatus.mmGtRecipes[index]).forEach(key => {
            // Only update if not from database
            if (!prev.mmGtRecipes[index]?.[key] || prev.mmGtRecipes[index][key] !== 'database') {
              mergedStatus.mmGtRecipes[index][key] = newRecipeStatus.mmGtRecipes[index][key];
            }
          });
        });
        
        // Update YM GT recipe status
        Object.keys(newRecipeStatus.ymGtRecipe).forEach(key => {
          // Only update if not from database
          if (!prev.ymGtRecipe[key] || prev.ymGtRecipe[key] !== 'database') {
            mergedStatus.ymGtRecipe[key] = newRecipeStatus.ymGtRecipe[key];
          }
        });
        
        // Update YM ST recipe status
        Object.keys(newRecipeStatus.ymStRecipes).forEach(index => {
          if (!mergedStatus.ymStRecipes[index]) {
            mergedStatus.ymStRecipes[index] = {};
          }
          Object.keys(newRecipeStatus.ymStRecipes[index]).forEach(key => {
            // Only update if not from database
            if (!prev.ymStRecipes[index]?.[key] || prev.ymStRecipes[index][key] !== 'database') {
              mergedStatus.ymStRecipes[index][key] = newRecipeStatus.ymStRecipes[index][key];
            }
          });
        });
        
        return mergedStatus;
      });
      
      // Basarili hesaplama mesaji
      toast.success(`${totalCalculations} recete basariyla hesaplandi!`);
      
      // Hesaplama ozetini logla
      
      // Filmasin dropdown degerlerinin guncellendigini logla
    } else {
      console.warn('Hicbir recete hesaplanamadi - giris degerlerini kontrol edin');
      toast.warning('Recete hesaplamasi yapilamadi. Lutfen giris degerlerini kontrol edin.');
    }
  };

  // Fill empty fields with auto-fill indicators for all recipe types
  const fillEmptyFieldsWithAutoFill = () => {
    
    // Instead of using hardcoded defaults, calculate proper values
    calculateAutoRecipeValues(); // Calculate proper recipe values based on formulas
    
    // Mark all filled fields as 'auto' in recipe status
    setRecipeStatus(prev => {
      const updated = { ...prev };
      
      // Mark MM GT recipe fields as auto
      [...selectedYmSts, ...autoGeneratedYmSts].forEach((ymSt, index) => {
        if (!updated.mmGtRecipes[index]) {
          updated.mmGtRecipes[index] = {};
        }
        
        const mmGtFields = ['NAYLON', 'AMB.APEX CEMBER 38X080', 'AMB.TOKA.SIGNODE.114P. DKP', 
                           'SM.7MMHALKA', 'AMB.CEM.KARTON.GAL', 'GTPKT01', 'SM.DESI.PAK'];
        
        const shrinkCode = getShrinkCode(mmGtData.ic_cap);
        if (shrinkCode) {
          mmGtFields.push(shrinkCode);
        }
        
        mmGtFields.forEach(key => {
          if (!prev.mmGtRecipes[index]?.[key] || prev.mmGtRecipes[index][key] !== 'database') {
            updated.mmGtRecipes[index][key] = 'auto';
          }
        });
      });
      
      // Mark YM GT recipe fields as auto
      if (!updated.ymGtRecipe) {
        updated.ymGtRecipe = {};
      }
      
      ['GLV01', '150 03', 'SM.HIDROLIK.ASIT'].forEach(key => {
        if (!prev.ymGtRecipe[key] || prev.ymGtRecipe[key] !== 'database') {
          updated.ymGtRecipe[key] = 'auto';
        }
      });
      
      // Mark YM ST recipe fields as auto
      [...selectedYmSts, ...autoGeneratedYmSts].forEach((ymSt, index) => {
        if (!updated.ymStRecipes[index]) {
          updated.ymStRecipes[index] = {};
        }
        
        const filmasinCode = getFilmasinKodu(ymSt);
        [filmasinCode, 'TLC01'].forEach(key => {
          if (!prev.ymStRecipes[index]?.[key] || prev.ymStRecipes[index][key] !== 'database') {
            updated.ymStRecipes[index][key] = 'auto';
          }
        });
      });
      
      return updated;
    });
    
    toast.success('Bos alanlar otomatik degerlerle dolduruldu!');
  };

  // Shrink miktari hesapla - NOKTA deger dondur with 5 decimals - Excel ile tam uyumlu
  const calculateShrinkAmount = (kg) => {
    // Original NAYLON formula: (1*(1000/COIL WEIGHT))/1000
    // This gives kg/kg units (amount per kg of product)
    const result = (1 * (1000 / kg)) / 1000;
    return parseFloat(result.toFixed(5));
  };

  // Asit tuketimi hesaplama (Excel formulu) - NOKTA deger dondur with 5 decimals - Excel ile tam uyumlu
  const calculateAcidConsumption = (cap, kg, kaplama) => {
    const yuzeyAlani = 1000 * 4000 / Math.PI / cap / cap / 7.85 * cap * Math.PI / 1000;
    const tuketilenAsit = 0.0647625; // kg/m2 - match Excel formula exactly
    
    // Calculate with full precision, then format to 5 decimal places to match Excel
    const result = (yuzeyAlani * tuketilenAsit) / 1000;
    return parseFloat(result.toFixed(5));
  };

  // Desi tuketimi hesapla (formule gore) - NOKTA deger dondur with 5 decimals - Excel ile tam uyumlu
  const calculateDesiConsumption = (kg, cap) => {
    // Return values with 5 decimal places for consistency with Excel
    // Once kg kategorisine gore
    if (kg >= 500 && kg < 600) return 0.00200;
    if (kg >= 600 && kg < 650) return 0.00170;
    if (kg >= 650 && kg < 750) return 0.00150;
    if (kg >= 750 && kg <= 800) return 0.00130;
    if (kg > 800 && kg < 850) return 0.00120;
    if (kg >= 850 && kg < 900) return 0.00110;
    if (kg >= 900) return 0.00090;
    
    // Capa gore fallback
    if (cap < 2.0) return 0.00200;
    if (cap >= 2.0 && cap <= 4.0) return 0.00130;
    return 0.00110;
  };

  // Shrink kodu belirle (tam kod ile)
  const getShrinkCode = (icCap) => {
    switch (parseInt(icCap)) {
      case 45: return 'AMB.SHRINK.200*140CM';
      case 50: return 'AMB.SHRINK.200*160CM';
      case 55: return 'AMB.SHRINK.200*190CM';
      default: return 'AMB.SHRINK.200*140CM';
    }
  };

  // Gumruk Tarife Kodu belirle
  const getGumrukTarifeKodu = () => {
    const cap = parseFloat(mmGtData.cap) || 0;
    if (cap >= 0.8 && cap < 1.5) return '721720300011';
    if (cap >= 1.5 && cap < 6.0) return '721720300012';
    return '721720300013';
  };

  // Form degisikliklerini isle - her zaman nokta formati kullan
  // Comma to point conversion handler for onKeyDown
  const handleCommaToPoint = (e, field) => {
    // Allow decimal comma input but convert to point
    if (e.key === ',') {
      e.preventDefault();
      // Get current value and caret position
      const input = e.target;
      const currentValue = input.value;
      const caretPos = input.selectionStart;
      
      // Insert decimal point where the comma would have gone
      const newValue = currentValue.substring(0, caretPos) + '.' + currentValue.substring(input.selectionEnd);
      
      // Update input value and reset caret position
      handleInputChange(field, newValue);
      // Need to use setTimeout to let React update the DOM
      setTimeout(() => {
        input.selectionStart = input.selectionEnd = caretPos + 1;
      }, 0);
    }
    
    // Ensure periods can be entered anywhere in the input
    if (e.key === '.') {
      // Allow periods even if the field already has one
      // Do nothing special, let the default behavior proceed
    }
  };
  
  // Comma to point conversion handler for recipe inputs
  const handleRecipeCommaToPoint = (e, recipeType, ymStIndex, key) => {
    // Allow decimal comma input but convert to point
    if (e.key === ',') {
      e.preventDefault();
      // Get current value and caret position
      const input = e.target;
      const currentValue = input.value;
      const caretPos = input.selectionStart;
      
      // Insert decimal point where the comma would have gone
      const newValue = currentValue.substring(0, caretPos) + '.' + currentValue.substring(input.selectionEnd);
      
      // Update recipe value and reset caret position
      updateRecipeValue(recipeType, ymStIndex, key, newValue);
      // Need to use setTimeout to let React update the DOM
      setTimeout(() => {
        input.selectionStart = input.selectionEnd = caretPos + 1;
      }, 0);
    }
    
    // Ensure periods can be entered anywhere in the input
    if (e.key === '.') {
      // Check if the input already contains a period
      const input = e.target;
      const currentValue = input.value;
      
      // Allow periods even if the field already has one
      // This will let users enter periods anywhere, and validation will happen elsewhere
      // Do nothing special, let the default behavior proceed
    }
  };

  const handleInputChange = (field, value) => {
    // Key fields that affect stock code generation
    const keyFields = ['cap', 'kod_2', 'kaplama', 'min_mukavemet', 'max_mukavemet', 'kg'];
    
    // If a key field is being changed and we haven't saved to database yet, reset sequence
    if (keyFields.includes(field) && !savedToDatabase) {
      setProcessSequence('00');
    }
    
    // Enforce point as decimal separator for any input value
    let normalizedValue;
    
    // First ensure the value is trimmed
    const trimmedValue = typeof value === 'string' ? value.trim() : value;
    
    // Special case for decimal inputs - maintain exact format
    if (typeof trimmedValue === 'string' && trimmedValue.includes('.')) {
      // If the string contains a decimal point, preserve its format exactly
      setMmGtData(prev => ({
        ...prev,
        [field]: trimmedValue
      }));
      return;
    }
    
    if (typeof trimmedValue === 'string' && trimmedValue.includes(',')) {
      // If input contains comma, replace with point
      normalizedValue = trimmedValue.replace(/,/g, '.');
    } else {
      // Otherwise use the trimmed value or normalize if not a string
      normalizedValue = typeof trimmedValue === 'string' ? trimmedValue : normalizeInputValue(trimmedValue);
    }
    
    // For numeric fields, ensure we store with point decimal separator but keep as strings
    if (['cap', 'kaplama', 'min_mukavemet', 'max_mukavemet', 'kg', 'tolerans_plus', 'tolerans_minus'].includes(field)) {
      if (typeof normalizedValue === 'string' && normalizedValue !== '') {
        // Remove any commas first and replace with points to be sure
        const valueWithPoints = normalizedValue.replace(/,/g, '.');
        
        // If it's a valid number, ensure it uses point as decimal separator
        const num = parseFloat(valueWithPoints);
        if (!isNaN(num)) {
          // For decimal input, keep the decimal part as-is to preserve user input exactly as entered
          if (valueWithPoints.includes('.')) {
            // If user is typing a decimal number, keep their input exactly as is (with points)
            normalizedValue = valueWithPoints;
          } else {
            // For whole numbers, no decimal formatting needed
            normalizedValue = valueWithPoints;
          }
        }
      }
    }
    
    setMmGtData(prev => ({
      ...prev,
      [field]: normalizedValue
    }));
  };

  // Manuel YM ST ekleme isleyicisi
  const handleAddYmSt = () => {
    if (!newYmStData.cap || !newYmStData.filmasin || !newYmStData.quality) {
      toast.error('Lutfen tum alanlari doldurun');
      return;
    }
    
    const capValue = parseFloat(newYmStData.cap);
    const capStr = Math.round(capValue * 100).toString().padStart(4, '0');
    const newYmSt = {
      stok_kodu: `YM.ST.${capStr}.${newYmStData.filmasin}.${newYmStData.quality}`,
      stok_adi: `YM Siyah Tel ${capStr} mm HM:${newYmStData.filmasin}.${newYmStData.quality}`,
      cap: capValue,
      filmasin: parseInt(newYmStData.filmasin),
      quality: newYmStData.quality,
      source: 'manual-added'
    };
    
    setSelectedYmSts(prev => [...prev, newYmSt]);
    setShowAddYmStModal(false);
    setNewYmStData({ cap: '', filmasin: '', quality: '' });
    
    // Yeni eklenen YM ST icin receteleri hesapla
    setTimeout(() => {
      calculateAutoRecipeValues();
    }, 100);
  };

  // Comprehensive state reset function - used when switching between requests
  const resetApplicationState = () => {
    
    setYmGtData(null);
    setSuitableYmSts([]);
    setSelectedYmSts([]);
    setAutoGeneratedYmSts([]);
    setSavedToDatabase(false);
    setDatabaseIds({ mmGtIds: [], ymGtId: null, ymStIds: [] });
    setAllRecipes({ mmGtRecipes: {}, ymGtRecipe: {}, ymStRecipes: {} });
    setRecipeStatus({ mmGtRecipes: {}, ymGtRecipe: {}, ymStRecipes: {} });
    setActiveRecipeTab(0);
    setError(null);
    setSuccessMessage('');
    
    // Session tracking temizle
    setSessionSavedProducts({ mmGtIds: [], ymGtId: null, ymStIds: [] });
    
    // Additional state resets
    setMainYmStIndex(0);
    setShowDuplicateConfirmModal(false);
    setDuplicateProducts([]);
    setPendingSaveData(null);
    setShowProductConflictModal(false);
    setConflictProduct(null);
    setConflictType('');
    setShowYmStExistsModal(false);
    setExistingYmStsForModal([]);
    setProcessSequence('00');
    setIsInApprovalProcess(false);
    setIsViewingExistingProduct(false);
    
  };

  // Manuel girise geri don - tum state'i temizle
  const handleBackToManual = () => {
    toast.dismiss(); // Clear all toast messages when switching to manual input
    setCurrentStep('input');
    setSelectedRequest(null);
    setSelectedExistingMmGt(null);
    setIsRequestUsed(false); // Talep kullanim durumunu sifirla
    setIsEditingRequest(false);
    
    // Use the comprehensive reset function
    resetApplicationState();
    
    // Clear MM GT form data - reset to DEFAULT VALUES (same as initial page load)
    setMmGtData({
      cap: '2.50',           // Default cap value
      kod_2: 'NIT',          // Default to NIT not PAD
      kaplama: '50',         // Default kaplama value
      min_mukavemet: '350',  // Default min strength
      max_mukavemet: '550',  // Default max strength
      kg: '500',             // Default weight
      ic_cap: 45,            // Default inner diameter (number, not string)
      dis_cap: 75,           // Default outer diameter (number, not string)
      tolerans_plus: '0.05', // Default plus tolerance
      tolerans_minus: '0.06', // Default minus tolerance
      shrink: 'evet',        // Default shrink setting
      unwinding: '',         // Empty unwinding
      cast_kont: '',         // Empty cast control
      helix_kont: '',        // Empty helix control
      elongation: ''         // Empty elongation
    });
  };

  // Ileri butonu
  // Validation function for MM GT data with detailed error messages
  const validateMmGtData = () => {
    const errors = [];
    
    // Check required fields
    const requiredFields = {
      'cap': 'Cap',
      'kaplama': 'Kaplama Miktari',
      'min_mukavemet': 'Min Mukavemet',
      'max_mukavemet': 'Max Mukavemet',
      'kg': 'Agirlik'
    };
    
    Object.entries(requiredFields).forEach(([field, label]) => {
      if (!mmGtData[field]) {
        errors.push(`${label} alani zorunludur`);
      }
    });
    
    // If any required fields are missing, return early
    if (errors.length > 0) {
      return errors;
    }
    
    // Cap validation: 0.8 - 8 arasinda olmali
    const capValue = parseFloat(mmGtData.cap);
    if (isNaN(capValue)) {
      errors.push('Cap icin gecerli bir sayisal deger giriniz (0.8 ile 8 arasinda).');
    } else if (capValue < 0.8 || capValue > 8) {
      errors.push(`Cap degeri 0.8 ile 8 arasinda olmalidir. Girilen deger: ${mmGtData.cap}`);
    }
    
    // Kaplama validation: PAD icin 50, NIT icin 100-400 arasinda
    const kaplamaValue = parseFloat(mmGtData.kaplama);
    if (isNaN(kaplamaValue)) {
      errors.push('Kaplama icin gecerli bir sayisal deger giriniz.');
    } else {
      if (mmGtData.kod_2 === 'PAD' && kaplamaValue !== 50) {
        errors.push(`PAD kaplama turu icin kaplama degeri 50 olmalidir. Girilen deger: ${mmGtData.kaplama}`);
      } else if (mmGtData.kod_2 === 'NIT' && (kaplamaValue < 100 || kaplamaValue > 400)) {
        errors.push(`NIT kaplama turu icin kaplama degeri 100 ile 400 arasinda olmalidir. Girilen deger: ${mmGtData.kaplama}`);
      }
    }
    
    // Tolerans validation: 0 ile 0.10 arasinda
    if (mmGtData.tolerans_plus) {
      const toleransPlusValue = parseFloat(mmGtData.tolerans_plus);
      if (isNaN(toleransPlusValue)) {
        errors.push('Tolerans+ icin gecerli bir sayisal deger giriniz (0 ile 0.10 arasinda).');
      } else if (toleransPlusValue < 0 || toleransPlusValue > 0.10) {
        errors.push(`Tolerans+ degeri 0 ile 0.10 arasinda olmalidir. Girilen deger: ${mmGtData.tolerans_plus}`);
      }
    }
    
    if (mmGtData.tolerans_minus) {
      const toleransMinusValue = parseFloat(mmGtData.tolerans_minus);
      if (isNaN(toleransMinusValue)) {
        errors.push('Tolerans- icin gecerli bir sayisal deger giriniz (0 ile 0.10 arasinda).');
      } else if (toleransMinusValue < 0 || toleransMinusValue > 0.10) {
        errors.push(`Tolerans- degeri 0 ile 0.10 arasinda olmalidir. Girilen deger: ${mmGtData.tolerans_minus}`);
      }
    }
    
    // Agirlik validation: 250 ile 1250 arasinda
    const kgValue = parseFloat(mmGtData.kg);
    if (isNaN(kgValue)) {
      errors.push('Agirlik icin gecerli bir sayisal deger giriniz (250 ile 1250 arasinda).');
    } else if (kgValue < 250 || kgValue > 1250) {
      errors.push(`Agirlik degeri 250 ile 1250 arasinda olmalidir. Girilen deger: ${mmGtData.kg}`);
    }
    
    return errors;
  };
  
  const handleNext = async () => {
    // Validate all fields before proceeding
    const validationErrors = validateMmGtData();
    
    if (validationErrors.length > 0) {
      // Display validation errors
      setError(`Lutfen asagidaki hatalari duzeltiniz:\n\n${validationErrors.map(err => `• ${err}`).join('\n')}`);
      
      // Show toast notification
      toast.error('Formdaki hatalari duzeltiniz', { autoClose: 5000 });
      return;
    }
    
    // Clear any existing errors
    setError(null);
    
    // Check for duplicate product by stok_adi (functional duplicates regardless of sequence)
    try {
      setIsLoading(true);
      
      // Generate the stok_adi that would be created for comparison - use the same function
      const mmGtStokAdi = generateStokAdi();
      
      
      // Search ALL MM GT products to find functional duplicates by stok_adi
      const allProductsResponse = await fetchWithAuth(`${API_URLS.galMmGt}`);
      
      if (allProductsResponse && allProductsResponse.ok) {
        const allProducts = await allProductsResponse.json();
        
        if (allProducts.length > 0 && !isViewingExistingProduct) {
          // Find products with the same stok_adi (functional duplicates)
          
          const functionalDuplicates = allProducts.filter(product => {
            const isMatch = product.stok_adi === mmGtStokAdi;
            if (isMatch) {
            }
            return isMatch;
          });
          
          if (functionalDuplicates.length > 0) {
            // Found functional duplicate(s) with same specifications - show warning
            setDuplicateProducts(functionalDuplicates);
            setShowDuplicateConfirmModal(true);
            setIsLoading(false);
            return; // Don't proceed, wait for user decision
          } else {
            // Same stok_kodu but different stok_adi - this is allowed, continue with incremented sequence
          }
        }
      }
    } catch (error) {
      console.error('Error checking for duplicates:', error);
      // Continue anyway if duplicate check fails
    } finally {
      setIsLoading(false);
    }
    
    // Continue to next step
    setCurrentStep('summary');
    generateYmGtData();
    findSuitableYmSts();
    calculateAutoRecipeValues();
  };

  // YM ST secimi
  const handleYmStSelection = async (ymSt) => {
    const isSelected = selectedYmSts.find(item => item.stok_kodu === ymSt.stok_kodu);
    if (isSelected) {
      // If removing a YM ST, check if it's the main one
      const removedIndex = selectedYmSts.findIndex(item => item.stok_kodu === ymSt.stok_kodu);
      if (removedIndex === mainYmStIndex) {
        // If we're removing the main YMST, set a new main index
        const totalLength = selectedYmSts.length + autoGeneratedYmSts.length;
        if (totalLength > 1) {
          // If there are still YMSTs left, select a new main YMST
          // Prefer to keep the main YMST among selected YMSTs
          if (selectedYmSts.length > 1) {
            // If there are other selected YMSTs, choose one of them
            setMainYmStIndex(removedIndex === selectedYmSts.length - 1 ? removedIndex - 1 : 0);
          } else if (autoGeneratedYmSts.length > 0) {
            // Fall back to the first auto-generated YMST
            setMainYmStIndex(0);
          }
        }
      } else if (removedIndex < mainYmStIndex) {
        // If removing an YMST with index less than main, adjust main index
        setMainYmStIndex(mainYmStIndex - 1);
      }
      
      setSelectedYmSts(prev => prev.filter(item => item.stok_kodu !== ymSt.stok_kodu));
    } else {
      // Adding a new YMST
      const newYmSt = { ...ymSt, source: 'database' };
      
      setSelectedYmSts(prev => {
        const newYmSts = [...prev, newYmSt];
        
        // If this is the first YMST (either selected or auto), make it the main one
        const totalYmSts = newYmSts.length + autoGeneratedYmSts.length;
        if (totalYmSts === 1) {
          setMainYmStIndex(0);
        }
        
        return newYmSts;
      });
      
      // Load recipe data for this YMST if it exists in database and not viewing existing product
      if (ymSt.id && !isViewingExistingProduct) {
        // Wait for state update before loading recipes
        setTimeout(async () => {
          await loadExistingRecipeData([newYmSt]);
        }, 100);
      }
    }
    
    // Only recalculate auto values if not viewing existing product
    if (!isViewingExistingProduct) {
      // Secim degistiginde receteleri yeniden hesapla
      setTimeout(() => {
        calculateAutoRecipeValues();
      }, 200);
    }
  };

  // Otomatik olusturulan YM ST'yi sil
  const removeAutoGeneratedYmSt = (index) => {
    // The auto index in the overall selection
    const autoIndex = selectedYmSts.length + index;
    
    // If removing the main YMST, set a new main YMST
    if (autoIndex === mainYmStIndex) {
      const totalLength = selectedYmSts.length + autoGeneratedYmSts.length;
      if (totalLength > 1) {
        // Prefer to keep the main among auto YMSTs if possible
        if (autoGeneratedYmSts.length > 1) {
          const newMainIndex = index === autoGeneratedYmSts.length - 1 
            ? autoIndex - 1 
            : autoIndex + 1 < totalLength ? autoIndex + 1 : 0;
          setMainYmStIndex(newMainIndex);
        } else if (selectedYmSts.length > 0) {
          // Fall back to selected YMSTs
          setMainYmStIndex(0);
        }
      }
    } else if (autoIndex < mainYmStIndex) {
      // If removing an YMST with index less than main, adjust main index
      setMainYmStIndex(mainYmStIndex - 1);
    }
    
    setAutoGeneratedYmSts(prev => prev.filter((_, i) => i !== index));
    setTimeout(() => {
      calculateAutoRecipeValues();
    }, 100);
  };

  // Secili YM ST'yi sil
  const removeSelectedYmSt = (index) => {
    // If removing the main YMST, set a new main YMST
    if (index === mainYmStIndex) {
      const totalLength = selectedYmSts.length + autoGeneratedYmSts.length;
      if (totalLength > 1) {
        // Prefer to keep the main among selected YMSTs if possible
        if (selectedYmSts.length > 1) {
          const newMainIndex = index === selectedYmSts.length - 1 ? index - 1 : index + 1 < selectedYmSts.length ? index + 1 : 0;
          setMainYmStIndex(newMainIndex);
        } else if (autoGeneratedYmSts.length > 0) {
          // Fall back to auto YMSTs, which start at index selectedYmSts.length
          setMainYmStIndex(selectedYmSts.length - 1); // Will be correct after removal
        }
      }
    } else if (index < mainYmStIndex) {
      // If removing an YMST with index less than main, adjust main index
      setMainYmStIndex(mainYmStIndex - 1);
    }
    
    setSelectedYmSts(prev => prev.filter((_, i) => i !== index));
    setTimeout(() => {
      calculateAutoRecipeValues();
    }, 100);
  };

  // Recete guncelleme fonksiyonu - NOKTA kullan
  const updateRecipeValue = (recipeType, ymStIndex, key, value) => {
    // Handle comma to point conversion first (direct replacement)
    let inputValue = value;
    if (typeof inputValue === 'string' && inputValue.includes(',')) {
      inputValue = inputValue.replace(/,/g, '.');
    }
    
    // Mark as unsaved when recipe values change
    // This triggers the save process which will check if same stok_kodu/stok_adi exists
    // and ask user if they want to update it
    if (savedToDatabase) {
      setSavedToDatabase(false);
      // Clear database IDs so the system treats this as a new save attempt
      // and goes through the normal duplicate checking process
      setDatabaseIds({ mmGtIds: [], ymGtId: null, ymStIds: [] });
      setSessionSavedProducts({ mmGtIds: [], ymGtId: null, ymStIds: [] });
    }
    
    // Special case handling for direct decimal input
    // This allows decimal points to be properly entered and maintained in the field
    if (typeof inputValue === 'string') {
      // If we have a string with a decimal point (.5 or 3.1), preserve its exact format
      // This handles decimal points that were just added by the user
      if (inputValue.includes('.')) {
        // Store it as is to maintain positions of digits and decimal points
        setRecipeStatus(prev => ({
          ...prev,
          [recipeType === 'mmgt' 
            ? 'mmGtRecipes' 
            : recipeType === 'ymgt' 
              ? 'ymGtRecipe' 
              : 'ymStRecipes']: recipeType === 'ymgt' 
                ? { ...prev.ymGtRecipe, [key]: 'manual' }
                : {
                    ...prev[recipeType === 'mmgt' ? 'mmGtRecipes' : 'ymStRecipes'],
                    [ymStIndex]: {
                      ...prev[recipeType === 'mmgt' ? 'mmGtRecipes' : 'ymStRecipes'][ymStIndex],
                      [key]: 'manual'
                    }
                  }
        }));
        
        // Update the appropriate recipe with the exact string value
        if (recipeType === 'mmgt') {
          setAllRecipes(prev => ({
            ...prev,
            mmGtRecipes: {
              ...prev.mmGtRecipes,
              [ymStIndex]: {
                ...prev.mmGtRecipes[ymStIndex],
                [key]: inputValue // Keep as string with decimal point
              }
            }
          }));
          return; // Exit early to avoid overwriting with number parsing
        } else if (recipeType === 'ymgt') {
          setAllRecipes(prev => ({
            ...prev,
            ymGtRecipe: {
              ...prev.ymGtRecipe,
              [key]: inputValue // Keep as string with decimal point
            }
          }));
          return; // Exit early
        } else {
          setAllRecipes(prev => ({
            ...prev,
            ymStRecipes: {
              ...prev.ymStRecipes,
              [ymStIndex]: {
                ...prev.ymStRecipes[ymStIndex],
                [key]: inputValue // Keep as string with decimal point
              }
            }
          }));
          return; // Exit early
        }
      }
    }
    
    // For other cases (non-decimal string, empty string, number, etc.)
    // Continue with standard handling
    const normalizedValue = typeof inputValue === 'string' ? inputValue : normalizeInputValue(inputValue);
    
    // Ensure we have a proper numeric value with point decimal separator
    // Store the formatted string to maintain proper decimal display
    const numValue = parseFloat(normalizedValue) || 0;
    const formattedValue = numValue.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 5,
      useGrouping: false // No thousand separators
    });

    if (recipeType === 'mmgt') {
      setAllRecipes(prev => ({
        ...prev,
        mmGtRecipes: {
          ...prev.mmGtRecipes,
          [ymStIndex]: {
            ...prev.mmGtRecipes[ymStIndex],
            [key]: formattedValue // Store as formatted string with point decimal
          }
        }
      }));
      // Manuel degisiklik olarak isaretle
      setRecipeStatus(prev => ({
        ...prev,
        mmGtRecipes: {
          ...prev.mmGtRecipes,
          [ymStIndex]: {
            ...prev.mmGtRecipes[ymStIndex],
            [key]: 'manual'
          }
        }
      }));
    } else if (recipeType === 'ymgt') {
      setAllRecipes(prev => ({
        ...prev,
        ymGtRecipe: {
          ...prev.ymGtRecipe,
          [key]: formattedValue // Store as formatted string with point decimal
        }
      }));
      // Manuel degisiklik olarak isaretle
      setRecipeStatus(prev => ({
        ...prev,
        ymGtRecipe: {
          ...prev.ymGtRecipe,
          [key]: 'manual'
        }
      }));
    } else if (recipeType === 'ymst') {
      setAllRecipes(prev => ({
        ...prev,
        ymStRecipes: {
          ...prev.ymStRecipes,
          [ymStIndex]: {
            ...prev.ymStRecipes[ymStIndex],
            [key]: formattedValue // Store as formatted string with point decimal
          }
        }
      }));
      // Manuel degisiklik olarak isaretle
      setRecipeStatus(prev => ({
        ...prev,
        ymStRecipes: {
          ...prev.ymStRecipes,
          [ymStIndex]: {
            ...prev.ymStRecipes[ymStIndex],
            [key]: 'manual'
          }
        }
      }));
      // FLM degisikligi durumunda diger hesaplamalari tetikle
      if (key.includes('FLM.')) {
        setTimeout(() => {
          calculateAutoRecipeValues();
        }, 100);
      }
    }
  };

  // Recete durumunu gosterir
  const getRecipeStatusText = (recipeType, ymStIndex, key) => {
    let status = '';
    if (recipeType === 'mmgt') {
      status = recipeStatus.mmGtRecipes[ymStIndex]?.[key];
    } else if (recipeType === 'ymgt') {
      status = recipeStatus.ymGtRecipe[key];
    } else if (recipeType === 'ymst') {
      status = recipeStatus.ymStRecipes[ymStIndex]?.[key];
    }
    
    switch (status) {
      case 'database': return 'Veritabaninda secildi';
      case 'auto': return 'Otomatik dolduruldu';
      case 'manual': return 'Elle dolduruldu';
      default: return '';
    }
  };

  // Inkremental urun olusturma kontrolu - Degisen mantik: Sadece stok_kodu veya stok_adi etkileyen degerler degisirse
  const checkForExistingProducts = async (cap, kod_2, kaplama, minMukavemet, maxMukavemet, kg) => {
    try {
      const capFormatted = Math.round(parseFloat(cap) * 100).toString().padStart(4, '0');
      const baseCode = `GT.${kod_2}.${capFormatted}`;
      
      // Ayni core degerlere sahip urunleri ara
      const response = await fetchWithAuth(`${API_URLS.galMmGt}?stok_kodu_like=${encodeURIComponent(baseCode)}`);
      if (response && response.ok) {
        const existingProducts = await response.json();
        
        // Tamamen ayni urun var mi kontrol et (stok_kodu ve stok_adi etkileyen tum degerler)
        // Use the same generateStokAdi function to ensure consistent formatting
        const stokAdi = generateStokAdi();
        
        // Tamamen eslesen bir urun var mi?
        const exactMatch = existingProducts.find(product => {
          // Stok adi ile karsilastirma icin normalizasyon (bosluklar ve case-sensitive olmayan karsilastirma)
          const normalizedProductAdi = product.stok_adi.replace(/\s+/g, ' ').trim().toLowerCase();
          const normalizedStokAdi = stokAdi.replace(/\s+/g, ' ').trim().toLowerCase();
          
          // Stok kodu base'i ve stok adi eslesiyorsa
          return normalizedProductAdi === normalizedStokAdi;
        });
        
        if (exactMatch) {
          // Use the new duplicate confirmation system instead of window.confirm
          // This will be handled by checkForDuplicatesAndConfirm function
          const sequencePart = exactMatch.stok_kodu.split('.').pop();
          const sequenceNum = parseInt(sequencePart);
          return sequenceNum; // Use existing sequence for now, duplicate dialog will handle the confirmation
        }
        
        // Eger tamamen eslesen yoksa veya kullanici guncellemeyi reddettiyse, yeni bir urun olustur
        let maxSequence = -1;
        existingProducts.forEach(product => {
          const sequencePart = product.stok_kodu.split('.').pop();
          const sequenceNum = parseInt(sequencePart);
          if (!isNaN(sequenceNum) && sequenceNum > maxSequence) {
            maxSequence = sequenceNum;
          }
        });
        
        // If no existing products, start with 0, otherwise increment
        return existingProducts.length === 0 ? 0 : maxSequence + 1;
      }
    } catch (error) {
      console.error('Mevcut urun kontrolu hatasi:', error);
    }
    return 0; // Hata durumunda veya urun yoksa 0'dan basla
  };

  // Session'daki urunleri guncelle - Yeni 1:1:n iliski modeli ile
  const updateSessionProducts = async () => {
    const allYmSts = [...selectedYmSts, ...autoGeneratedYmSts];
    
    if (sessionSavedProducts.mmGtIds.length > 0) {
      // Ana YM ST'yi belirle
      const mainYmSt = allYmSts[mainYmStIndex] || allYmSts[0];
      
      // MMGT icin dogru sequence'i belirle - ozellikle key degerleri degistiyse onemli
      let sequence = '00';
      let oldSequence = '00';
      
      // MMGT'nin stok_kodu'ndan mevcut sequence'i al
      const mmGtResponse = await fetchWithAuth(`${API_URLS.galMmGt}/${sessionSavedProducts.mmGtIds[0]}`);
      if (mmGtResponse && mmGtResponse.ok) {
        const mmGt = await mmGtResponse.json();
        if (mmGt && mmGt.stok_kodu) {
          oldSequence = mmGt.stok_kodu.split('.').pop();
          
          // Key degerlerinde degisim var mi cok dikkatli kontrol et
          const currentKey = `${mmGtData.cap}|${mmGtData.kod_2}|${mmGtData.kaplama}|${mmGtData.min_mukavemet}|${mmGtData.max_mukavemet}|${mmGtData.kg}`;
          const oldKey = `${mmGt.cap}|${mmGt.kod_2}|${mmGt.kaplama}|${mmGt.min_mukavemet}|${mmGt.max_mukavemet}|${mmGt.kg}`;
          
          if (currentKey !== oldKey) {
            
            // ONEMLI: Once veritabaninda ayni key degerlere sahip urun var mi kontrol et
            const capFormatted = Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0');
            const baseCode = `GT.${mmGtData.kod_2}.${capFormatted}`;
            
            try {
              // Ayni base koda sahip urunleri ara
              const response = await fetchWithAuth(`${API_URLS.galMmGt}?stok_kodu_like=${encodeURIComponent(baseCode)}`);
              if (response && response.ok) {
                const existingProducts = await response.json();
                
                if (existingProducts.length > 0) {
                  // Tam eslesen bir urun ara
                  const stokAdi = `Galvanizli Tel ${parseFloat(mmGtData.cap).toFixed(2)} mm -${Math.abs(parseFloat(mmGtData.tolerans_minus)).toFixed(2)}/+${parseFloat(mmGtData.tolerans_plus).toFixed(2)} ${mmGtData.kaplama} gr/m² ${mmGtData.min_mukavemet}-${mmGtData.max_mukavemet} MPa ID:${mmGtData.ic_cap} cm OD:${mmGtData.dis_cap} cm ${mmGtData.kg} kg`;
                  const normalizedStokAdi = stokAdi.replace(/\s+/g, ' ').trim().toLowerCase();
                  
                  let exactMatch = null;
                  for (const product of existingProducts) {
                    if (product.id === sessionSavedProducts.mmGtIds[0]) continue; // Kendisi olmamali
                    
                    const normalizedProductAdi = product.stok_adi.replace(/\s+/g, ' ').trim().toLowerCase();
                    if (normalizedProductAdi === normalizedStokAdi) {
                      exactMatch = product;
                      break;
                    }
                  }
                  
                  if (exactMatch) {
                    // Tam eslesen urun bulundu - bu urunun sequence'ini kullan
                    sequence = exactMatch.stok_kodu.split('.').pop();
                  } else {
                    // En yuksek sequence'i bul
                    let maxSequence = -1;
                    existingProducts.forEach(product => {
                      const sequencePart = product.stok_kodu.split('.').pop();
                      const sequenceNum = parseInt(sequencePart);
                      if (!isNaN(sequenceNum) && sequenceNum > maxSequence) {
                        maxSequence = sequenceNum;
                      }
                    });
                    
                    // Yeni urun icin sequence artir
                    sequence = (maxSequence + 1).toString().padStart(2, '0');
                  }
                } else {
                  // Benzer urun bulunamadi - yeni sequence hesapla
                  sequence = '00';
                }
              }
            } catch (error) {
              console.error('Veritabani sorgulama hatasi:', error);
            }
            
            // Hala sequence belirlenemedi ise yeni hesapla
            if (sequence === '00') {
              // Key degismisse yeni sequence hesapla
              const nextSequence = await checkForExistingProducts(
                mmGtData.cap,
                mmGtData.kod_2,
                mmGtData.kaplama,
                mmGtData.min_mukavemet,
                mmGtData.max_mukavemet,
                mmGtData.kg
              );
              sequence = nextSequence.toString().padStart(2, '0');
            }
          } else {
            // Key degismemisse mevcut sequence'i kullan
            sequence = oldSequence;
          }
        }
      }
      
      // Eski ve yeni sequence farkli ise kullaniciyi uyar
      if (oldSequence !== '00' && sequence !== oldSequence) {
        console.warn(`Sequence degisiyor: ${oldSequence} -> ${sequence}`);
      }
      
      // Sadece 1 MM GT'yi guncelle
      if (sessionSavedProducts.mmGtIds[0]) {
        await fetchWithAuth(`${API_URLS.galMmGt}/${sessionSavedProducts.mmGtIds[0]}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(generateMmGtDatabaseData(sequence))
        });
      }
      
      // Sadece 1 YM GT'yi guncelle
      if (sessionSavedProducts.ymGtId) {
        await fetchWithAuth(`${API_URLS.galYmGt}/${sessionSavedProducts.ymGtId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(generateYmGtDatabaseData(sequence))
        });
      }
      
      // Tum YM ST'leri guncelle
      for (let i = 0; i < allYmSts.length && i < sessionSavedProducts.ymStIds.length; i++) {
        // YM ST'yi guncelle (eger otomatik olusturulmussa)
        if (sessionSavedProducts.ymStIds[i] && 
            (allYmSts[i].source === 'auto-generated' || allYmSts[i].source === 'manual-added')) {
          await fetchWithAuth(`${API_URLS.galYmSt}/${sessionSavedProducts.ymStIds[i]}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(generateYmStDatabaseData(allYmSts[i]))
          });
        }
      }
      
      // MM GT - Ana YM ST iliskisini guncelle - iliskileri sil ve yeniden olustur
      try {
        // Once iliskileri sil
        if (sessionSavedProducts.mmGtIds[0]) {
          await fetchWithAuth(`${API_URLS.galMmGtYmSt}/mm_gt/${sessionSavedProducts.mmGtIds[0]}`, {
            method: 'DELETE'
          });
        }
        
        // Yeni iliskiyi olustur
        if (sessionSavedProducts.mmGtIds[0] && sessionSavedProducts.ymStIds[mainYmStIndex]) {
          await fetchWithAuth(API_URLS.galMmGtYmSt, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              mm_gt_id: sessionSavedProducts.mmGtIds[0],
              ym_gt_id: sessionSavedProducts.ymGtId, // Include YM GT ID
              ym_st_id: sessionSavedProducts.ymStIds[mainYmStIndex],
              is_main: true
            })
          });
        }
      } catch (error) {
        console.error('Iliski guncelleme hatasi:', error);
      }
      
      return {
        mmGtIds: [sessionSavedProducts.mmGtIds[0]], // Artik sadece 1 MM GT var
        ymGtId: sessionSavedProducts.ymGtId,
        ymStIds: sessionSavedProducts.ymStIds
      };
    }
    
    return null;
  };

  // Check for duplicate products and show confirmation dialog
  const checkForDuplicatesAndConfirm = async () => {
    try {
      setIsLoading(true);
      const allYmSts = [...selectedYmSts, ...autoGeneratedYmSts];
      
      if (allYmSts.length === 0) {
        toast.error('En az bir YM ST secmelisiniz veya olusturmalisiniz');
        setIsLoading(false);
        return false;
      }
      
      // First check if an exact duplicate exists (all fields match)
      const capFormatted = Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0');
      const baseCode = `GT.${mmGtData.kod_2}.${capFormatted}`;
      
      // Get all existing products with same base code
      const response = await fetchWithAuth(`${API_URLS.galMmGt}?stok_kodu_like=${encodeURIComponent(baseCode)}`);
      if (response && response.ok) {
        const existingProducts = await response.json();
        
        if (existingProducts.length > 0) {
          // Check each existing product for matches
          for (const existingProduct of existingProducts) {
            // Check if ALL fields match (exact duplicate)
            const allFieldsMatch = 
              Math.abs(parseFloat(existingProduct.cap) - parseFloat(mmGtData.cap)) < 0.001 &&
              existingProduct.kod_2 === mmGtData.kod_2 &&
              Math.abs(parseFloat(existingProduct.tolerans_plus) - parseFloat(mmGtData.tolerans_plus)) < 0.001 &&
              Math.abs(parseFloat(existingProduct.tolerans_minus) - parseFloat(mmGtData.tolerans_minus)) < 0.001 &&
              parseInt(existingProduct.kaplama) === parseInt(mmGtData.kaplama) &&
              parseInt(existingProduct.min_mukavemet) === parseInt(mmGtData.min_mukavemet) &&
              parseInt(existingProduct.max_mukavemet) === parseInt(mmGtData.max_mukavemet) &&
              parseInt(existingProduct.kg) === parseInt(mmGtData.kg) &&
              parseInt(existingProduct.ic_cap) === parseInt(mmGtData.ic_cap) &&
              parseInt(existingProduct.dis_cap) === parseInt(mmGtData.dis_cap) &&
              (existingProduct.cast_kont || 'hayir') === (mmGtData.cast_kont || 'hayir') &&
              (existingProduct.shrink || 'hayir') === (mmGtData.shrink || 'hayir') &&
              (existingProduct.unwinding || '') === (mmGtData.unwinding || '') &&
              (existingProduct.helix_kont || 'hayir') === (mmGtData.helix_kont || 'hayir') &&
              (existingProduct.elongation || '') === (mmGtData.elongation || '');
            
            if (allFieldsMatch) {
              // Exact duplicate found
              setConflictProduct(existingProduct);
              setConflictType('exact');
              setShowProductConflictModal(true);
              setIsLoading(false);
              return false;
            }
            
            // Check if only key fields match (key fields that affect stok_adi and stok_kodu)
            // Key fields: cap, kod_2, tolerans_plus/minus, kaplama, min/max_mukavemet, kg, ic_cap, dis_cap, cast_kont
            const keyFieldsMatch = 
              Math.abs(parseFloat(existingProduct.cap) - parseFloat(mmGtData.cap)) < 0.001 &&
              existingProduct.kod_2 === mmGtData.kod_2 &&
              Math.abs(parseFloat(existingProduct.tolerans_plus) - parseFloat(mmGtData.tolerans_plus)) < 0.001 &&
              Math.abs(parseFloat(existingProduct.tolerans_minus) - parseFloat(mmGtData.tolerans_minus)) < 0.001 &&
              parseInt(existingProduct.kaplama) === parseInt(mmGtData.kaplama) &&
              parseInt(existingProduct.min_mukavemet) === parseInt(mmGtData.min_mukavemet) &&
              parseInt(existingProduct.max_mukavemet) === parseInt(mmGtData.max_mukavemet) &&
              parseInt(existingProduct.kg) === parseInt(mmGtData.kg) &&
              parseInt(existingProduct.ic_cap) === parseInt(mmGtData.ic_cap) &&
              parseInt(existingProduct.dis_cap) === parseInt(mmGtData.dis_cap) &&
              (existingProduct.cast_kont || 'hayir') === (mmGtData.cast_kont || 'hayir');
            
            if (keyFieldsMatch) {
              // Key fields match but non-key fields are different
              setConflictProduct(existingProduct);
              setConflictType('nonkey');
              setShowProductConflictModal(true);
              setIsLoading(false);
              return false;
            }
          }
          
          // If we get here, key fields are different, so create new product with incremented sequence
          let maxSequence = -1;
          existingProducts.forEach(product => {
            const sequencePart = product.stok_kodu.split('.').pop();
            const sequenceNum = parseInt(sequencePart);
            if (!isNaN(sequenceNum) && sequenceNum > maxSequence) {
              maxSequence = sequenceNum;
            }
          });
          
          const nextSequence = maxSequence + 1;
          const sequence = nextSequence.toString().padStart(2, '0');
          
          // Store the sequence for Excel generation
          setProcessSequence(sequence);
          
          // Proceed with save as new product
          return await proceedWithSave(allYmSts, nextSequence);
        } else {
          // No existing products, create with sequence 00
          setProcessSequence('00');
          return await proceedWithSave(allYmSts, 0);
        }
      }
      
    } catch (error) {
      console.error('Duplicate check error:', error);
      toast.error(`Duplicate check hatasi: ${error.message}`);
      setIsLoading(false);
      return false;
    }
  };

  // Proceed with actual save (called either directly or after confirmation)
  const proceedWithSave = async (allYmSts, nextSequence) => {
    try {
      const mainYmSt = allYmSts[mainYmStIndex] || allYmSts[0];
      const mmGtIds = [];
      const ymStIds = [];
      let ymGtId = null;
      
      const capFormatted = Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0');
      const sequence = nextSequence.toString().padStart(2, '0');
      
      // IMPORTANT: Set the processSequence state so Excel generation uses correct sequence
      setProcessSequence(sequence);
      
      // Also store sequence in sessionStorage for debugging
      sessionStorage.setItem('lastProcessSequence', sequence);
      
      // Save YM GT - Always create new, never update
      const ymGtResponse = await fetchWithAuth(API_URLS.galYmGt, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(generateYmGtDatabaseData(sequence))
      });
      
      if (ymGtResponse && ymGtResponse.ok) {
        const ymGtResult = await ymGtResponse.json();
        ymGtId = ymGtResult.id;
      } else {
        console.error('YM GT save failed:', ymGtResponse?.status, await ymGtResponse?.text());
        throw new Error('YM GT kaydedilemedi');
      }
      
      // Save MM GT - Always create new, never update
      const mmGtResponse = await fetchWithAuth(API_URLS.galMmGt, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(generateMmGtDatabaseData(sequence))
      });
      
      if (mmGtResponse && mmGtResponse.ok) {
        const mmGtResult = await mmGtResponse.json();
        mmGtIds.push(mmGtResult.id);
      }
      
      // Save all YM STs
      for (let i = 0; i < allYmSts.length; i++) {
        const ymSt = allYmSts[i];
        
        if (ymSt.source === 'auto-generated' || ymSt.source === 'manual-added') {
          const existingYmSt = await checkExistingProduct(API_URLS.galYmSt, ymSt.stok_kodu);
          
          if (existingYmSt) {
            ymStIds.push(existingYmSt.id);
          } else {
            const ymStResponse = await fetchWithAuth(API_URLS.galYmSt, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(generateYmStDatabaseData(ymSt))
            });
            
            if (ymStResponse && ymStResponse.ok) {
              const ymStResult = await ymStResponse.json();
              ymStIds.push(ymStResult.id);
            }
          }
        } else {
          ymStIds.push(ymSt.id);
        }
      }
      
      // Create relationships between ALL YM STs and MM GT, including YM GT reference
      
      for (let i = 0; i < ymStIds.length; i++) {
        try {
          const relationshipData = {
            mm_gt_id: mmGtIds[0],
            ym_gt_id: ymGtId, // 🆕 NEW: Include YM GT ID in relationship
            ym_st_id: ymStIds[i],
            is_main: i === mainYmStIndex, // 🆕 NEW: Mark main YM ST
            sequence_index: i // 🆕 NEW: Store sequence/order
          };
          
          
          await fetchWithAuth(API_URLS.galMmGtYmSt, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(relationshipData)
          });
          
        } catch (relationError) {
          console.error(`Error creating relationship for YM ST ${i + 1}:`, relationError);
          // Continue with other relationships even if one fails
        }
      }
      
      const newDatabaseIds = {
        mmGtIds: mmGtIds,
        ymGtId: ymGtId,
        ymStIds: ymStIds
      };
      
      await saveRecipesToDatabase(mmGtIds, ymGtId, ymStIds);
      
      setDatabaseIds(newDatabaseIds);
      setSavedToDatabase(true);
      setSuccessMessage('Veriler basariyla kaydedildi');
      toast.success('Veriler basariyla kaydedildi');
      
      setSessionSavedProducts(newDatabaseIds);
      
      // Update request table with correct stok_kodu if this was from a request
      const requestIdFromSession = sessionStorage.getItem('lastEditedRequestId');
      
      if (requestIdFromSession || (selectedRequest && selectedRequest.id)) {
        const requestId = requestIdFromSession || selectedRequest.id;
        try {
          const capFormatted = Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0');
          const actualStokKodu = `GT.${mmGtData.kod_2}.${capFormatted}.${sequence}`;
          
          
          const updateResponse = await fetchWithAuth(`${API_URLS.galSalRequests}/${requestId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              stok_kodu: actualStokKodu
            })
          });
          
          if (updateResponse && updateResponse.ok) {
            const updateResult = await updateResponse.json();
            toast.success('Talep stok kodu guncellendi');
            
            // Clean up sessionStorage after successful update
            sessionStorage.removeItem('lastEditedRequestId');
          } else {
            console.error(`[proceedWithSave] Failed to update request stok_kodu: ${updateResponse?.status}`);
          }
        } catch (error) {
          console.error('[proceedWithSave] Request stok_kodu update error:', error);
        }
      }
      
      setIsLoading(false);
      
      return true;
      
    } catch (error) {
      console.error('Save error:', error);
      setError(`Kaydetme hatasi: ${error.message}`);
      toast.error(`Kaydetme hatasi: ${error.message}`);
      setIsLoading(false);
      return false;
    }
  };

  // Veritabanina kaydet - Yeni 1:1:n iliski modeli ile
  const saveToDatabase = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Session'da mevcut urunler varsa guncelle
      const updatedIds = await updateSessionProducts();
      if (updatedIds) {
        // Receteleri guncelle
        await saveRecipesToDatabase(updatedIds.mmGtIds, updatedIds.ymGtId, updatedIds.ymStIds);
        
        setDatabaseIds(updatedIds);
        setSavedToDatabase(true);
        setSuccessMessage('Veriler basariyla guncellendi');
        toast.success('Veriler basariyla guncellendi');
        
        // Session'daki urunleri guncelle
        setSessionSavedProducts(updatedIds);
        
        setIsLoading(false);
        return;
      }
      
      // Talep kullanildiysa, onaylama penceresi gostermeden isleme devam et
      if (isRequestUsed) {
        // Isleme devam edecek, popup ile onaylama daha sonra gosterilecek
      }
      
      const allYmSts = [...selectedYmSts, ...autoGeneratedYmSts];
      
      if (allYmSts.length === 0) {
        toast.error('En az bir YM ST secmelisiniz veya olusturmalisiniz');
        setIsLoading(false);
        return;
      }
      
      // Ana YM ST'yi belirle
      const mainYmSt = allYmSts[mainYmStIndex] || allYmSts[0];
      
      // Use the passed nextSequence parameter instead of recalculating
      // This ensures consistency with the sequence determined in checkForDuplicatesAndConfirm
      const sequence = nextSequence.toString().padStart(2, '0');
      setProcessSequence(sequence);
      // Process sequence set for both database and Excel operations
      
      const mmGtIds = [];
      const ymStIds = [];
      let ymGtId = null;
      
      // Ayni sequence ile 1 tane YM GT olustur (MMGT ile ayni sequence)
      const capFormatted = Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0');
      // sequence already defined above
      // MMGT ile ayni sequence'i kullan
      // Create YM GT stock code
      const ymGtStokKodu = `YM.GT.${mmGtData.kod_2}.${capFormatted}.${sequence}`;
      const existingYmGt = await checkExistingProduct(API_URLS.galYmGt, ymGtStokKodu);
      
      if (existingYmGt) {
        // YM GT mevcut - guncelle
        const ymGtResponse = await fetchWithAuth(`${API_URLS.galYmGt}/${existingYmGt.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(generateYmGtDatabaseData(sequence))
        });
        if (ymGtResponse && ymGtResponse.ok) {
          ymGtId = existingYmGt.id;
        }
      } else {
        // YM GT yeni - olustur
        const ymGtResponse = await fetchWithAuth(API_URLS.galYmGt, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(generateYmGtDatabaseData(sequence))
        });
        
        if (ymGtResponse && ymGtResponse.ok) {
          const ymGtResult = await ymGtResponse.json();
          ymGtId = ymGtResult.id;
        }
      }
      
      // Create MM GT with same sequence
      const mmGtStokKodu = `GT.${mmGtData.kod_2}.${capFormatted}.${sequence}`;
      const existingMmGt = await checkExistingProduct(API_URLS.galMmGt, mmGtStokKodu);
      
      if (existingMmGt) {
        // MM GT mevcut - guncelle
        const mmGtResponse = await fetchWithAuth(`${API_URLS.galMmGt}/${existingMmGt.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(generateMmGtDatabaseData(sequence))
        });
        if (mmGtResponse && mmGtResponse.ok) {
          mmGtIds.push(existingMmGt.id);
        }
      } else {
        // MM GT yeni - olustur
        const mmGtResponse = await fetchWithAuth(API_URLS.galMmGt, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(generateMmGtDatabaseData(sequence))
        });
        
        if (mmGtResponse && mmGtResponse.ok) {
          const mmGtResult = await mmGtResponse.json();
          mmGtIds.push(mmGtResult.id);
        }
      }
      
      // Tum YM ST'leri kaydet
      for (let i = 0; i < allYmSts.length; i++) {
        const ymSt = allYmSts[i];
        
        // YM ST kontrolu ve kaydetme
        if (ymSt.source === 'auto-generated' || ymSt.source === 'manual-added') {
          const existingYmSt = await checkExistingProduct(API_URLS.galYmSt, ymSt.stok_kodu);
          
          if (existingYmSt) {
            ymStIds.push(existingYmSt.id);
          } else {
            const ymStResponse = await fetchWithAuth(API_URLS.galYmSt, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(generateYmStDatabaseData(ymSt))
            });
            
            if (ymStResponse && ymStResponse.ok) {
              const ymStResult = await ymStResponse.json();
              ymStIds.push(ymStResult.id);
            }
          }
        } else {
          // Mevcut YM ST'nin ID'sini al
          ymStIds.push(ymSt.id);
        }
      }
      
      // Sadece ana YM ST ile MM GT arasinda iliski kur
      try {
        await fetchWithAuth(API_URLS.galMmGtYmSt, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mm_gt_id: mmGtIds[0],
            ym_gt_id: ymGtId, // Include YM GT ID in relationship
            ym_st_id: ymStIds[mainYmStIndex],
            is_main: true
          })
        });
      } catch (relationError) {
      }
      
      // Receteleri kaydet - sadece 1 MM GT, 1 YM GT ve tum YM ST'ler icin
      await saveRecipesToDatabase(mmGtIds, ymGtId, ymStIds);
      
      setDatabaseIds({
        mmGtIds: mmGtIds,
        ymGtId: ymGtId,
        ymStIds: ymStIds
      });
      
      // Session'da kaydedilen urunleri takip et
      setSessionSavedProducts({
        mmGtIds: mmGtIds,
        ymGtId: ymGtId,
        ymStIds: ymStIds
      });
      
      setSavedToDatabase(true);
      setSuccessMessage('Veriler basariyla veritabanina kaydedildi');
      toast.success('Veriler basariyla veritabanina kaydedildi');
      
      // Update request table with correct stok_kodu if this was from a request
      // Check if we're working with a request by looking for recent PUT API calls in the session
      const requestIdFromSession = sessionStorage.getItem('lastEditedRequestId');
      
      if (requestIdFromSession || (selectedRequest && selectedRequest.id)) {
        const requestId = requestIdFromSession || selectedRequest.id;
        try {
          const capFormatted = Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0');
          const actualStokKodu = `GT.${mmGtData.kod_2}.${capFormatted}.${sequence}`;
          
          
          const updateResponse = await fetchWithAuth(`${API_URLS.galSalRequests}/${requestId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              stok_kodu: actualStokKodu
            })
          });
          
          if (updateResponse && updateResponse.ok) {
            const updateResult = await updateResponse.json();
            toast.success('Talep stok kodu guncellendi');
            
            // Clean up sessionStorage after successful update
            sessionStorage.removeItem('lastEditedRequestId');
          } else {
            console.error(`Failed to update request stok_kodu: ${updateResponse?.status}`);
          }
        } catch (error) {
          console.error('Request stok_kodu update error:', error);
        }
      }
      
      // Clear the success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
      
    } catch (error) {
      console.error('Veritabanina kaydetme hatasi:', error);
      setError('Veritabanina kaydetme hatasi: ' + error.message);
      toast.error('Veritabanina kaydetme hatasi: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Var olan urun kontrolu
  const checkExistingProduct = async (apiUrl, stokKodu) => {
    try {
      if (!stokKodu) {
        console.error('Gecersiz stok_kodu ile urun kontrolu yapilamaz:', stokKodu);
        return null;
      }
      
      const response = await fetchWithAuth(`${apiUrl}?stok_kodu=${encodeURIComponent(stokKodu)}`);
      if (response && response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          return data[0];
        } else {
          return null;
        }
      } else if (response && response.status === 404) {
      } else {
        console.error(`"${stokKodu}" stok kodu ile urun kontrolu sirasinda API hatasi: ${response?.status || 'Bilinmiyor'}`);
      }
    } catch (error) {
      console.error(`"${stokKodu}" stok kodu ile urun kontrol hatasi:`, error.message);
    }
    return null;
  };

  // Veritabani icin MM GT verisi olustur - Excel formatiyla tam uyusum icin guncellendi
  /**
   * Verilen bir sequence degerini kontrol eder ve gecerli oldugunu dogrular
   * @param {string} sequence - Kontrol edilecek sequence
   * @returns {string} - Dogrulanmis sequence degeri
   */
  const validateSequence = (sequence) => {
    if (!sequence) return '00';
    
    // Sequence degeri bir sayi ve 0-99 arasinda olmali
    if (!/^\d{1,2}$/.test(sequence)) {
      console.error(`Gecersiz sequence formati: ${sequence}, varsayilan 00 kullaniliyor`);
      return '00';
    }
    
    // 1-9 arasi degerleri 01-09 formatina donustur
    return sequence.padStart(2, '0');
  };

  /**
   * Bir sequence degerini bir arttirir ve dogru formati saglar
   * @param {string} sequence - Arttirilacak sequence
   * @returns {string} - Arttirilmis sequence degeri
   */
  const incrementSequence = (sequence) => {
    // Sequence null/undefined ise veya gecersiz ise 00 kullan
    if (!sequence || !/^\d{1,2}$/.test(sequence)) {
      console.warn(`Gecersiz sequence: ${sequence}, 00 ile baslaniyor`);
      return '00';
    }
    
    // Ilk urun icin 00'dan basla, ikinci urun icin 01
    if (sequence === '00') {
      return '00'; // First product should be 00, not 01
    }
    
    // Mevcut sequence'i arttir
    const nextVal = parseInt(sequence, 10) + 1;
    
    // 99'dan buyukse 00'a geri don (dongusel)
    if (nextVal > 99) {
      console.warn('Sequence 99\'u asti, 00\'a sifirlaniyor');
      return '00';
    }
    
    // Padded 2-digit format ile don
    return nextVal.toString().padStart(2, '0');
  };

  const generateMmGtDatabaseData = (sequence = '00') => {
    // Sequence degerini dogrula
    const validSequence = validateSequence(sequence);
    const capFormatted = Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0');
    const capValue = parseFloat(mmGtData.cap);
    
    // Preserve the exact format in existing Excel files
    const capForExcel = capValue.toFixed(2);
    const toleransPlusValue = parseFloat(mmGtData.tolerans_plus) || 0;
    const toleransMinusValue = parseFloat(mmGtData.tolerans_minus) || 0;

    // Hem stok_kodu'nda hem de iceride kullanilan sequence degerini guncel tut
    return {
      stok_kodu: `GT.${mmGtData.kod_2}.${capFormatted}.${validSequence}`,
      stok_adi: generateStokAdi(),
      grup_kodu: 'MM',
      kod_1: 'GT',
      kod_2: mmGtData.kod_2,
      muh_detay: '26',
      depo_kodu: '36',
      br_1: 'KG',
      br_2: 'TN',
      pay_1: 1,
      payda_1: 1.000, // Keep exact format as in Excel
      cevrim_degeri_1: 0,
      olcu_br_3: 'AD',
      cevrim_pay_2: 1,
      cevrim_payda_2: 1,
      cevrim_degeri_2: 1,
      cap: capValue, // Store as number for calculations
      kaplama: parseInt(mmGtData.kaplama),
      min_mukavemet: parseInt(mmGtData.min_mukavemet),
      max_mukavemet: parseInt(mmGtData.max_mukavemet),
      kg: parseInt(mmGtData.kg),
      ic_cap: parseInt(mmGtData.ic_cap),
      dis_cap: parseInt(mmGtData.dis_cap),
      cap2: capForExcel, // Use formatted string value
      tolerans_plus: toleransPlusValue, // Store as number for calculations
      tolerans_minus: toleransMinusValue, // Store as number for calculations
      shrink: mmGtData.shrink,
      unwinding: mmGtData.unwinding || '',
      cast_kont: mmGtData.cast_kont || '',
      helix_kont: mmGtData.helix_kont || '',
      elongation: mmGtData.elongation || '',
      amb_shrink: getShrinkCode(mmGtData.ic_cap),
      satis_kdv_orani: '20', // Match Excel format as string
      alis_kdv_orani: '20', // Match Excel format as string
      stok_turu: 'D',
      fiyat_birimi: 1,
      satis_tipi: 1,
      birim_agirlik: parseInt(mmGtData.kg),
      esnek_yapilandir: 'H',
      super_recete_kullanilsin: 'H',
      alis_doviz_tipi: 2,
      gumruk_tarife_kodu: getGumrukTarifeKodu(),
      ingilizce_isim: generateEnglishName(),
      // Technical spec columns - match Excel format exactly
      metarial: 'Low Carbon Steel Wire',
      dia_mm: capForExcel, // Use formatted string value
      dia_tol_mm_plus: toleransPlusValue, 
      dia_tol_mm_minus: toleransMinusValue,
      zing_coating: `${mmGtData.kaplama} gr/m²`,
      tensile_st_min: `${mmGtData.min_mukavemet} MPa`,
      tensile_st_max: `${mmGtData.max_mukavemet} MPa`,
      wax: 'NONE',
      lifting_lugs: mmGtData.shrink === 'evet' ? 'YES' : 'NO',
      coil_dimensions_id: mmGtData.ic_cap.toString(),
      coil_dimensions_od: mmGtData.dis_cap.toString(),
      coil_weight: mmGtData.kg.toString(),
      coil_weight_min: (parseInt(mmGtData.kg) * 0.95).toFixed(0),
      coil_weight_max: (parseInt(mmGtData.kg) * 1.05).toFixed(0)
    };
  };

  // Veritabani icin YM GT verisi olustur - Excel formatina tam uyumlu
  const generateYmGtDatabaseData = (sequence = '00') => {
    // Sequence degerini dogrula - MMGT ile ayni sequence kullanilmali
    const validSequence = validateSequence(sequence);
    const capFormatted = Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0');
    const capValue = parseFloat(mmGtData.cap);
    const capForExcel = capValue.toFixed(2);
    const toleransPlusValue = parseFloat(mmGtData.tolerans_plus) || 0;
    const toleransMinusValue = parseFloat(mmGtData.tolerans_minus) || 0;
    
    // Sequence degerlerinin MMGT ile ayni oldugunu logla
    
    return {
      stok_kodu: `YM.GT.${mmGtData.kod_2}.${capFormatted}.${validSequence}`,
      stok_adi: generateYmGtStokAdi(validSequence),
      grup_kodu: 'YM',
      kod_1: 'GT',
      kod_2: mmGtData.kod_2,
      muh_detay: '83',
      depo_kodu: '35',
      br_1: 'KG',
      br_2: 'TN',
      pay_1: 1,
      payda_1: 1.000, // Keep exact Excel format
      cevrim_degeri_1: 0,
      olcu_br_3: 'AD',
      cevrim_pay_2: 1,
      cevrim_payda_2: 1,
      cevrim_degeri_2: 1,
      cap: capValue, // Store as number for calculations
      kaplama: parseInt(mmGtData.kaplama),
      min_mukavemet: parseInt(mmGtData.min_mukavemet),
      max_mukavemet: parseInt(mmGtData.max_mukavemet),
      kg: parseInt(mmGtData.kg),
      ic_cap: parseInt(mmGtData.ic_cap),
      dis_cap: parseInt(mmGtData.dis_cap),
      cap2: capForExcel, // Use formatted string to match Excel
      tolerans_plus: toleransPlusValue,
      tolerans_minus: toleransMinusValue,
      shrink: mmGtData.shrink,
      unwinding: mmGtData.unwinding || '',
      cast_kont: mmGtData.cast_kont || '',
      helix_kont: mmGtData.helix_kont || '',
      elongation: mmGtData.elongation || '',
      satis_kdv_orani: '20', // Match Excel format as string
      alis_kdv_orani: '20', // Match Excel format as string
      stok_turu: 'D',
      fiyat_birimi: 1,
      satis_tipi: 1,
      birim_agirlik: parseInt(mmGtData.kg),
      esnek_yapilandir: 'H',
      super_recete_kullanilsin: 'H',
      alis_doviz_tipi: 2,
      ingilizce_isim: `YM Galvanized Wire ${capForExcel} mm -${Math.abs(toleransMinusValue).toFixed(2)}/+${toleransPlusValue.toFixed(2)} ${mmGtData.kaplama || '0'} gr/m² ${mmGtData.min_mukavemet || '0'}-${mmGtData.max_mukavemet || '0'} MPa ID:${mmGtData.ic_cap || '45'} cm OD:${mmGtData.dis_cap || '75'} cm ${mmGtData.kg || '0'} kg`
    };
  };

  // Veritabani icin YM ST verisi olustur - Excel formatina tam uyumlu
  const generateYmStDatabaseData = (ymSt) => {
    const capValue = parseFloat(ymSt.cap);
    const capForExcel = capValue.toFixed(2);
    
    return {
      stok_kodu: ymSt.stok_kodu,
      stok_adi: ymSt.stok_adi,
      grup_kodu: 'YM',
      kod_1: 'ST',
      kod_2: ymSt.filmasin.toString(), // Store filmasin value in kod_2 to match Excel
      kod_3: ymSt.quality, // Store quality value in kod_3 to match Excel
      muh_detay: '28',
      depo_kodu: '35',
      br_1: 'KG',
      br_2: 'TN',
      pay_1: 1,
      payda_1: 1.000, // Keep exact Excel format
      cevrim_degeri_1: 0,
      olcu_br_3: 'AD',
      cevrim_pay_2: 1,
      cevrim_payda_2: 1,
      cevrim_degeri_2: 1,
      satis_kdv_orani: '20', // Match Excel format as string
      cap: capValue, // Store as number for calculations
      filmasin: parseInt(ymSt.filmasin),
      quality: ymSt.quality,
      ozel_saha_1_say: parseInt(ymSt.filmasin), // This stores the filmasin value as in Excel
      birim_agirlik: ymSt.kg || 0,
      fiyat_birimi: 1,
      doviz_tip: 1,
      stok_turu: 'D',
      ingilizce_isim: `YM Black Wire ${capForExcel} mm Quality: ${ymSt.quality}`,
      esnek_yapilandir: 'H',
      super_recete_kullanilsin: 'H'
    };
  };

  // Receteleri kaydet - Yeni 1:1:n iliski modeli ile
  /**
   * Ayni cap, kod_2, vb. ozelliklere sahip urunler icin en yuksek sequence degerini bulur
   * @returns {Promise<string>} - Bulunan en yuksek sequence degeri veya '00'
   */
  const findHighestSequence = async () => {
    try {
      // Cap ve kod_2 degerleri icin arama kriterleri olustur
      const capFormatted = Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0');
      const searchPattern = `GT.${mmGtData.kod_2}.${capFormatted}.`;
      
      // Tum MM GT urunlerini getir
      const mmGtResponse = await fetchWithAuth(API_URLS.galMmGt);
      if (!mmGtResponse || !mmGtResponse.ok) {
        console.warn('MM GT urunleri alinamadi, sequence "00" kullanilacak');
        return '00';
      }
      
      const allMmGt = await mmGtResponse.json();
      if (!Array.isArray(allMmGt) || allMmGt.length === 0) {
        console.warn('MM GT urunu bulunamadi, sequence "00" kullanilacak');
        return '00';
      }
      
      // Benzer urunleri filtrele
      const similarProducts = allMmGt.filter(product => 
        product.stok_kodu && product.stok_kodu.startsWith(searchPattern)
      );
      
      if (similarProducts.length === 0) {
        return '00';
      }
      
      // En yuksek sequence degerini bul
      let highestSequence = '00';
      
      for (const product of similarProducts) {
        const parts = product.stok_kodu.split('.');
        if (parts.length === 4) {
          const currentSequence = parts[3];
          
          // Mevcut sequence numerik deger kontrolu
          if (/^\d{2}$/.test(currentSequence)) {
            // Sayisal olarak karsilastir (00 < 01 < 02 < ... < 99)
            if (parseInt(currentSequence, 10) > parseInt(highestSequence, 10)) {
              highestSequence = currentSequence;
            }
          }
        }
      }
      
      // Bir sonraki sequence degerini hesapla
      const nextSequenceNum = parseInt(highestSequence, 10) + 1;
      const nextSequence = nextSequenceNum.toString().padStart(2, '0');
      return nextSequence;
    } catch (error) {
      console.error('Sequence arama hatasi:', error);
      return '00';
    }
  };
  
  // Function to show approval confirmation modal
  const showApprovalConfirmation = () => {
    if (isEditingRequest && selectedRequest) {
      setShowApproveConfirmModal(true);
    } else {
      // If not editing a request, proceed normally
      continueSaveToDatabase(databaseIds.mmGtIds, databaseIds.ymGtId, databaseIds.ymStIds);
    }
  };
  
  // Function to approve the request and update its status
  const approveRequestAndContinue = async () => {
    if (!selectedRequest) {
      toast.error('Secili talep bulunamadi');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // FIXED: First save to database, THEN approve request only if save succeeds
      await continueSaveToDatabase(databaseIds.mmGtIds, databaseIds.ymGtId, databaseIds.ymStIds);
      
      // Only approve request AFTER successful database save
      
      // Generate the actual stok_kodu that was used during database save
      const capFormatted = Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0');
      const actualStokKodu = `GT.${mmGtData.kod_2}.${capFormatted}.${processSequence}`;
      
      
      const updateRequestData = {
        status: 'approved',
        processed_by: user?.username || user?.id || 'system',
        processed_at: new Date().toISOString(),
        stok_kodu: actualStokKodu // Update with the actual stok_kodu used in database
      };
      
      
      const updateResponse = await fetchWithAuth(`${API_URLS.galSalRequests}/${selectedRequest.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateRequestData)
      });
      
      if (!updateResponse || !updateResponse.ok) {
        const errorText = await updateResponse?.text() || 'Unknown error';
        console.error(`Failed to update request: ${updateResponse?.status} - ${errorText}`);
        throw new Error('Talep durumu guncellenemedi');
      }
      
      const updateResult = await updateResponse.json();
      
      // Only show approval success if we successfully updated the request
      toast.success('Talep basariyla onaylandi');
      
      // Reset editing state since it's now approved
      setIsEditingRequest(false);
      setIsInApprovalProcess(false); // Reset approval process flag to prevent double modals
      
      // Now also generate Excel files as the final step
      toast.info('Excel dosyalari olusturuluyor...');
      
      // Generate Excel files with saved data
      await generateExcelFiles();
      
      toast.success('Islem basariyla tamamlandi!');
      
      // Clear any existing success messages to avoid duplication
      setSuccessMessage('');
      setTimeout(() => {
        setSuccessMessage('Islem basariyla tamamlandi');
        
        // And clear it after 5 seconds
        setTimeout(() => {
          setSuccessMessage('');
        }, 5000);
      }, 100);
      
      // Make sure loading state is reset in all cases
      setIsLoading(false);
      
    } catch (error) {
      console.error('Talep onaylama hatasi:', error);
      toast.error('Talep onaylanamadi: ' + error.message);
      setIsLoading(false);
    } finally {
      // Extra insurance against stuck loading state
      setTimeout(() => {
        if (isLoading) {
          setIsLoading(false);
        }
      }, 5000);
    }
  };
  
  // The actual database save logic is defined below after saveRecipesToDatabase
  
  // This is the main function that gets called from UI
  const saveRecipesToDatabase = async (mmGtIds, ymGtId, ymStIds) => {
    
    // Save the parameters to database IDs state for later use
    setDatabaseIds({
      mmGtIds: mmGtIds || [],
      ymGtId: ymGtId || '',
      ymStIds: ymStIds || []
    });
    
    // Check if we're editing a request - show confirmation modal
    if (isEditingRequest && selectedRequest) {
      
      // Show the confirmation modal
      setShowApproveConfirmModal(true);
      
      // Don't continue here - let the button click drive the next steps
      return;
    } else {
      // If not editing a request, proceed with normal save
      await continueSaveToDatabase(mmGtIds, ymGtId, ymStIds);
    }
  };
  
  // The actual database save logic that was in the original saveRecipesToDatabase function
  const continueSaveToDatabase = async (mmGtIds, ymGtId, ymStIds) => {
    try {
      // If we're coming from the approval process, reset the editing state
      if (isEditingRequest) {
        setIsEditingRequest(false);
      }
      
      const allYmSts = [...selectedYmSts, ...autoGeneratedYmSts];
      const mainYmSt = allYmSts[mainYmStIndex] || allYmSts[0];
      
      // Sequence degeri MMGT ID'sinden degil, stok_kodu'ndan alinacak
      let sequence = processSequence || '00'; // Use processSequence state instead of hardcoded '00'
      
      let mmGtSequence = sequence; // Oncelikle sequence parametresini kullan
      let mmGtStokKodu = '';
      let ymGtSequence = sequence; // YMGT icin de ayni sequence kullan
      let ymGtStokKodu = '';
      
      // 1. MMGT stok_kodu'nu direkt olarak veritabanindan al
      if (mmGtIds.length > 0) {
        const mmGtId = mmGtIds[0];
        
        try {
          // MMGT'yi tum liste icinden bulma yaklasimi - 404 hatasini onlemek icin
          const allMmGtResponse = await fetchWithAuth(API_URLS.galMmGt);
          if (allMmGtResponse && allMmGtResponse.ok) {
            const allMmGt = await allMmGtResponse.json();
            // ID'ye gore ilgili urunu bul
            const mmGt = Array.isArray(allMmGt) ? allMmGt.find(item => item.id === mmGtId) : null;
            
            if (mmGt && mmGt.stok_kodu) {
              mmGtStokKodu = mmGt.stok_kodu;
              mmGtSequence = mmGt.stok_kodu.split('.').pop();
              
              if (mmGtSequence === '00') {
                console.warn(`UYARI: MMGT urunu veritabaninda "00" sequence ile kaydedilmis`);
              } else {
              }
            } else {
              console.error(`MMGT veritabaninda bulunamadi veya stok_kodu eksik! ID: ${mmGtId}`);
              // Urun bulunamadi durumunda otomatik kod olustur
              const capFormatted = Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0');
              mmGtStokKodu = `GT.${mmGtData.kod_2}.${capFormatted}.00`;
              mmGtSequence = '00';
            }
          } else {
            console.error(`MMGT veritabanindan alinamadi! ID: ${mmGtId}`);
            // API hatasi durumunda otomatik kod olustur
            const capFormatted = Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0');
            mmGtStokKodu = `GT.${mmGtData.kod_2}.${capFormatted}.00`;
            mmGtSequence = '00';
          }
        } catch (error) {
          console.error(`MMGT bilgileri alinirken hata: ${error.message}`);
          // Hata durumunda otomatik kod olustur
          const capFormatted = Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0');
          mmGtStokKodu = `GT.${mmGtData.kod_2}.${capFormatted}.00`;
          mmGtSequence = '00';
        }
      }
      
      // 2. YMGT stok_kodu'nu direkt olarak veritabanindan al
      if (ymGtId) {
        try {
          // YMGT'yi tum liste icinden bulma yaklasimi - 404 hatasini onlemek icin
          const allYmGtResponse = await fetchWithAuth(API_URLS.galYmGt);
          if (allYmGtResponse && allYmGtResponse.ok) {
            const allYmGt = await allYmGtResponse.json();
            // ID'ye gore ilgili urunu bul
            const ymGt = Array.isArray(allYmGt) ? allYmGt.find(item => item.id === ymGtId) : null;
            
            if (ymGt && ymGt.stok_kodu) {
              ymGtStokKodu = ymGt.stok_kodu;
              ymGtSequence = ymGt.stok_kodu.split('.').pop();
              
              if (ymGtSequence === '00') {
                console.warn(`UYARI: YMGT urunu veritabaninda "00" sequence ile kaydedilmis`);
              } else {
              }
              
              // MMGT ve YMGT ayni sequence'e sahip olmali!
              if (mmGtSequence !== ymGtSequence) {
                console.error(`SORUN! MMGT ve YMGT farkli sequence'lere sahip! MMGT: ${mmGtSequence}, YMGT: ${ymGtSequence}`);
                // YMGT sequence'i MMGT ile ayni yap - kritik duzeltme
                ymGtSequence = mmGtSequence;
              }
            } else {
              console.error(`YMGT veritabaninda bulunamadi veya stok_kodu eksik! ID: ${ymGtId}`);
              // Urun bulunamadi durumunda otomatik kod olustur
              const capFormatted = Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0');
              // Veritabaninda beklendigi sekilde olustur - sequence degeri eksikse '00' kullan
              ymGtStokKodu = `YM.GT.${mmGtData.kod_2}.${capFormatted}.${sequence}`; // sequence degeri fonksiyonun parametresi
            }
          } else {
            console.error(`YMGT veritabanindan alinamadi! ID: ${ymGtId}`);
            // API hatasi durumunda otomatik kod olustur
            const capFormatted = Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0');
            // Veritabaninda beklendigi sekilde olustur - sequence degeri eksikse '00' kullan
            ymGtStokKodu = `YM.GT.${mmGtData.kod_2}.${capFormatted}.${sequence}`; // sequence degeri fonksiyonun parametresi
          }
        } catch (error) {
          console.error(`YMGT bilgileri alinirken hata: ${error.message}`);
          // Hata durumunda otomatik kod olustur
          const capFormatted = Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0');
          // Veritabaninda beklendigi sekilde olustur - sequence degeri eksikse '00' kullan
          ymGtStokKodu = `YM.GT.${mmGtData.kod_2}.${capFormatted}.${sequence}`; // sequence degeri fonksiyonun parametresi
        }
      }
      
      
      // YMGT kontrolu yap ve eger gerekiyorsa MMGT ile ayni sequence'e guncelle
      if (ymGtId && sequence !== '00') {
        const ymGtResponse = await fetchWithAuth(`${API_URLS.galYmGt}/${ymGtId}`);
        if (ymGtResponse && ymGtResponse.ok) {
          const ymGt = await ymGtResponse.json();
          if (ymGt && ymGt.stok_kodu) {
            const ymGtCurrentSequence = ymGt.stok_kodu.split('.').pop();
            
            // MMGT ile ayni sequence olup olmadigini kontrol et
            if (ymGtCurrentSequence !== sequence) {
              console.warn(`Sequence uyumsuzlugu! MMGT: ${sequence}, YMGT: ${ymGtCurrentSequence}`);
              console.warn(`YMGT sequence guncelleniyor: ${ymGtCurrentSequence} -> ${sequence}`);
              
              // YMGT'yi MMGT ile ayni sequence'e guncelle
              const capFormatted = Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0');
              const updatedYmGtStokKodu = `YM.GT.${mmGtData.kod_2}.${capFormatted}.${sequence}`;
              const updatedYmGtStokAdi = generateYmGtStokAdi(sequence);
              
              await fetchWithAuth(`${API_URLS.galYmGt}/${ymGtId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  ...generateYmGtDatabaseData(sequence),
                  stok_kodu: updatedYmGtStokKodu,
                  stok_adi: updatedYmGtStokAdi
                })
              });
              
            }
          }
        }
      }
      
      // ONEMLI: Receteleri kaydetmeden once, tum mevcut receteleri sil
      // Bu sekilde yeni sequence'li receteler eklenecek
      
      // Sadece 1 MM GT recetesini kaydet
      if (mmGtIds.length > 0) {
        // mmGtStokKodu null ise olustur
        if (!mmGtStokKodu) {
          const capFormatted = Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0');
          mmGtStokKodu = `GT.${mmGtData.kod_2}.${capFormatted}.00`;
          mmGtSequence = '00';
        }
        const mmGtId = mmGtIds[0]; // Artik sadece 1 tane MM GT var
        const mmGtRecipe = allRecipes.mmGtRecipes[mainYmStIndex] || {}; // Ana YM ST'ye bagli MM GT recetesi
        
        
        // MMGT icin mevcut tum receteleri kontrol et ve sil
        try {
          // 1. Tum mevcut receteleri getir
          const allRecipesResponse = await fetchWithAuth(`${API_URLS.galMmGtRecete}?mm_gt_id=${mmGtId}`);
          if (allRecipesResponse && allRecipesResponse.ok) {
            const allRecipesData = await allRecipesResponse.json();
            
            // 2. Her receteyi kontrol et, yanlis mamul_kodu veya bilesen_kodu icerenleri sil
            for (const recipe of allRecipesData) {
              // mamul_kodu mmGtStokKodu ile ayni degilse sil
              if (recipe.mamul_kodu !== mmGtStokKodu) {
                try {
                  await fetchWithAuth(`${API_URLS.galMmGtRecete}/${recipe.id}`, { method: 'DELETE' });
                } catch (deleteError) {
                  console.error(`MMGT recetesi silinemedi: ${deleteError.message}`);
                }
              }
            }
          } else {
          }
        } catch (error) {
          console.error('MMGT receteleri kontrol edilirken hata:', error);
          // Hata durumunda isleme devam et
        }
        
        // Tum mevcut receteleri sil - guvenlik icin
        // Receteleri kontrol et ve yanlis mamul_kodu icerenleri temizle
        await checkAndFixStokKodu('mmgt', mmGtId, mmGtStokKodu);
        
        // Tum mevcut receteleri sil
        await deleteExistingRecipes('mmgt', mmGtId);
        
        let siraNo = 1;
        const capFormatted = Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0');
        
        // KRITIK: mamul_kodu kesinlikle ve kesinlikle MMGT stok karti tablosundaki stok_kodu ile ayni olmali
        const mamulKodu = mmGtStokKodu;
        
        // Son bir kontrol: mmGtStokKodu bos olmamali ve dogru formatta olmali
        if (!mamulKodu || !mamulKodu.includes('.')) {
          console.error(`HATA! Gecersiz MMGT stok_kodu: ${mamulKodu}`);
          throw new Error(`Gecersiz MMGT stok_kodu: ${mamulKodu}`);
        }
        
        
        // Son bir kontrol: sequence dogru mu?
        const recordSequence = mamulKodu.split('.').pop();
        if (recordSequence !== mmGtSequence) {
          console.error(`UYARI! Sequence tutarsizligi: Recete icin ${recordSequence}, Stok icin ${mmGtSequence}`);
        }
        
        // MMGT recete siralamasi: Excel ile TAM UYUMLU kesin siralama
        // DUZELTME: Siralama: 1. YM.GT, 2. GTPKT01, 3. KARTON, 4. HALKA, 5. CEMBER, 6. TOKA, 7. DESI, 8. SHRINK (sadece bir adet), 9. Digerleri
        const recipeEntries = Object.entries(mmGtRecipe);
        
        // Her bileseni TAMAMEN Excel ile ayni sekilde bul - KESIN ISIMLERIYLE
        const ymGtEntry = recipeEntries.find(([key]) => key.includes('YM.GT.'));
        const gtpkt01Entry = recipeEntries.find(([key]) => key === 'GTPKT01');
        const kartonEntry = recipeEntries.find(([key]) => key === 'AMB.CEM.KARTON.GAL');
        const halkaEntry = recipeEntries.find(([key]) => key === 'SM.7MMHALKA');
        const cemberEntry = recipeEntries.find(([key]) => key === 'AMB.APEX CEMBER 38X080');
        const tokaEntry = recipeEntries.find(([key]) => key === 'AMB.TOKA.SIGNODE.114P. DKP');
        const desiEntry = recipeEntries.find(([key]) => key === 'SM.DESI.PAK');
        
        // DUZELTME: Shrink bileseni isleniyor - eger birden fazla var ise sadece birini al
        let shrinkEntry = null;
        const shrinkEntries = recipeEntries.filter(([key]) => key.includes('AMB.SHRINK.'));
        if (shrinkEntries.length > 0) {
          // Sadece ilk shrink girisini al - digerleri yok sayilacak
          shrinkEntry = shrinkEntries[0];
          
          // Uyari ver
          if (shrinkEntries.length > 1) {
            console.warn(`Birden fazla Shrink bileseni var! Sadece ${shrinkEntry[0]} kullanilacak, digerleri atlanacak.`);
            console.warn(`Shrink bilesenleri:`, shrinkEntries.map(([key]) => key).join(', '));
          }
        }
        
        // Diger tum bilesenler - Excel ile TAM UYUMLU sekilde tanimla
        const otherEntries = recipeEntries.filter(([key]) => 
          !key.includes('YM.GT.') && 
          key !== 'GTPKT01' &&
          key !== 'AMB.CEM.KARTON.GAL' &&
          !key.includes('AMB.SHRINK.') && // Tum shrink bilesenlerini haric tut
          key !== 'SM.7MMHALKA' &&
          key !== 'AMB.APEX CEMBER 38X080' &&
          key !== 'AMB.TOKA.SIGNODE.114P. DKP' &&
          key !== 'SM.DESI.PAK'
        );
        
        // DUZELTME: Excel formatina tam uygun sirada ekle - Shrink en sonda
        const orderedEntries = [
          ymGtEntry, 
          gtpkt01Entry, 
          kartonEntry,
          halkaEntry,
          cemberEntry,
          tokaEntry,
          desiEntry,
          // Shrink en sonda yer alacak
          shrinkEntry,
          ...otherEntries
        ].filter(Boolean);
        
        for (const [key, value] of orderedEntries) {
          if (value > 0) {
            // Operasyon/Bilesen siniflandirmasi duzeltmesi
            // Excel format requires GTPKT01 to be marked as Operasyon, all others as Bilesen
            const operasyonBilesen = key === 'GTPKT01' ? 'Operasyon' : 'Bilesen';
            
            // We don't need isSpecialCode check anymore, all handling is in operasyonBilesen
            
            // Tam kod kontrolu ve log kaydi
            
            // Format the value exactly as it would appear in Excel, using points as decimal separators
            let formattedValue = value;
            if (typeof value === 'number') {
              formattedValue = value.toLocaleString('en-US', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 5,
                useGrouping: false // No thousand separators
              });
            }
            
            // Son bir kontrol: mamulKodu'nun sequence'ini dogrula
            const recordSequence = mamulKodu.split('.').pop();
            if (recordSequence !== mmGtSequence) {
              console.error(`Sequence uyusmazligi! Recete kaydediliyor: ${recordSequence}, olmasi gereken: ${mmGtSequence}`);
            }
            
            
            // BURADA ONEMLI: MMGT receteleri icin her zaman dogru sequence'i iceren mamul_kodu kullanmak cok onemli
            
            // Tum parametreleri logla
            const receteParams = {
              mm_gt_id: mmGtId,
              mamul_kodu: mamulKodu, // ONEMLI: Her zaman dogru sequence ile guncel mamul_kodu
              bilesen_kodu: key,
              miktar: formattedValue,
              sira_no: siraNo++,
              operasyon_bilesen: operasyonBilesen,
              olcu_br: getOlcuBr(key),
            };
            
            // Baska bir recete ile cakisma olabilir mi kontrol et
            try {
              const checkResponse = await fetchWithAuth(`${API_URLS.galMmGtRecete}?mm_gt_id=${mmGtId}`);
              if (checkResponse && checkResponse.ok) {
                const existingRecipes = await checkResponse.json();
                const conflictRecipe = existingRecipes.find(r => r.bilesen_kodu === key && r.mamul_kodu !== mamulKodu);
                if (conflictRecipe) {
                  console.error(`CAKISMA! Farkli mamul_kodu ile recete mevcut: ${conflictRecipe.mamul_kodu} (silinecek)`);
                  try {
                    await fetchWithAuth(`${API_URLS.galMmGtRecete}/${conflictRecipe.id}`, { method: 'DELETE' });
                  } catch (deleteError) {
                    console.error(`Cakisan recete silinemedi: ${deleteError.message}`);
                    // Silme hatasina ragmen devam et
                  }
                }
              } else if (checkResponse && checkResponse.status === 404) {
                // 404 hatasi - recete hic yok, sorun degil, devam et
              } else {
                // Diger API hatalari
                console.warn(`MMGT receteleri sorgulanamadi - HTTP ${checkResponse ? checkResponse.status : 'unknown'}`);
              }
            } catch (checkError) {
              console.error(`Recete cakismasi kontrol edilirken hata: ${checkError.message}`);
              // Hata durumunda bile isleme devam et
            }
            
            // Receteyi olusturmaya devam et
            try {
              const saveResponse = await fetchWithAuth(API_URLS.galMmGtRecete, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  ...receteParams,
                  olcu_br_bilesen: '1',
                  aciklama: getReceteAciklama(key),
                  ua_dahil_edilsin: 'evet',
                  son_operasyon: 'evet',
                  recete_top: 1,
                  fire_orani: 0.0004, // Match Excel format
                  // Additional fields for better Netsis compatibility - match Excel
                  miktar_sabitle: 'H',
                  stok_maliyet: 'S',
                  fire_mik: '0',
                  sabit_fire_mik: '0',
                  istasyon_kodu: '',
                  hazirlik_suresi: key.includes('01') ? 0 : null,
                  uretim_suresi: key.includes('01') ? formattedValue : null, // Use formatted value
                  oncelik: '0',
                  planlama_orani: '100',
                  alt_pol_da_transfer: 'H',
                  alt_pol_ambar_cikis: 'H',
                  alt_pol_uretim_kaydi: 'H',
                  alt_pol_mrp: 'H',
                  ic_dis: 'I'
                })
              });
              
              if (saveResponse && saveResponse.ok) {
              } else {
                console.error(`MMGT recetesi kaydedilemedi: ${key}, HTTP ${saveResponse ? saveResponse.status : 'unknown'}`);
              }
            } catch (saveError) {
              console.error(`MMGT recetesi kaydedilirken hata: ${saveError.message}`);
              // Kaydetme hatasi olussa bile diger receteleri eklemeye devam et
            }
          }
        }
      }
      
      // Sadece 1 YM GT icin recete kaydet - Excel formatiyla tam uyumlu
      if (ymGtId && Object.keys(allRecipes.ymGtRecipe).length > 0) {
        // ymGtStokKodu null ise olustur
        if (!ymGtStokKodu) {
          const capFormatted = Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0');
          ymGtStokKodu = `YM.GT.${mmGtData.kod_2}.${capFormatted}.${mmGtSequence}`;
        }
        
        
        // *** KRITIK DUZELTME *** - ID ile degil, stok_kodu ile kayit bul
        // Bu yaklasim, hem 404 Not Found hem de 409 Conflict hatalarini onler
        
        try {
          // Once stok_kodu ile dogrudan ara
          const searchResponse = await fetchWithAuth(`${API_URLS.galYmGt}?stok_kodu=${encodeURIComponent(ymGtStokKodu)}`);
          
          let actualYmGtId = null;
          
          if (searchResponse && searchResponse.ok) {
            const searchResults = await searchResponse.json();
            
            if (Array.isArray(searchResults) && searchResults.length > 0) {
              // Mevcut kaydin ID'sini kullan
              actualYmGtId = searchResults[0].id;
            } else {
              // Tam eslesme yoksa, benzer aramayla dene
              
              // Once kod_2 ve cap ile ara
              try {
                const baseCode = ymGtStokKodu.split('.').slice(0, 3).join('.');
                const likeResponse = await fetchWithAuth(`${API_URLS.galYmGt}?stok_kodu_like=${encodeURIComponent(baseCode)}`);
                
                if (likeResponse && likeResponse.ok) {
                  const likeResults = await likeResponse.json();
                  
                  if (Array.isArray(likeResults) && likeResults.length > 0) {
                    // Tam eslesme araniyor
                    const exactMatch = likeResults.find(item => item.stok_kodu === ymGtStokKodu);
                    
                    if (exactMatch) {
                      actualYmGtId = exactMatch.id;
                    } else {
                      // En yakin eslesme (ayni cap ve kod) kullaniliyor
                      actualYmGtId = likeResults[0].id;
                    }
                  } else {
                    // Hic benzer kayit bulunamadi - yeni olusturulacak
                  }
                } else {
                }
              } catch (likeError) {
                console.error(`YMGT benzer arama hatasi: ${likeError.message}`);
                // Hata olursa yeni kayit olusturmaya devam et
              }
              
              // ID bulunamadiysa, yeni kayit olustur
              if (!actualYmGtId) {
                try {
                  
                  const createResponse = await fetchWithAuth(API_URLS.galYmGt, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(generateYmGtDatabaseData(mmGtSequence))
                  });
                  
                  if (createResponse && createResponse.ok) {
                    const result = await createResponse.json();
                    actualYmGtId = result.id;
                  } else if (createResponse && createResponse.status === 409) {
                    // 409 Conflict - baska bir tam arama yontemi dene
                    
                    // Tum YMGT'leri getirip tam uyan var mi kontrol et
                    try {
                      const allYmGtResponse = await fetchWithAuth(API_URLS.galYmGt);
                      
                      if (allYmGtResponse && allYmGtResponse.ok) {
                        const allYmGts = await allYmGtResponse.json();
                        
                        if (Array.isArray(allYmGts) && allYmGts.length > 0) {
                          const exactMatch = allYmGts.find(item => item.stok_kodu === ymGtStokKodu);
                          
                          if (exactMatch) {
                            actualYmGtId = exactMatch.id;
                          } else {
                            // Son care - mmGtId ile iliskili YMGT'leri ara
                            const relatedYmGt = allYmGts.find(item => item.mm_gt_id === mmGtIds[0] || 
                              item.stok_kodu.includes(mmGtData.kod_2) && 
                              item.stok_kodu.includes(Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0')));
                              
                            if (relatedYmGt) {
                              actualYmGtId = relatedYmGt.id;
                            } else {
                              console.error(`YMGT icin hicbir uygun kayit bulunamadi! Islem yapilamiyor.`);
                              return; // Cik
                            }
                          }
                        } else {
                          console.error(`YMGT listesi bos veya gecersiz! Islem yapilamiyor.`);
                          return; // Cik
                        }
                      } else {
                        console.error(`YMGT listesi alinamadi! Islem yapilamiyor.`);
                        return; // Cik
                      }
                    } catch (allError) {
                      console.error(`YMGT listesi alinirken hata: ${allError.message}`);
                      return; // Cik
                    }
                  } else {
                    console.error(`YMGT olusturulamadi: HTTP ${createResponse ? createResponse.status : 'unknown'}`);
                    return; // Cik
                  }
                } catch (createError) {
                  console.error(`YMGT olusturma hatasi: ${createError.message}`);
                  return; // Cik
                }
              }
            }
          } else {
            console.error(`YMGT arama hatasi: HTTP ${searchResponse ? searchResponse.status : 'unknown'}`);
            return; // Cik
          }
          
          // Bu noktada mutlaka gecerli bir ID'ye sahip olmaliyiz
          if (!actualYmGtId) {
            console.error(`YMGT icin gecerli ID bulunamadi! Islem yapilamiyor.`);
            return; // Cik
          }
          
          // ID'yi guncelle
          ymGtId = actualYmGtId;
        } catch (mainError) {
          console.error(`YMGT arama/olusturma islemi sirasinda kritik hata: ${mainError.message}`);
          return; // Kritik hata durumunda cik
        }
        
        // MMGT ve YMGT sequence degerlerini karsilastir ve gerekirse YMGT'yi guncelle
        // sequence degiskeni fonksiyon parametresi, mmGtSequence henuz tanimlanmamis
        const currentSequence = sequence;
        if (currentSequence !== ymGtSequence && currentSequence !== '00') {
          console.error(`UYARI! YMGT sequence (${ymGtSequence}) ile secilen sequence (${currentSequence}) eslesmiyor!`);
          
          // YMGT'yi MMGT ile ayni sequence'e guncelle
          const capFormatted = Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0');
          const updatedYmGtStokKodu = `YM.GT.${mmGtData.kod_2}.${capFormatted}.${currentSequence}`;
          
          try {
            console.warn(`YMGT stok_kodu duzeltiliyor: ${ymGtStokKodu} → ${updatedYmGtStokKodu}`);
            
            await fetchWithAuth(`${API_URLS.galYmGt}/${ymGtId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...generateYmGtDatabaseData(currentSequence),
                stok_kodu: updatedYmGtStokKodu
              })
            });
            
            // Guncellenmis kodu kullan
            ymGtStokKodu = updatedYmGtStokKodu;
            ymGtSequence = currentSequence;
            
          } catch (updateError) {
            console.error(`YMGT guncellenirken hata: ${updateError.message}`);
          }
        }
        
        // Son kontrol: ymGtStokKodu gecerli olmali
        if (!ymGtStokKodu || !ymGtStokKodu.includes('.')) {
          console.error(`HATA! Gecersiz YMGT stok_kodu: ${ymGtStokKodu}`);
          throw new Error(`Gecersiz YMGT stok_kodu: ${ymGtStokKodu}`);
        }
        
        // YMGT icin mevcut tum receteleri kontrol et ve sil
        try {
          // 1. Tum mevcut receteleri getir
          const allRecipesResponse = await fetchWithAuth(`${API_URLS.galYmGtRecete}?ym_gt_id=${ymGtId}`);
          if (allRecipesResponse && allRecipesResponse.ok) {
            const allRecipesData = await allRecipesResponse.json();
            
            // 2. Her receteyi kontrol et, yanlis mamul_kodu icerenleri sil
            for (const recipe of allRecipesData) {
              // mamul_kodu ymGtStokKodu ile ayni degilse sil
              if (recipe.mamul_kodu !== ymGtStokKodu) {
                try {
                  await fetchWithAuth(`${API_URLS.galYmGtRecete}/${recipe.id}`, { method: 'DELETE' });
                } catch (deleteError) {
                  console.error(`YMGT recetesi silinemedi: ${deleteError.message}`);
                }
              }
            }
          } else {
          }
        } catch (error) {
          console.error('YMGT receteleri kontrol edilirken hata:', error);
          // Hata durumunda isleme devam et
        }
        
        // Guvenlik icin tum receteleri temizle
        // Receteleri kontrol et ve yanlis mamul_kodu icerenleri temizle
        await checkAndFixStokKodu('ymgt', ymGtId, ymGtStokKodu);
        
        // Tum mevcut receteleri sil
        await deleteExistingRecipes('ymgt', ymGtId);
        
        
        // YM GT'yi bul - olusturulmus stok kodu ile
        const existingYmGt = await checkExistingProduct(API_URLS.galYmGt, ymGtStokKodu);
        if (existingYmGt) {
          // ONEMLI: Once receteleri sil, her durumda mevcut receteleri silip yeniden olustur
          // Receteleri kontrol et ve yanlis mamul_kodu icerenleri temizle
          await checkAndFixStokKodu('ymgt', existingYmGt.id, ymGtStokKodu);
          
          // Tum mevcut receteleri sil
          await deleteExistingRecipes('ymgt', existingYmGt.id);
          
          let siraNo = 1;
          
          // YMGT recete siralamasi - Excel formatina uygun kesin siralama 
          // Siralama: 1. YM.ST (ana), 2. GLV01, 3. Cinko, 4. Asit, 5. Digerleri
          const recipeEntries = Object.entries(allRecipes.ymGtRecipe);
          
          // Define mainYmSt from available data
          const allYmSts = [...selectedYmSts, ...autoGeneratedYmSts];
          const mainYmSt = allYmSts[mainYmStIndex] || allYmSts[0];
          
          // Her bilesen turunu ayri ayri bul - tam eslesme kontrolu ile
          let ymStEntry = null;
          
          // Ana YM.ST icin guvenlik kontrolleri
          if (!mainYmSt || !mainYmSt.stok_kodu) {
            console.error(`HATA: Ana YM.ST bilgileri eksik veya gecersiz! YMGT recetesi olusturulamayabilir.`);
            console.error('Available YM STs:', allYmSts.map(ym => ({ stok_kodu: ym.stok_kodu, source: ym.source })));
          } else {
            // Once tam eslesme ara
            ymStEntry = recipeEntries.find(([key]) => key === mainYmSt.stok_kodu);
            
            // Tam eslesme yoksa, kismi eslesme dene
            if (!ymStEntry) {
              const anyYmStEntry = recipeEntries.find(([key]) => key.includes('YM.ST.'));
              if (anyYmStEntry) {
                console.warn(`Ana YM.ST (${mainYmSt.stok_kodu}) recetede bulunamadi, alternatif kullaniliyor: ${anyYmStEntry[0]}`);
                ymStEntry = anyYmStEntry;
              } else {
                console.error(`HATA: YMGT recetesinde YM.ST bileseni bulunamadi!`);
                // CRITICAL FIX: Create the missing YM.ST entry
                if (mainYmSt && mainYmSt.stok_kodu) {
                  ymStEntry = [mainYmSt.stok_kodu, 1];
                }
              }
            }
          }
          
          // Kritik operasyon ve bilesenleri tam kod eslesmesi ile bul
          const glv01Entry = recipeEntries.find(([key]) => key === 'GLV01');
          const cinkoEntry = recipeEntries.find(([key]) => key === '150 03');
          const asitEntry = recipeEntries.find(([key]) => key === 'SM.HIDROLIK.ASIT');
          
          // Eksik kritik bilesenleri kontrol et ve uyar
          if (!glv01Entry) {
            console.error(`HATA: YMGT recetesinde GLV01 operasyonu bulunamadi!`);
          }
          
          if (!cinkoEntry) {
            console.warn(`UYARI: YMGT recetesinde cinko bileseni (150 03) bulunamadi!`);
          }
          
          if (!asitEntry) {
            console.warn(`UYARI: YMGT recetesinde asit bileseni (SM.HIDROLIK.ASIT) bulunamadi!`);
          }
          
          // Diger bilesenler - kesin kod eslesmesi ile filtrele
          const otherEntries = recipeEntries.filter(([key]) => 
            key !== (mainYmSt?.stok_kodu || '') && 
            !key.includes('YM.ST.') && 
            key !== 'GLV01' && 
            key !== '150 03' && 
            key !== 'SM.HIDROLIK.ASIT'
          );
          
          // Excel formatina tam uygun sirada ekle - HER ZAMAN SADECE 1 GLV01 OPERASYONu olmali
          const orderedEntries = [
            ymStEntry ? [mainYmSt.stok_kodu, ymStEntry[1]] : null, // Ana YM ST'yi kullan
            glv01Entry,  // Sadece 1 galvanizleme operasyonu
            cinkoEntry,  // Cinko bileseni  
            asitEntry,   // Asit bileseni
            ...otherEntries
          ].filter(Boolean);
          
          for (const [key, value] of orderedEntries) {
            if (value > 0) {
              // Format the value exactly as it would appear in Excel, using points as decimal separators
              let formattedValue = value;
              if (typeof value === 'number') {
                formattedValue = value.toLocaleString('en-US', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 5,
                  useGrouping: false // No thousand separators
                });
              }
              
              // Son bir kontrol: ymGtStokKodu'nun sequence'ini dogrula
              const recordSequence = ymGtStokKodu.split('.').pop();
              if (recordSequence !== mmGtSequence) {
                console.error(`YMGT Sequence uyusmazligi! Recete kaydediliyor: ${recordSequence}, olmasi gereken: ${mmGtSequence}`);
                
                // Sequence farkliysa dogru sequence ile duzelt - COK ONEMLI
                const capFormatted = Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0');
                const updatedYmGtStokKodu = `YM.GT.${mmGtData.kod_2}.${capFormatted}.${mmGtSequence}`;
                
                // YMGT veritabanindaki kaydi guncelle
                try {
                  console.warn(`YMGT stok_kodu son kez duzeltiliyor: ${ymGtStokKodu} → ${updatedYmGtStokKodu}`);
                  
                  await fetchWithAuth(`${API_URLS.galYmGt}/${ymGtId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      ...generateYmGtDatabaseData(sequence),
                      stok_kodu: updatedYmGtStokKodu
                    })
                  });
                  
                  // Guncellenmis kodu kullan
                  ymGtStokKodu = updatedYmGtStokKodu;
                } catch (updateError) {
                  console.error(`YMGT kaydi guncellenirken hata: ${updateError.message}`);
                }
              }
              
              
              // BURADA ONEMLI: YMGT receteleri icin her zaman dogru sequence'i iceren mamul_kodu kullanmak cok onemli
              
              // Son bir kez daha kontrol et - YMGT'nin stok_kodu ile tamamiyla ayni olmasini garantile
              // Liste yaklasimini kullan - 404 hatasini onlemek icin
              const allYmGtResponse = await fetchWithAuth(API_URLS.galYmGt);
              if (allYmGtResponse && allYmGtResponse.ok) {
                const allYmGt = await allYmGtResponse.json();
                const doubleCheckYmGt = Array.isArray(allYmGt) ? allYmGt.find(item => item.id === existingYmGt.id) : null;
                if (doubleCheckYmGt && doubleCheckYmGt.stok_kodu) {
                  if (doubleCheckYmGt.stok_kodu !== ymGtStokKodu) {
                    console.warn(`UYARI! YMGT stok_kodu (${doubleCheckYmGt.stok_kodu}) ile recete mamul_kodu (${ymGtStokKodu}) eslesmiyor!`);
                    
                    // Tutarsizligi coz - stok tablosundaki kodu kullanmak yerine, stok tablosunu duzeltmeyi dene
                    const dbSequence = doubleCheckYmGt.stok_kodu.split('.').pop();
                    if (dbSequence !== mmGtSequence) {
                      // MMGT'den gelen sequence'i kullanmaliyiz - veritabanini duzelt!
                      try {
                        console.warn(`YMGT stok tablosundaki kaydi duzeltme girisimi: ${doubleCheckYmGt.stok_kodu} → ${ymGtStokKodu}`);
                        
                        await fetchWithAuth(`${API_URLS.galYmGt}/${existingYmGt.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            ...generateYmGtDatabaseData(sequence),
                            stok_kodu: ymGtStokKodu
                          })
                        });
                        
                      } catch (error) {
                        console.error(`YMGT stok tablosu guncellenirken hata: ${error.message}`);
                        
                        // Guncellenemezse mevcut veritabani kodunu kullan
                        ymGtStokKodu = doubleCheckYmGt.stok_kodu;
                      }
                    } else {
                      // Esit sequence degerleri, ama farkli stok_kodu - veritabanindaki kodu kullan
                      ymGtStokKodu = doubleCheckYmGt.stok_kodu;
                    }
                  } else {
                  }
                } else {
                  console.warn(`UYARI: YMGT stok kaydinda stok_kodu bulunamadi!`);
                }
              } else {
                console.warn(`UYARI: YMGT stok kaydina erisilemedi!`);
              }
              
              // Tum parametreleri logla
              const receteParams = {
                ym_gt_id: existingYmGt.id,
                mamul_kodu: ymGtStokKodu, // ONEMLI: Her zaman dogru sequence ile guncel mamul_kodu
                bilesen_kodu: key,
                miktar: formattedValue,
                sira_no: siraNo++,
                // DUZELTME: YM.ST ve FLM kodlari her zaman bilesen, sadece GLV01 ve TLC01 operasyon
                operasyon_bilesen: key === 'GLV01' ? 'Operasyon' : 'Bilesen', // Only GLV01 is Operasyon in YMGT recipes
                olcu_br: getOlcuBr(key),
              };
              
              // Baska bir recete ile cakisma olabilir mi kontrol et
              try {
                const checkResponse = await fetchWithAuth(`${API_URLS.galYmGtRecete}?ym_gt_id=${existingYmGt.id}`);
                if (checkResponse && checkResponse.ok) {
                  const existingRecipes = await checkResponse.json();
                  const conflictRecipe = existingRecipes.find(r => r.bilesen_kodu === key && r.mamul_kodu !== ymGtStokKodu);
                  if (conflictRecipe) {
                    console.error(`CAKISMA! Farkli mamul_kodu ile YMGT recete mevcut: ${conflictRecipe.mamul_kodu} (silinecek)`);
                    try {
                      await fetchWithAuth(`${API_URLS.galYmGtRecete}/${conflictRecipe.id}`, { method: 'DELETE' });
                    } catch (deleteError) {
                      console.error(`Cakisan YMGT recetesi silinemedi: ${deleteError.message}`);
                      // Silme hatasina ragmen devam et
                    }
                  }
                } else if (checkResponse && checkResponse.status === 404) {
                  // 404 hatasi - recete hic yok, sorun degil, devam et
                } else {
                  // Diger API hatalari
                  console.warn(`YMGT receteleri sorgulanamadi - HTTP ${checkResponse ? checkResponse.status : 'unknown'}`);
                }
              } catch (checkError) {
                console.error(`YMGT recete cakismasi kontrol edilirken hata: ${checkError.message}`);
                // Hata durumunda bile isleme devam et
              }
              
              // Receteyi olusturmaya devam et
              try {
                const saveResponse = await fetchWithAuth(API_URLS.galYmGtRecete, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    ...receteParams,
                    olcu_br_bilesen: '1',
                    aciklama: getReceteAciklama(key),
                    recete_top: 1,
                    fire_orani: 0.0004, // Match Excel format
                    ua_dahil_edilsin: 'evet',
                    son_operasyon: 'evet',
                    // Additional fields for better Netsis compatibility - match Excel format
                    miktar_sabitle: 'H',
                    stok_maliyet: 'S',
                    fire_mik: '0',
                    sabit_fire_mik: '0',
                    istasyon_kodu: '',
                    hazirlik_suresi: key.includes('01') ? 0 : null,
                    uretim_suresi: key.includes('01') ? formattedValue : null, // Use formatted value
                    oncelik: '0',
                    planlama_orani: '100',
                    alt_pol_da_transfer: 'H',
                    alt_pol_ambar_cikis: 'H',
                    alt_pol_uretim_kaydi: 'H',
                    alt_pol_mrp: 'H',
                    ic_dis: 'I'
                  })
                });
                
                if (saveResponse && saveResponse.ok) {
                  // Update allRecipes.ymGtRecipe state with the newly saved component
                  setAllRecipes(prev => ({
                    ...prev,
                    ymGtRecipe: {
                      ...prev.ymGtRecipe,
                      [key]: value
                    }
                  }));
                } else {
                  console.error(`YMGT recetesi kaydedilemedi: ${key}, HTTP ${saveResponse ? saveResponse.status : 'unknown'}`);
                }
              } catch (saveError) {
                console.error(`YMGT recetesi kaydedilirken hata: ${saveError.message}`);
                // Kaydetme hatasi olussa bile diger receteleri eklemeye devam et
              }
            }
          }
        }
      }
      
      // Tum YM ST recetelerini kaydet - Excel formatiyla tam uyumlu
      for (let i = 0; i < ymStIds.length; i++) {
        const ymStId = ymStIds[i];
        const ymSt = [...selectedYmSts, ...autoGeneratedYmSts][i];
        const ymStRecipe = allRecipes.ymStRecipes[i] || {};
        
        // YM ST verisini kontrol et
        if (!ymSt || !ymSt.stok_kodu) {
          console.error(`YMST ${ymStId} icin gecerli stok_kodu bulunamadi!`);
          continue; // Bir sonraki YMST'ye gec
        }

        // Kritik duzeltme - stok_kodu kullanarak direkt arama yap, ID kullanma
        // Bu yaklasim hem 404 hem de 409 hatalarini ortadan kaldirir
        try {
          // Once stok_kodu ile dogrudan ara - bu en guvenilir yaklasim
          const searchResponse = await fetchWithAuth(`${API_URLS.galYmSt}?stok_kodu=${encodeURIComponent(ymSt.stok_kodu)}`);
          
          let actualYmStId = null;
          
          if (searchResponse && searchResponse.ok) {
            const searchResults = await searchResponse.json();
            
            if (Array.isArray(searchResults) && searchResults.length > 0) {
              // Mevcut kaydin ID'sini kullan
              actualYmStId = searchResults[0].id;
              
              // YmStIds dizisini guncelle
              ymStIds[i] = actualYmStId;
            } else {
              // Kayit bulunamadi - yeni olustur
              
              try {
                const createResponse = await fetchWithAuth(API_URLS.galYmSt, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(generateYmStDatabaseData(ymSt))
                });
                
                if (createResponse && createResponse.ok) {
                  const result = await createResponse.json();
                  actualYmStId = result.id;
                  
                  // YmStIds dizisini guncelle
                  ymStIds[i] = actualYmStId;
                } 
                // 409 Conflict - kaydin zaten var olmasi durumu
                else if (createResponse && createResponse.status === 409) {
                  
                  // Alternatif yaklasim: stok_kodu_like ile ara
                  try {
                    const baseCode = ymSt.stok_kodu.split('.').slice(0, 3).join('.');
                    const likeResponse = await fetchWithAuth(`${API_URLS.galYmSt}?stok_kodu_like=${encodeURIComponent(baseCode)}`);
                    
                    if (likeResponse && likeResponse.ok) {
                      const likeResults = await likeResponse.json();
                      
                      // Tam eslesme ara
                      const exactMatch = likeResults.find(item => item.stok_kodu === ymSt.stok_kodu);
                      
                      if (exactMatch) {
                        actualYmStId = exactMatch.id;
                      } else if (likeResults.length > 0) {
                        // En yakin eslesmeyi kullan
                        actualYmStId = likeResults[0].id;
                      } else {
                        console.error(`YMST icin uygun kayit bulunamadi! Islem atlaniyor: ${ymSt.stok_kodu}`);
                        continue; // Bu YMST icin islemi atla
                      }
                      
                      // YmStIds dizisini guncelle
                      ymStIds[i] = actualYmStId;
                    } else {
                      console.error(`YMST aramada hata: HTTP ${likeResponse ? likeResponse.status : 'unknown'}`);
                      continue; // Bu YMST icin islemi atla
                    }
                  } catch (likeError) {
                    console.error(`YMST stok_kodu_like aramasi sirasinda hata: ${likeError.message}`);
                    continue; // Bu YMST icin islemi atla  
                  }
                } else {
                  console.error(`YMST olusturulamadi: HTTP ${createResponse ? createResponse.status : 'unknown'}`);
                  continue; // Bu YMST icin islemi atla
                }
              } catch (createError) {
                console.error(`YMST olusturma hatasi: ${createError.message}`);
                continue; // Bu YMST icin islemi atla
              }
            }
          } else {
            console.error(`YMST arama hatasi: HTTP ${searchResponse ? searchResponse.status : 'unknown'}`);
            continue; // Bu YMST icin islemi atla
          }
          
          // Bu noktada artik dogru ID'ye sahip olmaliyiz
          if (!actualYmStId) {
            console.error(`YMST icin gecerli ID bulunamadi: ${ymSt.stok_kodu}`);
            continue; // Bu YMST icin islemi atla
          }
          
          // ID'yi guncelle - cok onemli
          ymStIds[i] = actualYmStId;
          
          // Dogru ID ile receteleri sil
          await deleteExistingRecipes('ymst', actualYmStId);
          
          let siraNo = 1;
          
          // YMST recete siralamasi - Excel formatina uygun kesin siralama 
          // Siralama: 1. FLM, 2. TLC01 (tam bu sira)
          const recipeEntries = Object.entries(ymStRecipe);
          
          // Filmasin kodu dogru formatta olmali
          const flmEntry = recipeEntries.find(([key]) => key.includes('FLM.'));
          if (flmEntry) {
            // Filmasin formatini kontrol et: FLM.XXXX.XXXX (orn. FLM.0550.1006)
            const flmKey = flmEntry[0];
            // Dogru format: FLM.XXXX.XXXX seklinde olmali, nokta ile ayrilmali
            if (!flmKey.match(/^FLM\.\d{4}\.\d{4}$/)) {
              console.warn(`FLM kodu hatali formatta: ${flmKey}, duzeltilmeli`);
            }
          }
          
          const tlc01Entry = recipeEntries.find(([key]) => key === 'TLC01');
          
          // Diger bilesenler - normalde yoktur ama guvenlik icin
          const otherEntries = recipeEntries.filter(([key]) => 
            !key.includes('FLM.') && key !== 'TLC01'
          );
          
          // Kesinlikle Excel siralamasina uygun olacak sekilde ekle
          // FLM her zaman once, TLC01 her zaman ikinci sirada
          const orderedEntries = [flmEntry, tlc01Entry, ...otherEntries].filter(Boolean);
          
          // Eger orderedEntries icinde sadece bir tane FLM ve bir tane TLC01 yoksa uyari ver
          if (!flmEntry) {
            console.error(`HATA: YMST recetesinde FLM bileseni bulunamadi!`);
          }
          
          if (!tlc01Entry) {
            console.error(`HATA: YMST recetesinde TLC01 operasyonu bulunamadi!`);
          }
          
          // Recete girdisi yoksa uyari ver ve devam et
          if (orderedEntries.length === 0) {
            console.warn(`YMST ${ymStId} icin eklenecek recete bulunmadi!`);
            continue; // Bir sonraki YMST'ye gec
          }
          
          for (const [key, value] of orderedEntries) {
            if (value > 0) {
              // Format the value exactly as it would appear in Excel, using points as decimal separators
              let formattedValue = value;
              if (typeof value === 'number') {
                formattedValue = value.toLocaleString('en-US', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 5,
                  useGrouping: false // No thousand separators
                });
              }
              
              // Recete parametrelerini hazirla
              // DUZELTME: YM.ST.xxxx formatindaki kodlar yanlislikla Operasyon olarak isaretlenmesin
              // DUZELTME: YM.ST ve FLM kodlari her zaman Bilesen olmali, sadece TLC01 ve GLV01 Operasyon olmali
              const isOperation = key === 'TLC01' || key === 'GLV01';
              
              // YM.ST iceren kodlari kesinlikle Bilesen olarak isaretle
              if (key.includes('YM.ST.')) {
              }
              
              
              const receteParams = {
                ym_st_id: ymStId,
                mamul_kodu: ymSt.stok_kodu,
                bilesen_kodu: key,
                miktar: formattedValue, // Use formatted value to match Excel
                sira_no: siraNo++,
                operasyon_bilesen: key === 'TLC01' ? 'Operasyon' : 'Bilesen', // Only TLC01 is Operasyon in YMST recipes
                olcu_br: getOlcuBr(key),
                olcu_br_bilesen: '1',
                aciklama: getReceteAciklama(key),
                recete_top: 1,
                fire_orani: 0.0004, // Match Excel format
                ua_dahil_edilsin: 'evet',
                son_operasyon: 'evet',
                // Additional fields for better Netsis compatibility - match Excel
                miktar_sabitle: 'H',
                stok_maliyet: 'S',
                fire_mik: '0',
                sabit_fire_mik: '0',
                istasyon_kodu: '',
                hazirlik_suresi: key.includes('01') ? 0 : null,
                uretim_suresi: key.includes('01') ? formattedValue : null, // Use formatted value
                oncelik: '0',
                planlama_orani: '100',
                alt_pol_da_transfer: 'H',
                alt_pol_ambar_cikis: 'H',
                alt_pol_uretim_kaydi: 'H',
                alt_pol_mrp: 'H',
                ic_dis: 'I'
              };
              
              // Parametre kontrolu
              
              // Cakisabilecek mevcut receteleri kontrol et
              try {
                const checkResponse = await fetchWithAuth(`${API_URLS.galYmStRecete}?ym_st_id=${ymStId}`);
                if (checkResponse && checkResponse.ok) {
                  const existingRecipes = await checkResponse.json();
                  const conflictRecipe = existingRecipes.find(r => r.bilesen_kodu === key && r.mamul_kodu !== ymSt.stok_kodu);
                  if (conflictRecipe) {
                    console.error(`CAKISMA! Farkli mamul_kodu ile YMST recete mevcut: ${conflictRecipe.mamul_kodu} (silinecek)`);
                    try {
                      await fetchWithAuth(`${API_URLS.galYmStRecete}/${conflictRecipe.id}`, { method: 'DELETE' });
                    } catch (deleteError) {
                      console.error(`Cakisan YMST recetesi silinemedi: ${deleteError.message}`);
                    }
                  }
                }
              } catch (checkError) {
                console.error(`YMST receteleri kontrol edilirken hata: ${checkError.message}`);
                // Hataya ragmen devam et
              }
              
              try {
                const receteResponse = await fetchWithAuth(API_URLS.galYmStRecete, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(receteParams)
                });
                
                if (receteResponse && receteResponse.ok) {
                } else {
                  const statusCode = receteResponse ? receteResponse.status : 'unknown';
                  console.error(`YMST recetesi kaydedilemedi: ${key}, hata kodu: ${statusCode}`);
                  
                  if (statusCode === 409) {
                    console.warn(`Muhtemelen recete zaten mevcut. Devam ediliyor.`);
                  }
                }
              } catch (saveError) {
                console.error(`YMST recetesi kaydedilirken hata: ${saveError.message}`);
                // Hataya ragmen devam et
              }
            }
          }
        } catch (mainError) {
          console.error(`YMST ${ymStId} recete islemleri sirasinda genel hata:`, mainError.message);
          // Hata ile karsilasilsa bile diger YMST'ler icin devam et
          continue;
        }
      }
    } catch (error) {
      console.error('Recete kaydetme hatasi:', error);
      throw error;
    }
  };

  /**
   * MMGT ve YMGT receteleri icin stok kodu kontrolu ve duzeltme
   * Bu fonksiyon, mamul_kodu ile eslesmeyen receteleri siler
   */
  const checkAndFixStokKodu = async (productType, productId, expectedStokKodu) => {
    if (!productId || !expectedStokKodu) {
      console.error(`${productType} ID veya stok_kodu eksik!`);
      return;
    }
    
    let apiUrl = '';
    let paramName = '';
    
    if (productType === 'mmgt') {
      apiUrl = API_URLS.galMmGtRecete;
      paramName = 'mm_gt_id';
    } else if (productType === 'ymgt') {
      apiUrl = API_URLS.galYmGtRecete;
      paramName = 'ym_gt_id';
    } else {
      console.error(`Gecersiz urun tipi: ${productType}`);
      return;
    }
    
    try {
      // URL'yi dogru olustur - sorgu parametre adini ve urun ID'sini kontrol et
      const queryUrl = `${apiUrl}?${paramName}=${encodeURIComponent(productId)}`;
      
      // Tum mevcut receteleri getir
      const allRecipesResponse = await fetchWithAuth(queryUrl);
      
      if (allRecipesResponse && allRecipesResponse.ok) {
        const allRecipesData = await allRecipesResponse.json();
        
        // Her receteyi kontrol et, yanlis mamul_kodu icerenleri sil
        for (const recipe of allRecipesData) {
          if (recipe.mamul_kodu !== expectedStokKodu) {
            try {
              await fetchWithAuth(`${apiUrl}/${recipe.id}`, { method: 'DELETE' });
            } catch (deleteError) {
              console.error(`${productType.toUpperCase()} recetesi silinemedi: ${deleteError.message}`);
            }
          }
        }
      } else {
        if (allRecipesResponse && allRecipesResponse.status === 404) {
        } else {
          console.warn(`${productType.toUpperCase()} receteleri alinamadi: HTTP ${allRecipesResponse ? allRecipesResponse.status : 'unknown'}`);
          
          // Alternatif yaklasim: tum receteleri getir ve filtrele
          try {
            const alternativeResponse = await fetchWithAuth(apiUrl);
            
            if (alternativeResponse && alternativeResponse.ok) {
              const allRecipes = await alternativeResponse.json();
              const filteredRecipes = allRecipes.filter(recipe => recipe[paramName] === productId);
              
              
              // Yanlis mamul_kodu iceren receteleri sil
              for (const recipe of filteredRecipes) {
                if (recipe.mamul_kodu !== expectedStokKodu) {
                  try {
                    await fetchWithAuth(`${apiUrl}/${recipe.id}`, { method: 'DELETE' });
                  } catch (deleteError) {
                    console.error(`${productType.toUpperCase()} recetesi silinemedi: ${deleteError.message}`);
                  }
                }
              }
            } else {
              console.warn(`Alternatif yontemle de ${productType.toUpperCase()} receteleri alinamadi`);
            }
          } catch (alternativeError) {
            console.error(`Alternatif yontem hatasi:`, alternativeError.message);
          }
        }
      }
    } catch (error) {
      console.error(`${productType.toUpperCase()} receteleri kontrol edilirken hata:`, error);
      // Hata durumunda isleme devam et
    }
  };

  // Mevcut receteleri sil - 404 hata yonetimi ile gelistirilmis versiyon
  const deleteExistingRecipes = async (type, productId) => {
    try {
      if (!productId) {
        return;
      }
      
      let apiUrl = '';
      let paramName = '';
      let typeLabel = '';
      
      if (type === 'mmgt') {
        apiUrl = API_URLS.galMmGtRecete;
        paramName = 'mm_gt_id';
        typeLabel = 'MMGT';
      } else if (type === 'ymgt') {
        apiUrl = API_URLS.galYmGtRecete;
        paramName = 'ym_gt_id';
        typeLabel = 'YMGT';
      } else if (type === 'ymst') {
        apiUrl = API_URLS.galYmStRecete;
        paramName = 'ym_st_id';
        typeLabel = 'YMST';
      }
      
      
      // URL'yi dogru olustur - sorgu parametre adini ve urun ID'sini kontrol et
      const queryUrl = `${apiUrl}?${paramName}=${encodeURIComponent(productId)}`;
      
      // 404 hata durumunda alternatif yontem kullan
      let recipes = [];
      try {
        const response = await fetchWithAuth(queryUrl);
        
        // Yanit varsa ve basariliysa
        if (response && response.ok) {
          recipes = await response.json();
        } 
        // 404 hatasi veya baska bir hata durumunda
        else {
          const status = response ? response.status : 'unknown';
          
          // 404 hatasi durumunda bos dizi dondur ve isleme devam et
          if (status === 404) {
            return; // Hic recete yoksa silmeye gerek yok
          }
        }
      } catch (fetchError) {
        console.error(`${typeLabel} receteleri aranirken hata:`, fetchError.message);
        
        // HATA DURUMUNDA ALTERNATIF YONTEM: Tum recete listesini getir ve filtrele
        try {
          const allRecipesResponse = await fetchWithAuth(`${apiUrl}`);
          
          if (allRecipesResponse && allRecipesResponse.ok) {
            const allRecipes = await allRecipesResponse.json();
            if (Array.isArray(allRecipes) && allRecipes.length > 0) {
              // Ilgili urune ait receteleri filtrele
              recipes = allRecipes.filter(recipe => recipe[paramName] === productId);
            } else {
              return;
            }
          } else {
            return;
          }
        } catch (alternativeError) {
          console.error(`Alternatif yontem hatasi:`, alternativeError.message);
          // Hata durumunda isleme devam et - receteler bos dizi olarak kalsin
          return;
        }
      }
      
      // Eger hic recete bulunmazsa mesaj goster ve cik
      if (!recipes || recipes.length === 0) {
        return;
      }
      
      // Receteleri tek tek silmeyi dene
      let successCount = 0;
      let errorCount = 0;
      
      for (const recipe of recipes) {
        try {
          const deleteResponse = await fetchWithAuth(`${apiUrl}/${recipe.id}`, { method: 'DELETE' });
          
          if (deleteResponse && deleteResponse.ok) {
            successCount++;
          } else {
            console.error(`${typeLabel} recetesi silinemedi: ID=${recipe.id}, HTTP ${deleteResponse ? deleteResponse.status : 'unknown'}`);
            errorCount++;
          }
        } catch (deleteError) {
          console.error(`${typeLabel} recetesi silinirken hata: ${deleteError.message}`);
          errorCount++;
          // Silme hatasi olussa bile diger receteleri silmeye devam et
        }
      }
      
      // Ozet bilgisi goster
      if (successCount > 0) {
      } else if (errorCount > 0) {
        console.warn(`${typeLabel} recetelerinden hicbiri silinemedi! (${errorCount} hata)`);
      } else {
      }
    } catch (error) {
      console.error(`${type.toUpperCase()} receteleri silinirken genel hata:`, error);
      // Genel hata durumunda bile isleme devam etmesine izin ver
    }
  };

  // Olcu birimi alma fonksiyonu
  const getOlcuBr = (bilesen) => {
    // For YM GT readonly component always show KG
    if (bilesen === 'readonly') return 'KG';
    
    // For process codes with 01 suffix, typically times
    if (bilesen === 'GTPKT01' || bilesen === 'TLC01' || bilesen === 'GLV01') return 'DK';
    
    // All other cases return KG for material weight
    if (bilesen.includes('03') || bilesen.includes('ASIT')) return 'KG';
    if (bilesen.includes('KARTON') || bilesen.includes('HALKA') || bilesen.includes('TOKA') || bilesen.includes('DESI')) return 'AD';
    if (bilesen.includes('CEMBER') || bilesen.includes('SHRINK')) return 'KG';
    if (bilesen.includes('YM.GT.')) return 'KG';
    if (bilesen.includes('FLM.')) return 'KG';
    return 'KG';
  };

  // Recete aciklama alma
  const getReceteAciklama = (bilesen) => {
    if (bilesen === 'GTPKT01') return 'Paketleme Operasyonu';
    if (bilesen === 'GLV01') return 'Galvanizleme Operasyonu';
    if (bilesen === 'TLC01') return 'Tel Cekme Operasyonu';
    if (bilesen === '150 03') return 'Cinko Tuketim Miktari';
    if (bilesen === 'SM.HIDROLIK.ASIT') return 'Asit Tuketim Miktari';
    if (bilesen.includes('FLM.')) return 'Filmasin Tuketimi';
    if (bilesen.includes('YM.GT.')) return 'Galvanizli Tel Tuketim Miktari';
    if (bilesen.includes('YM.ST.')) return 'Galvanizli Tel Tuketim Miktari';
    if (bilesen.includes('KARTON')) return 'Karton Tuketim Miktari';
    if (bilesen.includes('SHRINK')) return 'Naylon Tuketim Miktari';
    if (bilesen.includes('HALKA')) return 'Kaldirma Kancasi Tuketim Miktari';
    if (bilesen.includes('CEMBER')) return 'Celik cember Tuketim Miktari';
    if (bilesen.includes('TOKA')) return 'Cember Tokasi Tuketim Miktari';
    if (bilesen.includes('DESI')) return 'Slikajel Tuketim Miktari';
    return 'Tuketim Miktari';
  };

  // Filmasin kodu olustur - Excel formatina tam uyumlu
  const getFilmasinKodu = (ymSt) => {
    if (!ymSt) return 'FLM.0600.1006';
    
    // Get cap and determine appropriate filmasin type - each YM ST must use its own cap
    const cap = parseFloat(ymSt.cap) || 0;
    
    // If ymSt has filmasin and quality defined, use those values
    // If not, determine appropriate values based on cap
    let filmasin, quality;
    
    // For diameters ≤ 2mm, use YM ST's own filmasin/quality if available, otherwise use defaults
    if (cap <= 2.00) {
      if (ymSt.filmasin && ymSt.quality) {
        // Use YM ST's own filmasin and quality values
        filmasin = ymSt.filmasin.toString();
        quality = ymSt.quality;
      } else {
        // Only use default rules if YM ST doesn't have its own values
        filmasin = getFilmasinForCap(cap);
        quality = getQualityForCap(cap) || '1006';
        
        // Update the YM ST object with the calculated values
        ymSt.filmasin = parseInt(filmasin);
        ymSt.quality = quality;
      }
    } else if (ymSt.filmasin && ymSt.quality) {
      // For diameters > 2mm, use existing values from ymSt if available
      filmasin = ymSt.filmasin.toString();
      quality = ymSt.quality;
    } else {
      // Otherwise, determine appropriate values based on cap
      filmasin = getFilmasinForCap(cap);
      quality = getQualityForCap(cap) || '1006';
      
      // IMPORTANT: Also update the ymSt object with the selected values
      // This ensures dropdowns will be set to the correct values
      if (ymSt.source === 'auto-generated' || ymSt.source === 'manual-added') {
        // Only modify if it's our controlled object, not from the database
        ymSt.filmasin = parseInt(filmasin);
        ymSt.quality = quality;
      }
    }
    
    // 4 haneli format ile leading sifirlar
    // Format: XXXX
    const filmasinNumber = parseInt(filmasin, 10);
    filmasin = filmasinNumber.toString().padStart(4, '0');
    
    // DUZELTME: Format kontrolu - Excel formatiyla tam uyumlu olmali
    const filmasinCode = `FLM.${filmasin}.${quality}`;
    
    // Dogru format kontrolu: FLM.XXXX.XXXX (orn. FLM.0550.1006)
    const validFormat = /^FLM\.\d{4}\.\d{4}$/.test(filmasinCode);
    
    if (!validFormat) {
      console.warn(`UYARI: Olusturulan FLM kodu hatali formatta: ${filmasinCode}, format duzeltilmeli`);
    }
    
    // Return formatted code in the correct format: FLM.0800.1010
    return filmasinCode;
  };

  
  // Function to fetch TLC_Hizlar data from the database
  const fetchTlcHizlarData = async () => {
    try {
      setTlcHizlarLoading(true);
      
      // Check if API endpoint exists - should point to gal_cost_cal_user_tlc_hizlar
      if (!API_URLS.galTlcHizlar) {
        console.warn('galTlcHizlar API endpoint is not defined, using fallback data');
        setTlcHizlarLoading(false);
        return;
      }
      
      // Try first with CORS proxy (works better with vercel deployments)
      try {
        const proxyResponse = await fetchWithCorsProxy(API_URLS.galTlcHizlar, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (proxyResponse && proxyResponse.ok) {
          const data = await proxyResponse.json();
          
          // Create a lookup table for DUSEYARA function
          const lookupMap = {};
          if (Array.isArray(data)) {
            data.forEach(item => {
              // Ensure consistent formatting for lookup keys
              const giris = parseFloat(item.giris_capi).toFixed(2);
              const cikis = parseFloat(item.cikis_capi).toFixed(2);
              const kod = `${giris}x${cikis}`;
              
              // Make sure we have a valid numeric value
              const hiz = parseFloat(item.calisma_hizi);
              if (!isNaN(hiz) && hiz > 0) {
                lookupMap[kod] = hiz;
                // Also add a version without trailing zeros for more flexible matching
                const cleanGiris = parseFloat(giris);
                const cleanCikis = parseFloat(cikis);
                const cleanKod = `${cleanGiris}x${cleanCikis}`;
                if (cleanKod !== kod) {
                  lookupMap[cleanKod] = hiz;
                }
              }
            });
            
            // Add debug output for a few sample values
            const sampleKeys = Object.keys(lookupMap).slice(0, 5);
            
            setTlcHizlarCache(lookupMap);
            setTlcHizlarLoading(false);
            return;
          }
        }
      } catch (proxyError) {
        console.warn('CORS proxy fetch failed, trying direct methods:', proxyError);
      }
      
      // Try with standard fetch as second option
      try {
        const directResponse = await fetch(API_URLS.galTlcHizlar, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          mode: 'cors'
        });
        
        if (directResponse && directResponse.ok) {
          const data = await directResponse.json();
          
          // Create a lookup table for DUSEYARA function
          const lookupMap = {};
          if (Array.isArray(data)) {
            data.forEach(item => {
              const kod = `${item.giris_capi}x${item.cikis_capi}`;
              lookupMap[kod] = item.calisma_hizi;
            });
            
            setTlcHizlarCache(lookupMap);
            setTlcHizlarLoading(false);
            return;
          }
        }
      } catch (directFetchError) {
        console.warn('Direct fetch failed, trying fetchWithAuth:', directFetchError);
      }
      
      // If all previous attempts failed, try with fetchWithAuth
      try {
        const response = await fetchWithAuth(API_URLS.galTlcHizlar);
        if (response && response.ok) {
          const data = await response.json();
          
          // Create a lookup table for DUSEYARA function
          const lookupMap = {};
          if (Array.isArray(data)) {
            data.forEach(item => {
              const kod = `${item.giris_capi}x${item.cikis_capi}`;
              lookupMap[kod] = item.calisma_hizi;
            });
          }
          
          setTlcHizlarCache(lookupMap);
        } else {
          console.warn('Failed to fetch TLC_Hizlar data, using default fallback values');
          initializeFallbackData();
        }
      } catch (authFetchError) {
        console.warn('Auth fetch failed, using fallback data:', authFetchError);
        initializeFallbackData();
      }
    } catch (error) {
      console.error('Error fetching TLC_Hizlar data:', error);
      initializeFallbackData();
    } finally {
      setTlcHizlarLoading(false);
    }
  };
  
  // Initialize fallback data in case API fails
  const initializeFallbackData = () => {
    // Static fallback data for most common sizes
    const fallbackData = {
      "7x5": 10.5,
      "7x5.5": 11,
      "7x6": 11,
      "8x6": 11,
      "8x6.5": 11,
      "8x7": 11.5,
      "9x7": 10.5,
      "9x7.5": 10.5,
      "9x8": 10,
      "10x7.92": 10,
      "10x8": 10
    };
    
    setTlcHizlarCache(fallbackData);
  };
  
  // No fallback data - using only database table

  // DUSEYARA (VLOOKUP) function implementation using only database data
  const duseyaraLookup = (lookupValue, rangeArray, columnIndex, exactMatch = true) => {
    // Enhanced fallback values for common wire sizes - more comprehensive list
    const fallbackValues = {
      // Format: "HM_CapxCap": Calisma_Hizi (fallback speed value)
      // Common filmasin 5.5mm values
      "5.5x0.8": 20,    "5.5x0.9": 20,    "5.5x1": 20,     "5.5x1.1": 19,    "5.5x1.2": 19,
      "5.5x1.3": 19,    "5.5x1.4": 18,    "5.5x1.5": 18,   "5.5x1.6": 18,    "5.5x1.7": 17,
      "5.5x1.8": 17,    "5.5x1.9": 17,
      
      // Common filmasin 6mm values
      "6x0.8": 20,      "6x0.9": 20,      "6x1": 20,       "6x1.1": 19,      "6x1.2": 19,
      "6x1.3": 19,      "6x1.4": 18,      "6x1.5": 18,     "6x1.6": 18,      "6x1.7": 17,
      "6x1.8": 17,      "6x1.9": 17,      "6x2": 16,       "6x2.2": 16,      "6x2.4": 15,
      "6x2.6": 15,      "6x2.8": 14,      "6x3": 14,       "6x3.2": 13,      "6x3.4": 13,
      "6x3.6": 12,      "6x3.8": 12,      "6x4": 11,       "6x4.2": 11,      "6x4.4": 10,
      "6x4.5": 10,
      
      // Common filmasin 7mm values
      "7x4.5": 11,      "7x5": 10.5,      "7x5.5": 10,     "7x6": 10,
      
      // Common filmasin 8mm values
      "8x5.5": 11,      "8x6": 10.5,      "8x6.5": 10,     "8x7": 10,
      
      // Common filmasin 9mm values
      "9x7": 10.5,      "9x7.5": 10,      "9x8": 10,
      
      // Common filmasin 10mm values
      "10x7": 10.5,     "10x7.5": 10,     "10x8": 10
    };
    
    // Check if we have a fallback value for this exact combination
    if (fallbackValues[lookupValue]) {
      return fallbackValues[lookupValue];
    }
    
    // Try to find nearby values in fallback table if no exact match
    try {
      // Parse lookupValue format "7x1.25" -> [7, 1.25]
      const [hmCap, cap] = lookupValue.split("x").map(Number);
      
      // Find closest keys in the fallback values dictionary
      const fallbackKeys = Object.keys(fallbackValues);
      const closestFallbackKeys = fallbackKeys.filter(key => {
        const [fbHmCap, fbCap] = key.split("x").map(Number);
        return fbHmCap === hmCap && Math.abs(fbCap - cap) <= 0.5; // Within 0.5mm
      });
      
      if (closestFallbackKeys.length > 0) {
        // Sort by closest cap value
        closestFallbackKeys.sort((a, b) => {
          const [, aCapValue] = a.split("x").map(Number);
          const [, bCapValue] = b.split("x").map(Number);
          return Math.abs(aCapValue - cap) - Math.abs(bCapValue - cap);
        });
        
        // Return the closest match from fallback values
        const closestKey = closestFallbackKeys[0];
        return fallbackValues[closestKey];
      }
    } catch (e) {
      console.warn(`Error parsing fallback lookup: ${e.message}`);
    }
    
    // Check if we have database data in the cache
    if (Object.keys(tlcHizlarCache).length > 0) {
      // Database approach: direct lookup by code (format "7x1.25")
      if (tlcHizlarCache[lookupValue]) {
        // We have an exact match in the database
        return tlcHizlarCache[lookupValue];
      }
      
      // No exact match in DB, try to find closest match
      if (!exactMatch) {
        try {
          // Parse lookupValue format "7x1.25" -> [7, 1.25]
          const [hmCap, cap] = lookupValue.split("x").map(Number);
          
          // Find all keys that match the input HM cap (or very close)
          const matchingHmCapKeys = Object.keys(tlcHizlarCache).filter(key => {
            try {
              const [keyHmCap] = key.split("x").map(Number);
              // Allow for small rounding differences in HM cap (±0.05)
              return Math.abs(keyHmCap - hmCap) <= 0.05;
            } catch (e) {
              console.warn(`Invalid key format: ${key}`);
              return false;
            }
          });
          
          if (matchingHmCapKeys.length > 0) {
            // Sort by closest cap value
            matchingHmCapKeys.sort((a, b) => {
              const [, aCapValue] = a.split("x").map(Number);
              const [, bCapValue] = b.split("x").map(Number);
              return Math.abs(aCapValue - cap) - Math.abs(bCapValue - cap);
            });
            
            // Return the closest match
            const bestMatch = matchingHmCapKeys[0];
            return tlcHizlarCache[bestMatch];
          }
          
          // If we still don't have a match, try to find closest HM cap
          const allKeys = Object.keys(tlcHizlarCache);
          if (allKeys.length > 0) {
            // Sort by closest overall match using weighted scoring
            allKeys.sort((a, b) => {
              try {
                const [aHmCap, aCap] = a.split("x").map(Number);
                const [bHmCap, bCap] = b.split("x").map(Number);
                
                // Weight HM cap differences more heavily (3x)
                const aScore = Math.abs(aHmCap - hmCap) * 3 + Math.abs(aCap - cap);
                const bScore = Math.abs(bHmCap - hmCap) * 3 + Math.abs(bCap - cap);
                
                return aScore - bScore;
              } catch (e) {
                console.warn(`Error comparing keys ${a} and ${b}: ${e.message}`);
                return 0;
              }
            });
            
            // Return the closest overall match but only if reasonably close
            const bestOverallMatch = allKeys[0];
            const [bestHmCap, bestCap] = bestOverallMatch.split("x").map(Number);
            const distanceScore = Math.abs(bestHmCap - hmCap) * 3 + Math.abs(bestCap - cap);
            
            // If distance is too great, use a default value instead
            if (distanceScore > 5) {
              return 10; // Default value for calisma_hizi when no good match
            }
            
            return tlcHizlarCache[bestOverallMatch];
          }
        } catch (error) {
          console.error('Error finding approximate match in DUSEYARA:', error);
          // Return a reasonable default value in case of error
          return 10;
        }
      }
    }
    
    // If we couldn't find a match or have no data, use advanced estimation algorithm based on typical patterns
    
    // For any lookup value with format "Wx1.25", use more sophisticated estimation
    try {
      // Try to extract values from lookupValue (e.g., "7x1.25")
      const [estHmCap, estCap] = lookupValue.split('x').map(Number);
      if (!isNaN(estHmCap) && !isNaN(estCap)) {
        // Larger input diameters and smaller output diameters = faster speeds
        // This is a more nuanced heuristic based on the TLC_Hizlar patterns
        let baseSpeed;
        
        // Base speed depends on filmasin diameter (higher = slower)
        if (estHmCap <= 6) baseSpeed = 20;      // 5.5mm, 6mm are fastest
        else if (estHmCap <= 7) baseSpeed = 16; // 7mm is medium
        else if (estHmCap <= 8) baseSpeed = 13; // 8mm is slower
        else baseSpeed = 11;                    // 9mm, 10mm are slowest
        
        // Adjust for output diameter (thinner = faster processing)
        // Different adjustment scales based on filmasin diameter
        let capAdjustment; 
        if (estHmCap <= 6) {
          // For 5.5mm and 6mm filmasin, speed drops faster with thicker outputs
          capAdjustment = Math.max(0, (estCap - 1) * 1.5);
        } else {
          // For thicker filmasin, speed drops more gradually
          capAdjustment = Math.max(0, (estCap - 2) * 1);
        }
        
        const estimatedSpeed = Math.max(8, baseSpeed - capAdjustment);
        
        return estimatedSpeed;
      }
    } catch (e) {
      console.warn(`Error estimating TLC_Hiz: ${e.message}`);
    }
    
    // Absolute fallback if all else fails
    return 10;
  };
  
  // Calculate YuzeyAlani based on the formula
  const calculateYuzeyAlani = (cap) => {
    // YuzeyAlani: =1000*4000/PI()/'DIA (MM)'/'DIA (MM)'/7.85*'DIA (MM)'*PI()/1000
    return (1000 * 4000 / Math.PI / cap / cap / 7.85 * cap * Math.PI / 1000);
  };
  
  // Calculate total surface area
  const calculateTotalYuzeyAlani = () => {
    // toplam_yuzey_alani= uretim_kapasitesi_aylik *1000*4000/ ortalama_uretim_capi / ortalama_uretim_capi /3.14/7.85* ortalama_uretim_capi *3.14/1000
    const { uretim_kapasitesi_aylik, ortalama_uretim_capi } = userInputValues;
    return uretim_kapasitesi_aylik * 1000 * 4000 / ortalama_uretim_capi / ortalama_uretim_capi / Math.PI / 7.85 * ortalama_uretim_capi * Math.PI / 1000;
  };
  
  // Calculate Durdurma Vinc (DV) based on Min Mukavemet
  const calculateDV = (minMukavemet) => {
    // DV values with interpolation for intermediate mukavemet values
    const dvTable = [
      { mukavemet: 400, dv: 140 },
      { mukavemet: 500, dv: 160 },
      { mukavemet: 600, dv: 180 },
      { mukavemet: 700, dv: 200 }
    ];
    
    // Find exact match first
    const exactMatch = dvTable.find(entry => entry.mukavemet === minMukavemet);
    if (exactMatch) {
      return exactMatch.dv;
    }
    
    // Find closest values for interpolation
    let lowerBound = null;
    let upperBound = null;
    
    for (let i = 0; i < dvTable.length; i++) {
      if (dvTable[i].mukavemet < minMukavemet) {
        lowerBound = dvTable[i];
      } else if (dvTable[i].mukavemet > minMukavemet && !upperBound) {
        upperBound = dvTable[i];
        break;
      }
    }
    
    // Interpolate if we have both bounds
    if (lowerBound && upperBound) {
      const ratio = (minMukavemet - lowerBound.mukavemet) / (upperBound.mukavemet - lowerBound.mukavemet);
      const interpolatedDV = lowerBound.dv + ratio * (upperBound.dv - lowerBound.dv);
      return Math.round(interpolatedDV);
    }
    
    // Use closest value if outside range
    if (minMukavemet < 400) {
      return 140;
    } else {
      return 200;
    }
  };

  // Calculate tuketilenAsit
  const calculateTuketilenAsit = () => {
    // tuketilenAsit: = toplam_tuketilen_asit / toplam_yuzey_alani
    // Based on the formula from GalvanizliFormulas.txt
    const { toplam_tuketilen_asit } = userInputValues;
    const totalYuzeyAlani = calculateTotalYuzeyAlani();
    
    if (totalYuzeyAlani > 0) {
      const calculatedValue = toplam_tuketilen_asit / totalYuzeyAlani;
      return calculatedValue;
    } else {
      // Use default value from historical data if we can't calculate
      return 0.0647625; // Default value if totalYuzeyAlani is zero
    }
  };
  
  // Calculate TLC_Hiz based on HM_Cap and Cap values
  // TLC_Hiz= =DUSEYARA(BIRLESTIR(HM_Cap;"x"; Cap);'TLC_Hizlar'!C:F;4;YANLIS)*0.7
  const calculateTlcHiz = (hmCap, cap) => {
    // Format inputs to ensure consistency
    const formattedHmCap = parseFloat(hmCap);
    const formattedCap = parseFloat(cap);
    
    // Create lookup code in format: "7x1.25" with consistent formatting
    // Try both precise and rounded formats for better matching
    const exactLookupCode = `${formattedHmCap}x${formattedCap}`;
    const roundedLookupCode = `${formattedHmCap.toFixed(2)}x${formattedCap.toFixed(2)}`;
    
    
    // First try direct lookup in the cache
    if (tlcHizlarCache[exactLookupCode]) {
      const exactMatch = tlcHizlarCache[exactLookupCode];
      
      // The formula in GalvanizliFormulas.txt is: TLC_Hiz= =DUSEYARA(BIRLESTIR(HM_Cap;"x"; Cap);'TLC_Hizlar'!C:F;4;YANLIS)*0.7
      // The last column in TLC_Hizlar.csv is "calismahizi" which is what we need
      // We need to apply the 0.7 multiplier as specified in the formula
      return exactMatch * 0.7; 
    }
    
    if (tlcHizlarCache[roundedLookupCode]) {
      const roundedMatch = tlcHizlarCache[roundedLookupCode];
      return roundedMatch * 0.7; // Apply 0.7 multiplier as per formula
    }
    
    // If no direct match, find closest matches and interpolate
    
    // Find closest HM_Cap and Cap values in the cache
    const cacheKeys = Object.keys(tlcHizlarCache);
    let closestMatch = null;
    let minDistance = Infinity;
    
    // Try to find closest match by calculating distance
    cacheKeys.forEach(key => {
      const [keyHmCap, keyCap] = key.split('x').map(parseFloat);
      if (!isNaN(keyHmCap) && !isNaN(keyCap)) {
        // Calculate distance using weighted formula (cap difference is more important)
        const distance = Math.abs(keyHmCap - formattedHmCap) * 0.3 + Math.abs(keyCap - formattedCap) * 0.7;
        if (distance < minDistance) {
          minDistance = distance;
          closestMatch = key;
        }
      }
    });
    
    if (closestMatch && tlcHizlarCache[closestMatch]) {
      const interpolatedValue = tlcHizlarCache[closestMatch];
      return interpolatedValue * 0.7;
    }
    
    // Final fallback - use a reasonable default based on wire size
    const fallbackValue = Math.max(50, 100 - formattedCap * 5); // Larger wire = slower speed
    return fallbackValue * 0.7; 
  };

  // Request selection handlers
  const handleSelectAllRequests = () => {
    const approvedRequests = getFilteredAndSortedRequests().filter(req => req.status?.toString().toLowerCase().trim() === 'approved');
    const allIds = approvedRequests.map(req => req.id);
    
    if (selectedRequestIds.length === allIds.length) {
      // Deselect all
      setSelectedRequestIds([]);
    } else {
      // Select all approved
      setSelectedRequestIds(allIds);
    }
  };

  const handleToggleRequestSelection = (requestId) => {
    setSelectedRequestIds(prev => {
      if (prev.includes(requestId)) {
        return prev.filter(id => id !== requestId);
      } else {
        return [...prev, requestId];
      }
    });
  };

  // Export all approved requests to Excel
  const exportAllApprovedToExcel = async () => {
    try {
      setIsExportingExcel(true);
      //   id: r.id, 
      //   status: r.status, 
      //   raw_status: typeof r.status,
      //   created_at: r.created_at 
      // })));
      
      // Multiple validation approaches to catch edge cases
      const approvedRequests = requests.filter(req => {
        if (!req || !req.status) {
          console.warn('⚠️ Request missing status:', req);
          return false;
        }
        
        const status = req.status.toString().toLowerCase().trim();
        const isApproved = status === 'approved';
        
        if (isApproved) {
          //   id: req.id, 
          //   original_status: req.status, 
          //   normalized_status: status 
          // });
        }
        
        return isApproved;
      });
      
      //   id: r.id, 
      //   status: r.status, 
      //   created_at: r.created_at 
      // })));
      
      if (approvedRequests.length === 0) {
        toast.warning('Onaylanmis talep bulunamadi. Lutfen once en az bir talebi onaylayin.');
        return;
      }
      
      await generateBatchExcelFromRequests(approvedRequests);
      toast.success(`${approvedRequests.length} onaylanmis talep icin Excel dosyalari basariyla olusturuldu!`);
    } catch (error) {
      console.error('❌ BATCH EXCEL EXPORT FAILED:', error);
      console.error('❌ Error stack:', error.stack);
      toast.error('Excel dosyalari olusturulurken hata olustu: ' + error.message);
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Export selected approved requests to Excel
  const exportSelectedToExcel = async () => {
    try {
      if (selectedRequestIds.length === 0) {
        toast.warning('Lutfen en az bir onaylanmis talep secin');
        return;
      }
      
      setIsExportingExcel(true);
      const selectedRequests = requests.filter(req => {
        const status = req.status?.toString().toLowerCase().trim();
        return selectedRequestIds.includes(req.id) && status === 'approved';
      });
      
      if (selectedRequests.length === 0) {
        toast.warning('Secilen taleplerin hicbiri onaylanmis degil');
        return;
      }
      
      await generateBatchExcelFromRequests(selectedRequests);
      toast.success(`${selectedRequests.length} secili onaylanmis talep icin Excel dosyalari olusturuldu`);
    } catch (error) {
      console.error('Excel export error:', error);
      toast.error('Excel dosyalari olusturulurken hata olustu: ' + error.message);
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Generate Excel files from multiple requests (creates combined stok and recipe Excel files)
  const generateBatchExcelFromRequests = async (requestsList) => {
    
    // Input validation
    if (!requestsList || requestsList.length === 0) {
      console.error('❌ No requests provided to generateBatchExcelFromRequests');
      throw new Error('Hicbir talep bulunamadi');
    }

    if (!Array.isArray(requestsList)) {
      console.error('❌ requestsList is not an array:', typeof requestsList);
      throw new Error('Gecersiz talep listesi formati');
    }

      id: r.id, 
      status: r.status,
      created_at: r.created_at?.substring(0, 10) || 'unknown'
    })));
    
    // Collect all products from all requests (using Maps to avoid duplicates)
    const mmGtMap = new Map(); // key: stok_kodu, value: MM GT data
    const ymGtMap = new Map(); // key: stok_kodu, value: YM GT data
    const ymStMap = new Map(); // key: stok_kodu, value: YM ST data
    const mmGtRecipeMap = new Map(); // key: `${mm_gt_stok_kodu}-${bilesen_kodu}`, value: recipe
    const ymGtRecipeMap = new Map(); // key: `${ym_gt_stok_kodu}-${bilesen_kodu}`, value: recipe
    const ymStRecipeMap = new Map(); // key: `${ym_st_stok_kodu}-${bilesen_kodu}`, value: recipe

    let totalApiCalls = 0;
    let successfulApiCalls = 0;
    let failedApiCalls = 0;

    for (const request of requestsList) {
      try {
        
        // Check if request has stok_kodu
        if (!request.stok_kodu) {
          console.warn(`⚠️ [${request.id}] Request has no stok_kodu - skipping (old request without stok_kodu)`);
          continue;
        }
        
        // Find MM GT by stok_kodu
        
        totalApiCalls++;
        const mmGtResponse = await fetchWithAuth(`${API_URLS.galMmGt}?stok_kodu=${request.stok_kodu}`);
        
        if (mmGtResponse && mmGtResponse.ok) {
          const mmGtProducts = await mmGtResponse.json();
          successfulApiCalls++;
          
          // The API returns an array even for single stok_kodu query
          const mmGtArray = Array.isArray(mmGtProducts) ? mmGtProducts : [mmGtProducts];
          
          if (mmGtArray.length > 0) {
              stok_kodu: mmGtArray[0].stok_kodu, 
              id: mmGtArray[0].id, 
              cap: mmGtArray[0].cap,
              kg: mmGtArray[0].kg
            });
          }
          
          if (mmGtArray.length === 0) {
            console.warn(`⚠️ [${request.id}] No MM GT product found with stok_kodu: ${request.stok_kodu}`);
            console.warn(`⚠️ [${request.id}] This could mean: 1) Product was deleted, 2) Wrong stok_kodu`);
            continue;
          }
          
          // Process only the specific MM GT for this request
          for (const mmGt of mmGtArray) {
            // Add MM GT
            mmGtMap.set(mmGt.stok_kodu, mmGt);
            
            // Find relationships created specifically for this request's MM GT
            const relationResponse = await fetchWithAuth(`${API_URLS.galMmGtYmSt}?mm_gt_id=${mmGt.id}`);
            if (relationResponse && relationResponse.ok) {
              const relations = await relationResponse.json();
              
              if (relations.length > 0) {
                const ymGtId = relations[0].ym_gt_id;
                
                // Add YM GT data if it exists
                if (ymGtId) {
                  try {
                    const ymGtResponse = await fetchWithAuth(`${API_URLS.galYmGt}?id=${ymGtId}`);
                    if (ymGtResponse && ymGtResponse.ok) {
                      const ymGtData = await ymGtResponse.json();
                      const ymGt = Array.isArray(ymGtData) ? ymGtData[0] : ymGtData;
                      if (ymGt) {
                        ymGtMap.set(ymGt.stok_kodu, ymGt);
                        
                        // Add YM GT recipes
                        const ymGtRecipeResponse = await fetchWithAuth(`${API_URLS.galYmGtRecete}?ym_gt_id=${ymGtId}`);
                        if (ymGtRecipeResponse && ymGtRecipeResponse.ok) {
                          const ymGtRecipes = await ymGtRecipeResponse.json();
                          ymGtRecipes.forEach(r => {
                            const key = `${ymGt.stok_kodu}-${r.bilesen_kodu}`;
                            ymGtRecipeMap.set(key, {
                              ...r,
                              mm_gt_stok_kodu: mmGt.stok_kodu,
                              sequence: mmGt.stok_kodu?.split('.').pop() || '00',
                              ym_gt_stok_kodu: ymGt.stok_kodu
                            });
                          });
                        }
                      }
                    }
                  } catch (error) {
                    console.error(`YM GT ${ymGtId} might be deleted, skipping:`, error);
                  }
                } else {
                  console.warn(`No YM GT ID found in relationship for MM GT ${mmGt.id}`);
                }
                
                // Only add YM STs that were specifically selected for this request
                // Filter by checking if they were part of the approved calculation for this MM GT
                for (const relation of relations) {
                  try {
                    const ymStResponse = await fetchWithAuth(`${API_URLS.galYmSt}?id=${relation.ym_st_id}`);
                    if (ymStResponse && ymStResponse.ok) {
                      const ymStData = await ymStResponse.json();
                      const ymSt = Array.isArray(ymStData) ? ymStData[0] : ymStData;
                      if (ymSt) {
                        // Only include YM STs that were marked as main or specifically selected
                        if (relation.is_main === true || relation.is_main === 1) {
                          ymStMap.set(ymSt.stok_kodu, ymSt);
                          
                          // Add YM ST recipes
                          const ymStRecipeResponse = await fetchWithAuth(`${API_URLS.galYmStRecete}?ym_st_id=${relation.ym_st_id}`);
                          if (ymStRecipeResponse && ymStRecipeResponse.ok) {
                            const ymStRecipes = await ymStRecipeResponse.json();
                            ymStRecipes.forEach(r => {
                              const key = `${ymSt.stok_kodu}-${r.bilesen_kodu}`;
                              ymStRecipeMap.set(key, {
                                ...r,
                                ym_st_stok_kodu: ymSt.stok_kodu
                              });
                            });
                          }
                        } else {
                        }
                      }
                    }
                  } catch (error) {
                    console.error(`YM ST ${relation.ym_st_id} might be deleted, skipping:`, error);
                  }
                }
              }
            }
            
            // Add MM GT recipes for this specific MM GT
            const mmGtRecipeResponse = await fetchWithAuth(`${API_URLS.galMmGtRecete}?mm_gt_id=${mmGt.id}`);
            if (mmGtRecipeResponse && mmGtRecipeResponse.ok) {
              const mmGtRecipes = await mmGtRecipeResponse.json();
              mmGtRecipes.forEach(r => {
                const key = `${mmGt.stok_kodu}-${r.bilesen_kodu}`;
                mmGtRecipeMap.set(key, {
                  ...r,
                  mm_gt_stok_kodu: mmGt.stok_kodu,
                  sequence: mmGt.stok_kodu?.split('.').pop() || '00'
                });
              });
            }
          }
        } else {
          failedApiCalls++;
          console.error(`[${request.id}] MM GT API failed - Response status: ${mmGtResponse?.status}`);
          console.error(`[${request.id}] Response text:`, await mmGtResponse?.text().catch(() => 'Unable to read response'));
        }
      } catch (error) {
        failedApiCalls++;
        console.error(`[${request.id}] Exception during data loading:`, error);
        console.error(`[${request.id}] Error details:`, error.message);
      }
    }

    // API call statistics

    // Convert Maps to arrays for Excel generation
    const allMmGtData = Array.from(mmGtMap.values());
    const allYmGtData = Array.from(ymGtMap.values());
    const allYmStData = Array.from(ymStMap.values());
    const allMmGtRecipes = Array.from(mmGtRecipeMap.values());
    const allYmGtRecipes = Array.from(ymGtRecipeMap.values());
    const allYmStRecipes = Array.from(ymStRecipeMap.values());
    
    // Final data collection summary
    
    // Detailed product information
    if (allMmGtData.length > 0) {
        stok_kodu: m.stok_kodu, 
        id: m.id, 
        request_id: m.request_id,
        cap: m.cap,
        kg: m.kg
      })));
    }
    if (allYmGtData.length > 0) {
        stok_kodu: y.stok_kodu, 
        id: y.id 
      })));
    }
    if (allYmStData.length > 0) {
        stok_kodu: s.stok_kodu, 
        id: s.id,
        cap: s.cap,
        filmasin: s.filmasin
      })));
    }
    
    // Critical validation
    if (allMmGtData.length === 0) {
      console.error('💥 CRITICAL ERROR: No MM GT products found in any approved requests!');
      console.error('💡 Possible causes:');
      console.error('   1. Approved requests exist but have no saved MM GT products');
      console.error('   2. Database connection issue');
      console.error('   3. API filtering problem');
      console.error('   4. Products were deleted after approval');
      throw new Error('Secilen onaylanmis taleplerde hicbir urun bulunamadi. Lutfen taleplerin dogru sekilde kaydedildiginden emin olun.');
    }
    

    // Create two separate Excel files with EXACT same format as individual exports
    await generateBatchStokKartiExcel(allMmGtData, allYmGtData, allYmStData);
    
    await generateBatchReceteExcel(allMmGtRecipes, allYmGtRecipes, allYmStRecipes);
    
  };

  // Generate batch stock card Excel - EXACT same format as individual, just multiple rows
  const generateBatchStokKartiExcel = async (mmGtData, ymGtData, ymStData) => {
    
    if (!mmGtData || mmGtData.length === 0) {
      throw new Error('MM GT verisi bulunamadi - Stok Karti Excel olusturulamiyor');
    }
    
    const workbook = new ExcelJS.Workbook();
    
    // MM GT Sheet - EXACT same structure as individual
    const mmGtSheet = workbook.addWorksheet('MM GT');
    const mmGtHeaders = getStokKartiHeaders();
    mmGtSheet.addRow(mmGtHeaders);
    
    // Add multiple MM GT rows (one per product)
    for (const mmGt of mmGtData) {
      // Create a batch-specific row with actual MM GT data
      mmGtSheet.addRow(generateMmGtStokKartiDataForBatch(mmGt));
    }
    
    // YM GT Sheet - EXACT same structure as individual
    const ymGtSheet = workbook.addWorksheet('YM GT');
    const ymGtHeaders = getYmGtHeaders();
    ymGtSheet.addRow(ymGtHeaders);
    
    // Add multiple YM GT rows (one per product)
    for (const ymGt of ymGtData) {
      // Create a batch-specific row with actual YM GT data
      ymGtSheet.addRow(generateYmGtStokKartiDataForBatch(ymGt));
    }
    
    // YM ST Sheet - EXACT same structure as individual
    const ymStSheet = workbook.addWorksheet('YM ST');
    const ymStHeaders = getYmStHeaders();
    ymStSheet.addRow(ymStHeaders);
    
    // Add multiple YM ST rows (all YM STs from all products)
    for (const ymSt of ymStData) {
      ymStSheet.addRow(generateYmStStokKartiData(ymSt));
    }
    
    // Save with timestamp filename
    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `Toplu_Stok_Kartlari_${new Date().toISOString().slice(0, 10)}.xlsx`;
    saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), fileName);
    
  };

  // Generate batch recipe Excel - EXACT same format as individual, just multiple rows  
  const generateBatchReceteExcel = async (mmGtRecipes, ymGtRecipes, ymStRecipes) => {
    
    const workbook = new ExcelJS.Workbook();
    
    // MM GT RECETE Sheet - EXACT same structure as individual
    const mmGtReceteSheet = workbook.addWorksheet('MM GT RECETE');
    const receteHeaders = getReceteHeaders();
    mmGtReceteSheet.addRow(receteHeaders);
    
    // FIXED: Add multiple MM GT recipe rows with per-product sequence numbering
    const mmGtByProduct = {};
    mmGtRecipes.forEach(recipe => {
      if (!mmGtByProduct[recipe.mm_gt_stok_kodu]) {
        mmGtByProduct[recipe.mm_gt_stok_kodu] = [];
      }
      mmGtByProduct[recipe.mm_gt_stok_kodu].push(recipe);
    });
    
    Object.keys(mmGtByProduct).forEach(stokKodu => {
      let productSiraNo = 1; // Restart sequence for each product
      mmGtByProduct[stokKodu].forEach(recipe => {
        mmGtReceteSheet.addRow(generateMmGtReceteRowForBatch(recipe.bilesen_kodu, recipe.miktar, productSiraNo, recipe.sequence, recipe.mm_gt_stok_kodu));
        productSiraNo++;
      });
    });
    
    // YM GT RECETE Sheet - EXACT same structure as individual
    const ymGtReceteSheet = workbook.addWorksheet('YM GT RECETE');
    ymGtReceteSheet.addRow(receteHeaders);
    
    // FIXED: Add multiple YM GT recipe rows with per-product sequence numbering
    const ymGtByProduct = {};
    ymGtRecipes.forEach(recipe => {
      if (!ymGtByProduct[recipe.ym_gt_stok_kodu]) {
        ymGtByProduct[recipe.ym_gt_stok_kodu] = [];
      }
      ymGtByProduct[recipe.ym_gt_stok_kodu].push(recipe);
    });
    
    Object.keys(ymGtByProduct).forEach(stokKodu => {
      let productSiraNo = 1; // Restart sequence for each product
      ymGtByProduct[stokKodu].forEach(recipe => {
        ymGtReceteSheet.addRow(generateYmGtReceteRowForBatch(recipe.bilesen_kodu, recipe.miktar, productSiraNo, recipe.sequence, recipe.ym_gt_stok_kodu));
        productSiraNo++;
      });
    });
    
    // YM ST RECETE Sheet - EXACT same structure as individual
    const ymStReceteSheet = workbook.addWorksheet('YM ST RECETE');
    ymStReceteSheet.addRow(receteHeaders);
    
    // FIXED: Add multiple YM ST recipe rows with per-product sequence numbering
    const ymStByProduct = {};
    ymStRecipes.forEach(recipe => {
      if (!ymStByProduct[recipe.ym_st_stok_kodu]) {
        ymStByProduct[recipe.ym_st_stok_kodu] = [];
      }
      ymStByProduct[recipe.ym_st_stok_kodu].push(recipe);
    });
    
    Object.keys(ymStByProduct).forEach(stokKodu => {
      let productSiraNo = 1; // Restart sequence for each product
      ymStByProduct[stokKodu].forEach(recipe => {
        ymStReceteSheet.addRow(generateYmStReceteRowForBatch(recipe.bilesen_kodu, recipe.miktar, productSiraNo, recipe.ym_st_stok_kodu));
        productSiraNo++;
      });
    });
    
    // Save with timestamp filename
    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `Toplu_Receteler_${new Date().toISOString().slice(0, 10)}.xlsx`;
    saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), fileName);
    
  };

  // Excel dosyalarini olustur
  const generateExcelFiles = async () => {
    try {
      // Check if we're editing a request and need approval (but not already in approval process)
      if (isEditingRequest && selectedRequest && !isInApprovalProcess) {
        setIsInApprovalProcess(true);
        setShowApproveConfirmModal(true);
        return; // Wait for approval
      }
      
      setIsLoading(true);
      setError(null);
      
      // Talep kullanildiysa, onaylama penceresi gostermeden isleme devam et
      if (isRequestUsed) {
        // Excel olusturmaya devam edecek, talep islemleri ayri bir surecte yonetilecek
      }
      
      if (![...selectedYmSts, ...autoGeneratedYmSts].length) {
        toast.error('En az bir YM ST secmelisiniz veya olusturmalisiniz');
        setIsLoading(false);
        return;
      }
      
      // Excel generation should use the processSequence that was set during database save
      // This ensures consistency between database and Excel files
      
      // Debug: Check sessionStorage for sequence consistency
      const storedSequence = sessionStorage.getItem('lastProcessSequence');
      
      // If processSequence is reset to 00 but we have the correct sequence in sessionStorage, use it
      const sequenceToUse = (processSequence === '00' && storedSequence && storedSequence !== '00') 
        ? storedSequence 
        : processSequence;
        
      if (storedSequence && storedSequence !== processSequence) {
        // console.warn(`SEQUENCE MISMATCH! processSequence: ${processSequence}, stored: ${storedSequence}`);
        // Update processSequence to match the stored value
        setProcessSequence(storedSequence);
      }
      
      // Calculate what the expected stok_kodu should be
      const capFormatted = Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0');
      const expectedStokKodu = `GT.${mmGtData.kod_2}.${capFormatted}.${sequenceToUse}`;
      
      if (!sequenceToUse || sequenceToUse === '00') {
        // console.warn(`UYARI: sequenceToUse '${sequenceToUse}' - bu beklenmeyen bir durum olabilir`);
      }
      
      // Her iki Excel'de de ayni sequence'i kullan
      // Stok Karti Excel
      try {
        await generateStokKartiExcel(sequenceToUse);
      } catch (excelError) {
        console.error('Stok karti Excel olusturma hatasi:', excelError);
        toast.error('Stok karti Excel olusturulamadi: ' + excelError.message);
        throw excelError; // Rethrow to stop the process
      }
      
      try {
        await generateReceteExcel(sequenceToUse);
      } catch (excelError) {
        console.error('Recete Excel olusturma hatasi:', excelError);
        toast.error('Recete Excel olusturulamadi: ' + excelError.message);
        throw excelError; // Rethrow to stop the process
      }
      
      // Both Excel files generated successfully
      
      // Only show success message if we're not in the request approval flow
      // (the approval flow will handle its own success message)
      if (!isEditingRequest) {
        setSuccessMessage('Excel dosyalari basariyla olusturuldu');
        toast.success('Excel dosyalari basariyla olusturuldu');
        
        // Clear the success message after 5 seconds
        setTimeout(() => {
          setSuccessMessage('');
        }, 5000);
      }
    } catch (error) {
      console.error('Excel olusturma ana hatasi:', error);
      setError('Excel olusturma hatasi: ' + error.message);
      toast.error('Excel olusturma hatasi: ' + error.message);
    } finally {
      setIsLoading(false);
      
      // Force UI update
      setTimeout(() => {
        // Reset loading state again just to be sure
        setIsLoading(false);
      }, 500);
    }
  };

  // Stok Karti Excel olustur - yeni 1:1:n iliski modeli ile
  const generateStokKartiExcel = async (sequenceParam = '00') => {
    // Use the passed sequence parameter which should be the correct one
    const sequence = sequenceParam || processSequence || '00';
    // Excel generation using sequence: ${sequence}
    
    const workbook = new ExcelJS.Workbook();
    const allYmSts = [...selectedYmSts, ...autoGeneratedYmSts];
    
    // Ana YM ST'yi belirle (ya secilmis ya da otomatik olusturulmus)
    const mainYmSt = allYmSts[mainYmStIndex] || allYmSts[0];
    
    
    // MM GT Sheet - Artik sadece 1 tane MM GT
    const mmGtSheet = workbook.addWorksheet('MM GT');
    const mmGtHeaders = getStokKartiHeaders();
    mmGtSheet.addRow(mmGtHeaders);
    
    // Sadece 1 MM GT ekle (dogru sequence ile)
    mmGtSheet.addRow(generateMmGtStokKartiData(sequence));
    
    // YM GT Sheet - Artik sadece 1 tane YM GT
    const ymGtSheet = workbook.addWorksheet('YM GT');
    const ymGtHeaders = getYmGtHeaders();
    ymGtSheet.addRow(ymGtHeaders);
    
    // Sadece 1 YM GT ekle (dogru sequence ile)
    ymGtSheet.addRow(generateYmGtStokKartiData(sequence));
    
    // YM ST Sheet - Tum YM ST'ler
    const ymStSheet = workbook.addWorksheet('YM ST');
    const ymStHeaders = getYmStHeaders();
    ymStSheet.addRow(ymStHeaders);
    
    // Ilk olarak ana YM ST'yi ekle
    ymStSheet.addRow(generateYmStStokKartiData(mainYmSt));
    
    // Sonra diger YM ST'leri ekle
    allYmSts.forEach((ymSt, index) => {
      // Ana YM ST'yi atla (zaten ekledik)
      if (index !== mainYmStIndex) {
        ymStSheet.addRow(generateYmStStokKartiData(ymSt));
      }
    });
    
    try {
      // Validate data before writing
      const buffer = await workbook.xlsx.writeBuffer();
      
      // Additional validation - ensure buffer is not empty
      if (buffer.byteLength === 0) {
        throw new Error('Stok Karti Excel buffer bos - veri sorunu');
      }
      
      // Generate filename using MMGT stok_kodu
      const capFormatted = Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0');
      const mmGtStokKodu = `GT.${mmGtData.kod_2}.${capFormatted}.${sequence}`;
      const filename = `${mmGtStokKodu}_Stok_Karti.xlsx`;
      
      saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename);
    } catch (excelError) {
      console.error('Stok Karti Excel olusturma hatasi:', excelError);
      throw new Error(`Stok Karti Excel dosyasi olusturulamadi: ${excelError.message}`);
    }
  };

  // Recete Excel olustur - Yeni 1:1:n iliski modeli ile
  const generateReceteExcel = async (sequenceParam = '00') => {
    // Use the passed sequence parameter which should be the correct one
    const sequence = sequenceParam || processSequence || '00';
    // Recipe Excel generation using sequence: ${sequence}
    
    const workbook = new ExcelJS.Workbook();
    const allYmSts = [...selectedYmSts, ...autoGeneratedYmSts];
    
    // Ana YM ST'yi belirle (ya secilmis ya da otomatik olusturulmus)
    const mainYmSt = allYmSts[mainYmStIndex] || allYmSts[0];
    const mainYmStIndex_ = mainYmStIndex; // Closure icin yerel degisken
    
    
    // MM GT RECETE Sheet
    const mmGtReceteSheet = workbook.addWorksheet('MM GT RECETE');
    const receteHeaders = getReceteHeaders();
    mmGtReceteSheet.addRow(receteHeaders);
    
    // Sadece ana YMST icin MM GT recete satirlari ekle
    const mmGtRecipe = { ...allRecipes.mmGtRecipes[mainYmStIndex_] } || {}; // Clone to avoid modifying the original
    
    // DUZELTME: Eger YM.GT kodu yanlis sequence'e sahipse duzelt
    // Dogru YM.GT kodu olustur - MMGT ile ayni sequence kullanilmali
    const correctStokKodu = `YM.GT.${mmGtData.kod_2}.${Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0')}.${sequence}`;
    
    // Recetedeki YM.GT kodlarini duzelt - yeni bir obje olusturarak
    const fixedRecipe = {};
    Object.entries(mmGtRecipe).forEach(([key, value]) => {
      if (key.includes('YM.GT.') && key !== correctStokKodu) {
        fixedRecipe[correctStokKodu] = value;
      } else {
        fixedRecipe[key] = value;
      }
    });
    
    // Duzeltilmis receteyi kullan
    const processedMmGtRecipe = fixedRecipe;
    
    let siraNo = 1;
    
    // MMGT recete siralamasi: fixed exact order as specified
    const recipeEntries = Object.entries(processedMmGtRecipe);
    
    // CRITICAL FIX: Ensure only ONE shrink entry exists for Excel
    const shrinkEntries = recipeEntries.filter(([key]) => key.includes('AMB.SHRINK.'));
    if (shrinkEntries.length > 1) {
      console.warn(`Multiple shrink entries found (${shrinkEntries.length}), cleaning for Excel generation:`);
      shrinkEntries.forEach(([key, value]) => console.warn(`  ${key}: ${value}`));
      
      // Find the one with highest value or first non-zero
      const activeShrink = shrinkEntries.find(([key, value]) => value > 0) || shrinkEntries[0];
      console.warn(`Using only: ${activeShrink[0]} = ${activeShrink[1]}`);
      
      // Remove all other shrink entries from the recipe for Excel
      shrinkEntries.forEach(([key]) => {
        if (key !== activeShrink[0]) {
          delete processedMmGtRecipe[key];
        }
      });
      
      // Regenerate entries after cleanup
      const cleanedEntries = Object.entries(processedMmGtRecipe);
      recipeEntries.length = 0;
      recipeEntries.push(...cleanedEntries);
    }
    
    // Maintain fixed order: YM.GT.*.*, GTPKT01, AMB.CEM.KARTON.GAL, AMB.SHRINK.*, SM.7MMHALKA, AMB.APEX CEMBER, AMB.TOKA.SIGNODE, SM.DESI.PAK
    // Duzeltme: YM.GT kodunu mamul_kodu ile ayni sequence'e sahip olacak sekilde ara
    const correctYmGtStokKodu = `YM.GT.${mmGtData.kod_2}.${Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0')}.${sequence}`;
    const ymGtEntry = recipeEntries.find(([key]) => key === correctYmGtStokKodu) || 
                      recipeEntries.find(([key]) => key.includes('YM.GT.'));
    const gtpkt01Entry = recipeEntries.find(([key]) => key === 'GTPKT01');
    const kartonEntry = recipeEntries.find(([key]) => key === 'AMB.CEM.KARTON.GAL');
    const shrinkEntry = recipeEntries.find(([key]) => key.includes('AMB.SHRINK.'));
    const halkaEntry = recipeEntries.find(([key]) => key === 'SM.7MMHALKA');
    const cemberEntry = recipeEntries.find(([key]) => key === 'AMB.APEX CEMBER 38X080');
    const tokaEntry = recipeEntries.find(([key]) => key === 'AMB.TOKA.SIGNODE.114P. DKP');
    const desiEntry = recipeEntries.find(([key]) => key === 'SM.DESI.PAK');
    
    // Other entries that might exist but aren't in the fixed order
    const otherEntries = recipeEntries.filter(([key]) => 
      !key.includes('YM.GT.') && 
      key !== 'GTPKT01' &&
      key !== 'AMB.CEM.KARTON.GAL' &&
      !key.includes('AMB.SHRINK.') &&
      key !== 'SM.7MMHALKA' &&
      key !== 'AMB.APEX CEMBER 38X080' &&
      key !== 'AMB.TOKA.SIGNODE.114P. DKP' &&
      key !== 'SM.DESI.PAK'
    );
    
    // Sirayla ekle - exact order
    const orderedEntries = [
      ymGtEntry, 
      gtpkt01Entry, 
      kartonEntry,
      shrinkEntry,
      halkaEntry,
      cemberEntry,
      tokaEntry,
      desiEntry,
      ...otherEntries
    ].filter(Boolean);
    
    // MM GT recete satirlarini eklerken dogru sequence'i kullan - Sadece 8 satir olmali
    orderedEntries.forEach(([key, value]) => {
      if (value > 0) {
        mmGtReceteSheet.addRow(generateMmGtReceteRow(key, value, siraNo, sequence));
        siraNo++;
      }
    });
    
    // Debugging: Check if we have exactly 8 rows as expected
    const addedRows = orderedEntries.filter(([key, value]) => value > 0).length;
    if (addedRows !== 8) {
      console.warn(`MMGT recetesi ${addedRows} satir iceriyor, 8 olmali. Girdiler:`, 
        orderedEntries.filter(([key, value]) => value > 0).map(([key]) => key));
    }
    
    // YM GT RECETE Sheet - Artik sadece 1 tane YM GT recetesi
    const ymGtReceteSheet = workbook.addWorksheet('YM GT RECETE');
    ymGtReceteSheet.addRow(receteHeaders);
    
    // Sadece 1 YM GT recetesi ekle - ayni sequence'i kullan
    let siraNo2 = 1;
    
    // YM GT recetesinden sequence'e uygun degerleri al - fixed exact order
    const ymGtRecipeEntries = Object.entries(allRecipes.ymGtRecipe);
    
    // Fixed order: YM.ST.*.*.*, GLV01, 150 03, SM.HIDROLIK.ASIT
    // Find YM.ST component in YM GT recipe
    const ymStEntry = ymGtRecipeEntries.find(([key]) => key.includes('YM.ST.'));
    const glv01Entry = ymGtRecipeEntries.find(([key]) => key === 'GLV01');
    // Get Cinko from YM GT recipe (NOT YM ST recipe)
    const zincEntry = ymGtRecipeEntries.find(([key]) => key === '150 03');
    const asitEntry = ymGtRecipeEntries.find(([key]) => key === 'SM.HIDROLIK.ASIT');
    
    // Other entries that might exist but aren't in the fixed order
    const otherYmGtEntries = ymGtRecipeEntries.filter(([key]) => 
      !key.includes('YM.ST.') && 
      key !== 'GLV01' && 
      key !== '150 03' && 
      key !== 'SM.HIDROLIK.ASIT'
    );
    
    // Sirayla ekle - exact order
    const orderedYmGtEntries = [
      ymStEntry, // Use the YM.ST entry as found
      glv01Entry,
      zincEntry,
      asitEntry,
      ...otherYmGtEntries
    ].filter(Boolean);
    
    orderedYmGtEntries.forEach(([key, value]) => {
      if (value > 0) {
        ymGtReceteSheet.addRow(generateYmGtReceteRow(key, value, siraNo2, sequence));
        siraNo2++;
      }
    });
    
    // YM ST RECETE Sheet - Tum YM ST'ler icin receteleri olustur
    const ymStReceteSheet = workbook.addWorksheet('YM ST RECETE');
    ymStReceteSheet.addRow(receteHeaders);
    
    // Ilk olarak ana YM ST'nin recetesini ekle
    let siraNoMain = 1;
    
    // Ana YMST recete siralamasi: fixed exact order - 1) FLM bileseni, 2) TLC01 operasyonu
    const mainYmStRecipe = allRecipes.ymStRecipes[mainYmStIndex_] || {};
    const mainRecipeEntries = Object.entries(mainYmStRecipe);
    
    // Fixed order: FLM.*.*, TLC01
    const mainFlmEntry = mainRecipeEntries.find(([key]) => key.includes('FLM.'));
    const mainTlc01Entry = mainRecipeEntries.find(([key]) => key === 'TLC01');
    
    // Any other entries that might exist but aren't in the fixed order
    const mainOtherEntries = mainRecipeEntries.filter(([key]) => 
      !key.includes('FLM.') && 
      key !== 'TLC01'
    );
    
    // Sirayla ekle - exact order
    const mainOrderedEntries = [
      mainFlmEntry,
      mainTlc01Entry,
      ...mainOtherEntries
    ].filter(Boolean);
    
    mainOrderedEntries.forEach(([key, value]) => {
      if (value > 0) {
        ymStReceteSheet.addRow(generateYmStReceteRow(key, value, siraNoMain, mainYmSt));
        siraNoMain++;
      }
    });
    
    // Diger YM ST'lerin recetelerini ekle
    allYmSts.forEach((ymSt, index) => {
      // Ana YM ST'yi atla (zaten ekledik)
      if (index !== mainYmStIndex_) {
        const ymStRecipe = allRecipes.ymStRecipes[index] || {};
        let siraNo = 1;
        
        // YMST recete siralamasi: fixed exact order - 1) FLM bileseni, 2) TLC01 operasyonu
        const recipeEntries = Object.entries(ymStRecipe);
        
        // Fixed order: FLM.*.*, TLC01
        const flmEntry = recipeEntries.find(([key]) => key.includes('FLM.'));
        const tlc01Entry = recipeEntries.find(([key]) => key === 'TLC01');
        
        // Any other entries that might exist but aren't in the fixed order
        const otherEntries = recipeEntries.filter(([key]) => 
          !key.includes('FLM.') && 
          key !== 'TLC01'
        );
        
        // Sirayla ekle - exact order
        const orderedEntries = [
          flmEntry,
          tlc01Entry,
          ...otherEntries
        ].filter(Boolean);
        
        orderedEntries.forEach(([key, value]) => {
          if (value > 0) {
            ymStReceteSheet.addRow(generateYmStReceteRow(key, value, siraNo, ymSt));
            siraNo++;
          }
        });
      }
    });
    
    try {
      // Validate data before writing
      const buffer = await workbook.xlsx.writeBuffer();
      
      // Additional validation - ensure buffer is not empty
      if (buffer.byteLength === 0) {
        throw new Error('Excel buffer bos - veri sorunu');
      }
      
      // Generate filename using MMGT stok_kodu
      const capFormatted = Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0');
      const mmGtStokKodu = `GT.${mmGtData.kod_2}.${capFormatted}.${sequence}`;
      const filename = `${mmGtStokKodu}_Recete.xlsx`;
      
      saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename);
    } catch (excelError) {
      console.error('Excel olusturma hatasi:', excelError);
      throw new Error(`Excel dosyasi olusturulamadi: ${excelError.message}`);
    }
  };

  // Excel header fonksiyonlari
  const getStokKartiHeaders = () => [
    'Stok Kodu', 'Stok Adi', 'Grup Kodu', 'Kod-1', 'Kod-2', 'Cari/Satici Kodu',
    'Ingilizce Isim', 'Satici Ismi', 'Muh. Detay', 'Depo Kodu', 'Br-1', 'Br-2',
    'Pay-1', 'Payda-1', 'Cevrim Degeri-1', 'Olcu Br-3', 'Cevrim Pay-2', 'Cevrim Payda-2',
    'Cevrim Degeri-2', 'Cap', 'Kaplama', 'Min Mukavemet', 'Max Mukavemet', 'KG',
    'Ic Cap/Boy Cubuk AD', 'Dis Cap/En Cubuk AD', 'Cap2', 'Shrink', 'Tolerans(+)',
    'Tolerans(-)', 'Ebat(En)', 'Goz Araligi', 'Ebat(Boy)', 'Hasir Tipi',
    'Ozel Saha 8 (Alf.)', 'Alis Fiyati', 'Fiyat Birimi', 'Satis Fiyati-1',
    'Satis Fiyati-2', 'Satis Fiyati-3', 'Satis Fiyati-4', 'Satis Tipi',
    'Doviz Alis', 'Doviz Maliyeti', 'Doviz Satis Fiyati', 'Azami Stok',
    'Asgari Stok', 'Dov.Tutar', 'Dov.Tipi', 'Bekleme Suresi', 'Temin Suresi',
    'Birim Agirlik', 'Nakliye Tutar', 'Satis KDV Orani', 'Alis KDV Orani',
    'Stok Turu', 'Mali Grup Kodu', 'Barkod 1', 'Barkod 2', 'Barkod 3',
    'Kod-3', 'Kod-4', 'Kod-5', 'Esnek Yapilandir', 'Super Recete Kullanilsin',
    'Bagli Stok Kodu', 'Yapilandirma Kodu', 'Yap. Aciklama', 'Alis Doviz Tipi',
    'Gumruk Tarife Kodu', 'Dagitici Kodu', 'Mensei', 'METARIAL', 'DIA (MM)',
    'DIA TOL (MM) +', 'DIA TOL (MM) -', 'ZING COATING (GR/M2)', 'TENSILE ST. (MPA) MIN',
    'TENSILE ST. (MPA) MAX', 'WAX', 'LIFTING LUGS', 'UNWINDING', 'CAST KONT. (CM)',
    'HELIX KONT. (CM)', 'ELONGATION (%) MIN', 'COIL DIMENSIONS (CM) ID',
    'COIL DIMENSIONS (CM) OD', 'COIL WEIGHT (KG)', 'COIL WEIGHT (KG) MIN',
    'COIL WEIGHT (KG) MAX'
  ];

  const getYmGtHeaders = () => [
    'Stok Kodu', 'Stok Adi', 'Grup Kodu', 'Kod-1', 'Kod-2', 'Cari/Satici Kodu',
    'Ingilizce Isim', 'Satici Ismi', 'Muh. Detay', 'Depo Kodu', 'Br-1', 'Br-2',
    'Pay-1', 'Payda-1', 'Cevrim Degeri-1', 'Olcu Br-3', 'Cevrim Pay-2', 'Cevrim Payda-2',
    'Cevrim Degeri-2', 'Cap', 'Kaplama', 'Min Mukavemet', 'Max Mukavemet', 'KG',
    'Ic Cap/Boy Cubuk AD', 'Dis Cap/En Cubuk AD', 'Cap2', 'Shrink', 'Tolerans(+)',
    'Tolerans(-)', 'Ebat(En)', 'Goz Araligi', 'Ebat(Boy)', 'Hasir Tipi',
    'Ozel Saha 8 (Alf.)', 'Alis Fiyati', 'Fiyat Birimi', 'Satis Fiyati-1',
    'Satis Fiyati-2', 'Satis Fiyati-3', 'Satis Fiyati-4', 'Satis Tipi',
    'Doviz Alis', 'Doviz Maliyeti', 'Doviz Satis Fiyati', 'Azami Stok',
    'Asgari Stok', 'Dov.Tutar', 'Dov.Tipi', 'Bekleme Suresi', 'Temin Suresi',
    'Birim Agirlik', 'Nakliye Tutar', 'Satis KDV Orani', 'Alis KDV Orani',
    'Stok Turu', 'Mali Grup Kodu', 'Barkod 1', 'Barkod 2', 'Barkod 3',
    'Kod-3', 'Kod-4', 'Kod-5', 'Esnek Yapilandir', 'Super Recete Kullanilsin',
    'Bagli Stok Kodu', 'Yapilandirma Kodu', 'Yap. Aciklama', 'Alis Doviz Tipi',
    'Gumruk Tarife Kodu', 'Dagitici Kodu', 'Mensei'
  ];

  const getYmStHeaders = () => [
    'Stok Kodu', 'Stok Adi', 'Grup Kodu', 'Kod-1', 'Kod-2', 'Kod-3',
    'Satis KDV Orani', 'Muh.Detay', 'Depo Kodu', 'Br-1', 'Br-2', 'Pay-1',
    'Payda-1', 'Cevrim Degeri-1', 'Olcu Br-3', 'Cevrim Pay-2', 'Cevrim Payda-2',
    'Cevrim Degeri-2', 'Alis Fiyati', 'Fiyat Birimi', 'Satis Fiyati-1',
    'Satis Fiyati-2', 'Satis Fiyati-3', 'Satis Fiyati-4', 'Doviz Tip',
    'Doviz Alis', 'Doviz Maliyeti', 'Doviz Satis Fiyati', 'Azami Stok',
    'Asgari Stok', 'Dov.Tutar', 'Dov.Tipi', 'Alis Doviz Tipi', 'Bekleme Suresi',
    'Temin Suresi', 'Birim Agirlik', 'Nakliye Tutar', 'Stok Turu', 'Mali Grup Kodu',
    'Ingilizce Isim', 'Ozel Saha 1 (Say.)', 'Ozel Saha 2 (Say.)', 'Ozel Saha 3 (Say.)',
    'Ozel Saha 4 (Say.)', 'Ozel Saha 5 (Say.)', 'Ozel Saha 6 (Say.)', 'Ozel Saha 7 (Say.)',
    'Ozel Saha 8 (Say.)', 'Ozel Saha 1 (Alf.)', 'Ozel Saha 2 (Alf.)', 'Ozel Saha 3 (Alf.)',
    'Ozel Saha 4 (Alf.)', 'Ozel Saha 5 (Alf.)', 'Ozel Saha 6 (Alf.)', 'Ozel Saha 7 (Alf.)',
    'Ozel Saha 8 (Alf.)', 'Kod-4', 'Kod-5', 'Esnek Yapilandir', 'Super Recete Kullanilsin',
    'Bagli Stok Kodu', 'Yapilandirma Kodu', 'Yap. Aciklama'
  ];

  const getReceteHeaders = () => [
    'Mamul Kodu(*)', 'Recete Top.', 'Fire Orani (%)', 'Oto.Rec.', 'Olcu Br.',
    'Sira No(*)', 'Operasyon Bilesen', 'Bilesen Kodu(*)', 'Olcu Br. - Bilesen',
    'Miktar(*)', 'Aciklama', 'Miktar Sabitle', 'Stok/Maliyet', 'Fire Mik.',
    'Sabit Fire Mik.', 'Istasyon Kodu', 'Hazirlik Suresi', 'Uretim Suresi',
    'U.A.Dahil Edilsin', 'Son Operasyon', 'Oncelik', 'Planlama Orani',
    'Alternatif Politika - D.A.Transfer Fisi', 'Alternatif Politika - Ambar C. Fisi',
    'Alternatif Politika - Uretim S.Kaydi', 'Alternatif Politika - MRP', 'IC/DIS'
  ];

  // Excel veri olusturma fonksiyonlari - dogru formatlar ve COMMA usage
  // Batch version that takes MM GT data as parameter
  const generateMmGtStokKartiDataForBatch = (mmGt) => {
    const cap = parseFloat(mmGt.cap);
    const toleransPlus = parseFloat(mmGt.tolerans_plus) || 0;
    const toleransMinus = parseFloat(mmGt.tolerans_minus) || 0;
    
    // Generate stok_adi for this specific MM GT
    const bagAmount = mmGt.cast_kont && mmGt.cast_kont.trim() !== '' 
      ? `/${mmGt.cast_kont}` 
      : '';
    const stokAdi = `Galvanizli Tel ${cap.toFixed(2).replace('.', ',')} mm -${Math.abs(toleransMinus).toFixed(2).replace('.', ',')}/+${toleransPlus.toFixed(2).replace('.', ',')} ${mmGt.kaplama || '0'} gr/m² ${mmGt.min_mukavemet || '0'}-${mmGt.max_mukavemet || '0'} MPa ID:${mmGt.ic_cap || '45'} cm OD:${mmGt.dis_cap || '75'} cm ${mmGt.kg || '0'}${bagAmount} kg`;
    
    // Generate English name
    const englishName = `Galvanized Wire ${cap.toFixed(2)} mm -${Math.abs(toleransMinus).toFixed(2)}/+${toleransPlus.toFixed(2)} ${mmGt.kaplama || '0'} gr/m² ${mmGt.min_mukavemet || '0'}-${mmGt.max_mukavemet || '0'} MPa ID:${mmGt.ic_cap || '45'} cm OD:${mmGt.dis_cap || '75'} cm ${mmGt.kg || '0'}${bagAmount} kg`;
    
    return [
      mmGt.stok_kodu, // Stok Kodu - use actual stok_kodu from database
      stokAdi, // Stok Adi
      'MM', // Grup Kodu
      'GT', // Kod-1
      mmGt.kod_2, // Kod-2
      '', // Cari/Satici Kodu
      englishName, // Ingilizce Isim
      '', // Satici Ismi
      '26', // Muh. Detay
      '36', // Depo Kodu
      'KG', // Br-1
      'TN', // Br-2
      '1', // Pay-1
      '1000', // Payda-1 (Excel formati - keep as 1000)
      '0.001', // Cevrim Degeri-1
      '', // Olcu Br-3
      '1', // Cevrim Pay-2
      '1', // Cevrim Payda-2
      '1', // Cevrim Degeri-2
      cap.toFixed(2).replace('.', ','), // Cap (VIRGUL for Excel)
      mmGt.kaplama, // Kaplama
      mmGt.min_mukavemet, // Min Mukavemet
      mmGt.max_mukavemet, // Max Mukavemet
      mmGt.kg, // KG
      mmGt.ic_cap, // Ic Cap
      mmGt.dis_cap, // Dis Cap
      '', // Cap2
      mmGt.shrink, // Shrink
      formatDecimalForExcel(mmGt.tolerans_plus), // Tolerans(+) (NOKTA format, no trailing zeros)
      formatDecimalForExcel(mmGt.tolerans_minus), // Tolerans(-) (NOKTA format, no trailing zeros)
      '', // Ebat(En)
      '', // Goz Araligi
      '', // Ebat(Boy)
      '', // Hasir Tipi
      '', // Ozel Saha 8 (Alf.)
      '0', // Alis Fiyati
      '1', // Fiyat Birimi
      '0', // Satis Fiyati-1
      '0', // Satis Fiyati-2
      '0', // Satis Fiyati-3
      '0', // Satis Fiyati-4
      '1', // Satis Tipi
      '0', // Doviz Alis
      '0', // Doviz Maliyeti
      '0', // Doviz Satis Fiyati
      '0', // Azami Stok
      '0', // Asgari Stok
      '', // Dov.Tutar
      '0', // Dov.Tipi
      '0', // Bekleme Suresi
      '0', // Temin Suresi
      '0', // Birim Agirlik
      '0', // Nakliye Tutar
      '20', // Satis KDV Orani
      '20', // Alis KDV Orani
      'D', // Stok Turu
      '', // Mali Grup Kodu
      '', // Barkod 1
      '', // Barkod 2
      '', // Barkod 3
      '', // Kod-3
      '', // Kod-4
      '', // Kod-5
      'H', // Esnek Yapilandir
      'H', // Super Recete Kullanilsin
      '', // Bagli Stok Kodu
      '', // Yapilandirma Kodu
      '', // Yap. Aciklama
      '2', // Alis Doviz Tipi
      getGumrukTarifeKodu(), // Gumruk Tarife Kodu
      '', // Dagitici Kodu
      '052', // Mensei
      'Galvanizli Tel', // METARIAL
      cap.toFixed(2).replace('.', ','), // DIA (MM) - COMMA for Excel
      formatDecimalForExcel(toleransPlus), // DIA TOL (MM) + (no trailing zeros)
      formatDecimalForExcel(toleransMinus), // DIA TOL (MM) - (no trailing zeros)
      mmGt.kaplama, // ZING COATING (GR/M2)
      mmGt.min_mukavemet, // TENSILE ST. (MPA) MIN
      mmGt.max_mukavemet, // TENSILE ST. (MPA) MAX
      '+', // WAX
      '+', // LIFTING LUGS
      mmGt.unwinding === 'Clockwise' ? 'Clockwise' : '', // UNWINDING
      mmGt.cast_kont || '', // CAST KONT. (CM)
      mmGt.helix_kont || '', // HELIX KONT. (CM)
      mmGt.elongation || '', // ELONGATION (%) MIN
      mmGt.ic_cap, // COIL DIMENSIONS (CM) ID
      mmGt.dis_cap, // COIL DIMENSIONS (CM) OD
      mmGt.kg, // COIL WEIGHT (KG)
      '', // COIL WEIGHT (KG) MIN
      '' // COIL WEIGHT (KG) MAX
    ];
  };

  const generateMmGtStokKartiData = (sequence = '00') => {
    const cap = parseFloat(mmGtData.cap);
    const capFormatted = Math.round(cap * 100).toString().padStart(4, '0');
    const stokKodu = `GT.${mmGtData.kod_2}.${capFormatted}.${sequence}`;
    
    
    return [
      stokKodu, // Stok Kodu
      generateStokAdiForExcel(), // Stok Adi
      'MM', // Grup Kodu
      'GT', // Kod-1
      mmGtData.kod_2, // Kod-2
      '', // Cari/Satici Kodu
      generateEnglishNameForExcel(), // Ingilizce Isim
      '', // Satici Ismi
      '26', // Muh. Detay
      '36', // Depo Kodu
      'KG', // Br-1
      'TN', // Br-2
      '1', // Pay-1
      '1000', // Payda-1 (Excel formati - keep as 1000)
      '0.001', // Cevrim Degeri-1
      '', // Olcu Br-3
      '1', // Cevrim Pay-2
      '1', // Cevrim Payda-2
      '1', // Cevrim Degeri-2
      cap.toFixed(2).replace('.', ','), // Cap (VIRGUL for Excel)
      mmGtData.kaplama, // Kaplama
      mmGtData.min_mukavemet, // Min Mukavemet
      mmGtData.max_mukavemet, // Max Mukavemet
      mmGtData.kg, // KG
      mmGtData.ic_cap, // Ic Cap
      mmGtData.dis_cap, // Dis Cap
      '', // Cap2
      mmGtData.shrink, // Shrink
      mmGtData.tolerans_plus, // Tolerans(+) (NOKTA format)
      mmGtData.tolerans_minus, // Tolerans(-) (NOKTA format)
      '', // Ebat(En)
      '', // Goz Araligi
      '', // Ebat(Boy)
      '', // Hasir Tipi
      '', // Ozel Saha 8 (Alf.)
      '0', // Alis Fiyati
      '1', // Fiyat Birimi
      '0', // Satis Fiyati-1
      '0', // Satis Fiyati-2
      '0', // Satis Fiyati-3
      '0', // Satis Fiyati-4
      '1', // Satis Tipi
      '0', // Doviz Alis
      '0', // Doviz Maliyeti
      '0', // Doviz Satis Fiyati
      '0', // Azami Stok
      '0', // Asgari Stok
      '', // Dov.Tutar
      '0', // Dov.Tipi
      '0', // Bekleme Suresi
      '0', // Temin Suresi
      '0', // Birim Agirlik
      '0', // Nakliye Tutar
      '20', // Satis KDV Orani
      '20', // Alis KDV Orani
      'D', // Stok Turu
      '', // Mali Grup Kodu
      '', // Barkod 1
      '', // Barkod 2
      '', // Barkod 3
      '', // Kod-3
      '', // Kod-4
      '', // Kod-5
      'H', // Esnek Yapilandir
      'H', // Super Recete Kullanilsin
      '', // Bagli Stok Kodu
      '', // Yapilandirma Kodu
      '', // Yap. Aciklama
      '2', // Alis Doviz Tipi
      getGumrukTarifeKodu(), // Gumruk Tarife Kodu
      '', // Dagitici Kodu
      '052', // Mensei
      'Galvanizli Tel', // METARIAL
      cap.toFixed(2).replace('.', ','), // DIA (MM) - COMMA for Excel
      parseFloat(mmGtData.tolerans_plus || 0).toFixed(2).replace('.', ','), // DIA TOL (MM) + - COMMA
      parseFloat(mmGtData.tolerans_minus || 0).toFixed(2).replace('.', ','), // DIA TOL (MM) - - COMMA
      mmGtData.kaplama, // ZING COATING (GR/M2)
      mmGtData.min_mukavemet, // TENSILE ST. (MPA) MIN
      mmGtData.max_mukavemet, // TENSILE ST. (MPA) MAX
      '+', // WAX
      '+', // LIFTING LUGS
      mmGtData.unwinding === 'Clockwise' ? 'Clockwise' : '', // UNWINDING
      mmGtData.cast_kont || '', // CAST KONT. (CM)
      mmGtData.helix_kont || '', // HELIX KONT. (CM)
      mmGtData.elongation || '', // ELONGATION (%) MIN
      mmGtData.ic_cap, // COIL DIMENSIONS (CM) ID
      mmGtData.dis_cap, // COIL DIMENSIONS (CM) OD
      mmGtData.kg, // COIL WEIGHT (KG)
      '', // COIL WEIGHT (KG) MIN
      '' // COIL WEIGHT (KG) MAX
    ];
  };

  // Batch version that takes YM GT data as parameter
  const generateYmGtStokKartiDataForBatch = (ymGt) => {
    // Extract cap and kod_2 from stok_kodu to recreate display values
    const stokParts = ymGt.stok_kodu.split('.');
    const kod2 = stokParts[2]; // GT kod_2
    const capCode = stokParts[3]; // cap code like 0250
    const cap = parseInt(capCode) / 100; // Convert back to decimal (0250 -> 2.50)
    const sequence = stokParts[4] || '00'; // sequence
    
    // Get values from YM GT data
    const toleransPlus = parseFloat(ymGt.tolerans_plus) || 0;
    const toleransMinus = parseFloat(ymGt.tolerans_minus) || 0;
    const kaplama = ymGt.kaplama || '0';
    const minMukavemet = ymGt.min_mukavemet || '0';
    const maxMukavemet = ymGt.max_mukavemet || '0';
    const icCap = ymGt.ic_cap || '45';
    const disCap = ymGt.dis_cap || '75';
    const kg = ymGt.kg || '0';
    const castKont = ymGt.cast_kont;
    
    // Determine if we need to append the bag amount (cast_kont) value
    const bagAmount = castKont && castKont.trim() !== '' ? `/${castKont}` : '';
    
    // Generate stok_adi - EXACT same format as individual export
    const stokAdi = `YM Galvanizli Tel ${cap.toFixed(2).replace('.', ',')} mm -${Math.abs(toleransMinus).toFixed(2).replace('.', ',')}/+${toleransPlus.toFixed(2).replace('.', ',')} ${kaplama} gr/m² ${minMukavemet}-${maxMukavemet} MPa ID:${icCap} cm OD:${disCap} cm ${kg}${bagAmount} kg`;
    
    // Generate cari_adi
    const cariAdi = `Tel ${cap.toFixed(2).replace('.', ',')} mm -${Math.abs(toleransMinus).toFixed(2).replace('.', ',')}/+${toleransPlus.toFixed(2).replace('.', ',')} ${kaplama} gr/m² ${minMukavemet}-${maxMukavemet} MPa ID:${icCap} cm OD:${disCap} cm ${kg} kg`;
    
    // Generate english name
    const englishName = `Galvanized Steel Wire ${cap.toFixed(2).replace('.', ',')} mm -${Math.abs(toleransMinus).toFixed(2).replace('.', ',')}/+${toleransPlus.toFixed(2).replace('.', ',')} ${kaplama} gr/m² ${minMukavemet}-${maxMukavemet} MPa ID:${icCap} cm OD:${disCap} cm ${kg} kg`;
    
    return [
      ymGt.stok_kodu, // Stok Kodu - use actual from database
      stokAdi, // Stok Adi - proper format
      'YM', // Grup Kodu
      'GT', // Kod-1
      kod2, // Kod-2
      cariAdi, // Cari/Satici Kodu - proper format
      englishName, // Ingilizce Isim - proper format
      '', // Satici Ismi
      '83', // Muh. Detay
      '35', // Depo Kodu
      'KG', // Br-1
      'TN', // Br-2
      '1', // Pay-1
      '1000', // Payda-1
      '0.001', // Cevrim Degeri-1
      '', // Olcu Br-3
      '1', // Cevrim Pay-2
      '1', // Cevrim Payda-2
      '1', // Cevrim Degeri-2
      cap.toFixed(2).replace('.', ','), // Cap
      kaplama, // Kaplama - YM GT HAS these values from database
      minMukavemet, // Min Mukavemet
      maxMukavemet, // Max Mukavemet
      kg, // KG
      icCap, // Ic Cap
      disCap, // Dis Cap
      '', // Cap2
      ymGt.shrink || '', // Shrink
      formatDecimalForExcel(toleransPlus), // Tolerans(+)
      formatDecimalForExcel(toleransMinus), // Tolerans(-)
      '', // Ebat(En)
      '', // Goz Araligi
      '', // Ebat(Boy)
      '', // Hasir Tipi
      '', // Ozel Saha 8 (Alf.)
      '0', // Alis Fiyati
      '1', // Fiyat Birimi
      '0', // Satis Fiyati-1
      '0', // Satis Fiyati-2
      '0', // Satis Fiyati-3
      '0', // Satis Fiyati-4
      '1', // Satis Tipi
      '0', // Doviz Alis
      '0', // Doviz Maliyeti
      '0', // Doviz Satis Fiyati
      '0', // Azami Stok
      '0', // Asgari Stok
      '', // Dov.Tutar
      '0', // Dov.Tipi
      '0', // Bekleme Suresi
      '0', // Temin Suresi
      '0', // Birim Agirlik
      '0', // Nakliye Tutar
      '20', // Satis KDV Orani
      '20', // Alis KDV Orani
      'M', // Stok Turu
      '', // Mali Grup Kodu
      '', // Barkod 1
      '', // Barkod 2
      '', // Barkod 3
      '', // Kod-3
      '', // Kod-4
      '', // Kod-5
      'H', // Esnek Yapilandir
      'H', // Super Recete Kullanilsin
      '', // Bagli Stok Kodu
      '', // Yapilandirma Kodu
      '', // Yap. Aciklama
      '2', // Alis Doviz Tipi
      getGumrukTarifeKodu(), // Gumruk Tarife Kodu
      '', // Dagitici Kodu
      '052', // Mensei
      'Galvanizli Tel', // METARIAL
      cap.toFixed(2).replace('.', ','), // DIA (MM)
      '', // DIA TOL (MM) +
      '', // DIA TOL (MM) -
      '', // ZING COATING (GR/M2)
      '', // TENSILE ST. (MPA) MIN
      '', // TENSILE ST. (MPA) MAX
      '', // WAX
      '', // LIFTING LUGS
      '', // UNWINDING
      '', // CAST KONT. (CM)
      '', // HELIX KONT. (CM)
      '', // ELONGATION (%) MIN
      '', // COIL DIMENSIONS (CM) ID
      '', // COIL DIMENSIONS (CM) OD
      '', // COIL WEIGHT (KG)
      '', // COIL WEIGHT (KG) MIN
      '' // COIL WEIGHT (KG) MAX
    ];
  };

  const generateYmGtStokKartiData = (sequence = '00') => {
    const cap = parseFloat(mmGtData.cap);
    const capFormatted = Math.round(cap * 100).toString().padStart(4, '0');
    
    return [
      `YM.GT.${mmGtData.kod_2}.${capFormatted}.${sequence}`, // Stok Kodu - sequence eslestirme!
      generateYmGtStokAdiForExcel(sequence), // Stok Adi - guncel sequence ile!
      'YM', // Grup Kodu
      'GT', // Kod-1
      mmGtData.kod_2, // Kod-2
      generateYmGtCariadiKodu(), // Cari/Satici Kodu
      generateYmGtInglizceIsim(), // Ingilizce Isim
      '', // Satici Ismi
      '83', // Muh. Detay
      '35', // Depo Kodu
      'KG', // Br-1
      'TN', // Br-2
      '1', // Pay-1
      '1000', // Payda-1 (Excel formati - keep as 1000)
      '0.001', // Cevrim Degeri-1
      '', // Olcu Br-3
      '1', // Cevrim Pay-2
      '1', // Cevrim Payda-2
      '1', // Cevrim Degeri-2
      cap.toFixed(2).replace('.', ','), // Cap (VIRGUL for Excel)
      mmGtData.kaplama, // Kaplama
      mmGtData.min_mukavemet, // Min Mukavemet
      mmGtData.max_mukavemet, // Max Mukavemet
      mmGtData.kg, // KG
      mmGtData.ic_cap, // Ic Cap
      mmGtData.dis_cap, // Dis Cap
      '', // Cap2
      mmGtData.shrink, // Shrink
      mmGtData.tolerans_plus, // Tolerans(+) - POINT for Excel
      mmGtData.tolerans_minus, // Tolerans(-) - POINT for Excel
      '', // Ebat(En)
      '', // Goz Araligi
      '', // Ebat(Boy)
      '', // Hasir Tipi
      '', // Ozel Saha 8 (Alf.)
      '0', // Alis Fiyati
      '1', // Fiyat Birimi
      '0', // Satis Fiyati-1
      '0', // Satis Fiyati-2
      '0', // Satis Fiyati-3
      '0', // Satis Fiyati-4
      '1', // Satis Tipi
      '0', // Doviz Alis
      '0', // Doviz Maliyeti
      '0', // Doviz Satis Fiyati
      '0', // Azami Stok
      '0', // Asgari Stok
      '', // Dov.Tutar
      '0', // Dov.Tipi
      '0', // Bekleme Suresi
      '0', // Temin Suresi
      '0', // Birim Agirlik
      '0', // Nakliye Tutar
      '20', // Satis KDV Orani
      '20', // Alis KDV Orani
      'D', // Stok Turu
      '', // Mali Grup Kodu
      '', // Barkod 1
      '', // Barkod 2
      '', // Barkod 3
      '', // Kod-3
      '', // Kod-4
      '', // Kod-5
      'H', // Esnek Yapilandir
      'H', // Super Recete Kullanilsin
      '', // Bagli Stok Kodu
      '', // Yapilandirma Kodu
      '', // Yap. Aciklama
      '', // Alis Doviz Tipi
      '', // Gumruk Tarife Kodu
      '', // Dagitici Kodu
      '' // Mensei
    ];
  };

  const generateYmStStokKartiData = (ymSt) => {
    return [
      ymSt.stok_kodu, // Stok Kodu
      ymSt.stok_adi, // Stok Adi
      'YM', // Grup Kodu
      'ST', // Kod-1
      '', // Kod-2
      '', // Kod-3
      '20', // Satis KDV Orani
      '28', // Muh.Detay
      '35', // Depo Kodu
      'KG', // Br-1
      'TN', // Br-2
      '1', // Pay-1
      '1000', // Payda-1 (Excel formati - keep as 1000)
      '0.001', // Cevrim Degeri-1
      '', // Olcu Br-3
      '1', // Cevrim Pay-2
      '1', // Cevrim Payda-2
      '1', // Cevrim Degeri-2
      '0', // Alis Fiyati
      '1', // Fiyat Birimi
      '0', // Satis Fiyati-1
      '0', // Satis Fiyati-2
      '0', // Satis Fiyati-3
      '0', // Satis Fiyati-4
      '1', // Doviz Tip
      '0', // Doviz Alis
      '0', // Doviz Maliyeti
      '0', // Doviz Satis Fiyati
      '0', // Azami Stok
      '0', // Asgari Stok
      '', // Dov.Tutar
      '0', // Dov.Tipi
      '0', // Alis Doviz Tipi
      '0', // Bekleme Suresi
      '0', // Temin Suresi
      '0', // Birim Agirlik
      '0', // Nakliye Tutar
      'D', // Stok Turu
      '', // Mali Grup Kodu
      '', // Ingilizce Isim
      '1', // Ozel Saha 1 (Say.)
      '0', // Ozel Saha 2 (Say.)
      '0', // Ozel Saha 3 (Say.)
      '0', // Ozel Saha 4 (Say.)
      '0', // Ozel Saha 5 (Say.)
      '0', // Ozel Saha 6 (Say.)
      '0', // Ozel Saha 7 (Say.)
      '0', // Ozel Saha 8 (Say.)
      '', // Ozel Saha 1 (Alf.)
      '', // Ozel Saha 2 (Alf.)
      '', // Ozel Saha 3 (Alf.)
      '', // Ozel Saha 4 (Alf.)
      '', // Ozel Saha 5 (Alf.)
      '', // Ozel Saha 6 (Alf.)
      '', // Ozel Saha 7 (Alf.)
      '', // Ozel Saha 8 (Alf.)
      '', // Kod-4
      '', // Kod-5
      'H', // Esnek Yapilandir
      'H', // Super Recete Kullanilsin
      '', // Bagli Stok Kodu
      '', // Yapilandirma Kodu
      '' // Yap. Aciklama
    ];
  };

  // Recete satir olusturma fonksiyonlari

  const generateMmGtReceteRow = (bilesenKodu, miktar, siraNo, sequence = '00') => {
    const capFormatted = Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0');
    
    return [
      `GT.${mmGtData.kod_2}.${capFormatted}.${sequence}`, // Mamul Kodu - guncel sequence ile!
      '1', // Recete Top.
      '0.0004', // Fire Orani (%) - NOKTA for decimals as requested
      '', // Oto.Rec.
      getOlcuBr(bilesenKodu), // Olcu Br.
      siraNo, // Sira No - incremental as requested
      bilesenKodu === 'GTPKT01' ? 'O' : 'B', // GTPKT01 should be marked as O (Operasyon) per Excel format
      bilesenKodu, // Bilesen Kodu
      '1', // Olcu Br. - Bilesen
      formatDecimalForExcel(miktar), // Miktar - virgul formatinda Excel icin, trailing zeros kaldirilmis
      getReceteAciklama(bilesenKodu), // Aciklama
      '', // Miktar Sabitle
      '', // Stok/Maliyet
      '', // Fire Mik.
      '', // Sabit Fire Mik.
      '', // Istasyon Kodu
      '', // Hazirlik Suresi
      bilesenKodu === 'GTPKT01' ? formatDecimalForExcel(miktar) : '', // Uretim Suresi - only for GTPKT01, trailing zeros kaldirilmis
      bilesenKodu === 'GTPKT01' ? 'E' : '', // U.A.Dahil Edilsin - only 'E' for Operasyon
      bilesenKodu === 'GTPKT01' ? 'E' : '', // Son Operasyon - only 'E' for Operasyon
      '', // Oncelik
      '', // Planlama Orani
      '', // Alternatif Politika - D.A.Transfer Fisi
      '', // Alternatif Politika - Ambar C. Fisi
      '', // Alternatif Politika - Uretim S.Kaydi
      '', // Alternatif Politika - MRP
      '' // IC/DIS
    ];
  };

  const generateYmGtReceteRow = (bilesenKodu, miktar, siraNo, sequence = '00') => {
    const capFormatted = Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0');
    
    return [
      `YM.GT.${mmGtData.kod_2}.${capFormatted}.${sequence}`, // Mamul Kodu - guncel sequence ile!
      '1', // Recete Top.
      '0', // Fire Orani (%)
      '', // Oto.Rec.
      getOlcuBr(bilesenKodu), // Olcu Br.
      siraNo, // Sira No - incremental as requested
      bilesenKodu === 'GLV01' ? 'O' : 'B', // According to Excel format, only GLV01 is O (Operasyon), all others are B (Bilesen)
      bilesenKodu, // Bilesen Kodu
      '1', // Olcu Br. - Bilesen
      formatDecimalForExcel(miktar), // Miktar - virgul formatinda Excel icin, trailing zeros kaldirilmis
      getReceteAciklama(bilesenKodu), // Aciklama
      '', // Miktar Sabitle
      '', // Stok/Maliyet
      '', // Fire Mik.
      '', // Sabit Fire Mik.
      '', // Istasyon Kodu
      '', // Hazirlik Suresi
      bilesenKodu === 'GLV01' ? formatDecimalForExcel(miktar) : '', // Uretim Suresi - only for GLV01, trailing zeros kaldirilmis
      bilesenKodu === 'GLV01' ? 'E' : '', // U.A.Dahil Edilsin - only 'E' for Operasyon
      bilesenKodu === 'GLV01' ? 'E' : '', // Son Operasyon - only 'E' for Operasyon
      '', // Oncelik
      '', // Planlama Orani
      '', // Alternatif Politika - D.A.Transfer Fisi
      '', // Alternatif Politika - Ambar C. Fisi
      '', // Alternatif Politika - Uretim S.Kaydi
      '', // Alternatif Politika - MRP
      '' // IC/DIS
    ];
  };


  const generateYmStReceteRow = (bilesenKodu, miktar, siraNo, ymSt) => {
    return [
      ymSt.stok_kodu || '', // Mamul Kodu
      '1', // Recete Top.
      '', // Fire Orani (%)
      '', // Oto.Rec.
      getOlcuBr(bilesenKodu), // Olcu Br.
      siraNo, // Sira No - incremental as requested
      bilesenKodu.includes('FLM.') ? 'B' : (bilesenKodu === 'TLC01' ? 'O' : 'B'), // FLM kodu her zaman B (Bilesen) olmali, sadece TLC01 O (Operasyon) olmali
      bilesenKodu, // Bilesen Kodu
      '1', // Olcu Br. - Bilesen
      formatDecimalForExcel(miktar), // Miktar - virgul formatinda Excel icin, trailing zeros kaldirilmis
      getReceteAciklama(bilesenKodu), // Aciklama
      '', // Miktar Sabitle
      '', // Stok/Maliyet
      '', // Fire Mik.
      '', // Sabit Fire Mik.
      '', // Istasyon Kodu
      '', // Hazirlik Suresi
      bilesenKodu === 'TLC01' ? formatDecimalForExcel(miktar) : '', // Uretim Suresi - Sadece TLC01 icin, formatDecimalForExcel kullan
      bilesenKodu === 'TLC01' ? 'E' : '', // U.A.Dahil Edilsin - only 'E' for Operasyon
      bilesenKodu === 'TLC01' ? 'E' : '', // Son Operasyon - only 'E' for Operasyon
      '', // Oncelik
      '', // Planlama Orani
      '', // Alternatif Politika - D.A.Transfer Fisi
      '', // Alternatif Politika - Ambar C. Fisi
      '', // Alternatif Politika - Uretim S.Kaydi
      '', // Alternatif Politika - MRP
      '' // IC/DIS
    ];
  };

  // Batch Excel icin MM GT recipe row generator
  const generateMmGtReceteRowForBatch = (bilesenKodu, miktar, siraNo, sequence, mmGtStokKodu) => {
    // FIXED: MM GT recipe should use MM GT stok kodu, not YM GT format
    // The mmGtStokKodu is already in correct format (GT.PAD.0087.00)
    
    return [
      mmGtStokKodu, // Mamul Kodu - Use MM GT kodu directly (GT.PAD.0087.00)
      '1', // Recete Top.
      '', // Fire Orani (%)
      '', // Oto.Rec.
      getOlcuBr(bilesenKodu), // Olcu Br.
      siraNo, // Sira No - incremental
      bilesenKodu.includes('FLM.') ? 'B' : (bilesenKodu === 'GTPKT01' ? 'O' : 'B'), // Bilesen/Operasyon
      bilesenKodu, // Bilesen Kodu
      '1', // Olcu Br. - Bilesen
      formatDecimalForExcel(miktar), // Miktar - trailing zeros removed
      getReceteAciklama(bilesenKodu), // Aciklama
      '', // Miktar Sabitle
      '', // Stok/Maliyet
      '', // Fire Mik.
      '', // Sabit Fire Mik.
      '', // Istasyon Kodu
      '', // Hazirlik Suresi
      bilesenKodu === 'GTPKT01' ? formatDecimalForExcel(miktar) : '', // Uretim Suresi - only for GTPKT01
      bilesenKodu === 'GTPKT01' ? 'E' : '', // U.A.Dahil Edilsin - only 'E' for Operasyon
      bilesenKodu === 'GTPKT01' ? 'E' : '', // Son Operasyon - only 'E' for Operasyon
      '', // Oncelik
      '', // Planlama Orani
      '', // Alternatif Politika - D.A.Transfer Fisi
      '', // Alternatif Politika - Ambar C. Fisi
      '', // Alternatif Politika - Uretim S.Kaydi
      '', // Alternatif Politika - MRP
      '' // IC/DIS
    ];
  };

  // Batch Excel icin YM GT recipe row generator
  const generateYmGtReceteRowForBatch = (bilesenKodu, miktar, siraNo, sequence, ymGtStokKodu) => {
    // Fix: Convert "150" to "150 03"
    const fixedBilesenKodu = bilesenKodu === '150' ? '150 03' : bilesenKodu;
    
    return [
      ymGtStokKodu, // Mamul Kodu - YM GT stok kodu from parameter
      '1', // Recete Top.
      '', // Fire Orani (%)
      '', // Oto.Rec.
      getOlcuBr(fixedBilesenKodu), // Olcu Br.
      siraNo, // Sira No - incremental
      fixedBilesenKodu === 'GLV01' ? 'O' : 'B', // GLV01 is O (Operasyon), others are B (Bilesen)
      fixedBilesenKodu, // Bilesen Kodu
      '1', // Olcu Br. - Bilesen
      formatDecimalForExcel(miktar), // Miktar - trailing zeros removed
      getReceteAciklama(fixedBilesenKodu), // Aciklama
      '', // Miktar Sabitle
      '', // Stok/Maliyet
      '', // Fire Mik.
      '', // Sabit Fire Mik.
      '', // Istasyon Kodu
      '', // Hazirlik Suresi
      fixedBilesenKodu === 'GLV01' ? formatDecimalForExcel(miktar) : '', // Uretim Suresi - only for GLV01
      fixedBilesenKodu === 'GLV01' ? 'E' : '', // U.A.Dahil Edilsin - only 'E' for Operasyon
      fixedBilesenKodu === 'GLV01' ? 'E' : '', // Son Operasyon - only 'E' for Operasyon
      '', // Oncelik
      '', // Planlama Orani
      '', // Alternatif Politika - D.A.Transfer Fisi
      '', // Alternatif Politika - Ambar C. Fisi
      '', // Alternatif Politika - Uretim S.Kaydi
      '', // Alternatif Politika - MRP
      '' // IC/DIS
    ];
  };

  // Batch Excel icin YM ST recipe row generator (stok_kodu parametreli)
  const generateYmStReceteRowForBatch = (bilesenKodu, miktar, siraNo, stokKodu) => {
    return [
      stokKodu, // Mamul Kodu - batch'de parametre olarak verilen stok kodu
      '1', // Recete Top.
      '', // Fire Orani (%)
      '', // Oto.Rec.
      getOlcuBr(bilesenKodu), // Olcu Br.
      siraNo, // Sira No - incremental as requested
      bilesenKodu.includes('FLM.') ? 'B' : (bilesenKodu === 'TLC01' ? 'O' : 'B'), // FLM kodu her zaman B (Bilesen) olmali, sadece TLC01 O (Operasyon) olmali
      bilesenKodu, // Bilesen Kodu
      '1', // Olcu Br. - Bilesen
      formatDecimalForExcel(miktar), // Miktar - virgul formatinda Excel icin, trailing zeros kaldirilmis
      getReceteAciklama(bilesenKodu), // Aciklama
      '', // Miktar Sabitle
      '', // Stok/Maliyet
      '', // Fire Mik.
      '', // Sabit Fire Mik.
      '', // Istasyon Kodu
      '', // Hazirlik Suresi
      bilesenKodu === 'TLC01' ? formatDecimalForExcel(miktar) : '', // Uretim Suresi - only for TLC01, trailing zeros kaldirilmis
      bilesenKodu === 'TLC01' ? 'E' : '', // U.A.Dahil Edilsin - only 'E' for Operasyon
      bilesenKodu === 'TLC01' ? 'E' : '', // Son Operasyon - only 'E' for Operasyon
      '', // Oncelik
      '', // Planlama Orani
      '', // Alternatif Politika - D.A.Transfer Fisi
      '', // Alternatif Politika - Ambar C. Fisi
      '', // Alternatif Politika - Uretim S.Kaydi
      '', // Alternatif Politika - MRP
      '' // IC/DIS
    ];
  };

  // String olusturma fonksiyonlari - COMMA Excel formatinda
  // Database version - uses POINT format
  const generateStokAdi = () => {
    const cap = parseFloat(mmGtData.cap) || 0;
    const toleransPlus = parseFloat(mmGtData.tolerans_plus) || 0;
    const toleransMinus = parseFloat(mmGtData.tolerans_minus) || 0;
    
    // Determine if we need to append the bag amount (cast_kont) value
    const bagAmount = mmGtData.cast_kont && mmGtData.cast_kont.trim() !== '' 
      ? `/${mmGtData.cast_kont}` 
      : '';
    
    // Use point for database storage - NO comma replacement for database
    return `Galvanizli Tel ${cap.toFixed(2)} mm -${Math.abs(toleransMinus).toFixed(2)}/+${toleransPlus.toFixed(2)} ${mmGtData.kaplama || '0'} gr/m² ${mmGtData.min_mukavemet || '0'}-${mmGtData.max_mukavemet || '0'} MPa ID:${mmGtData.ic_cap || '45'} cm OD:${mmGtData.dis_cap || '75'} cm ${mmGtData.kg || '0'}${bagAmount} kg`;
  };

  // Excel version - uses COMMA format  
  const generateStokAdiForExcel = () => {
    const cap = parseFloat(mmGtData.cap) || 0;
    const toleransPlus = parseFloat(mmGtData.tolerans_plus) || 0;
    const toleransMinus = parseFloat(mmGtData.tolerans_minus) || 0;
    
    // Determine if we need to append the bag amount (cast_kont) value
    const bagAmount = mmGtData.cast_kont && mmGtData.cast_kont.trim() !== '' 
      ? `/${mmGtData.cast_kont}` 
      : '';
    
    // Use comma for Excel display
    return `Galvanizli Tel ${cap.toFixed(2).replace('.', ',')} mm -${Math.abs(toleransMinus).toFixed(2).replace('.', ',')}/+${toleransPlus.toFixed(2).replace('.', ',')} ${mmGtData.kaplama || '0'} gr/m² ${mmGtData.min_mukavemet || '0'}-${mmGtData.max_mukavemet || '0'} MPa ID:${mmGtData.ic_cap || '45'} cm OD:${mmGtData.dis_cap || '75'} cm ${mmGtData.kg || '0'}${bagAmount} kg`;
  };

  // Database version for YM GT - uses POINT format
  const generateYmGtStokAdi = (sequence = '00') => {
    const cap = parseFloat(mmGtData.cap) || 0;
    const toleransPlus = parseFloat(mmGtData.tolerans_plus) || 0;
    const toleransMinus = parseFloat(mmGtData.tolerans_minus) || 0;
    
    // Determine if we need to append the bag amount (cast_kont) value
    const bagAmount = mmGtData.cast_kont && mmGtData.cast_kont.trim() !== '' 
      ? `/${mmGtData.cast_kont}` 
      : '';
    
    // Use point for database storage
    return `YM Galvanizli Tel ${cap.toFixed(2)} mm -${Math.abs(toleransMinus).toFixed(2)}/+${toleransPlus.toFixed(2)} ${mmGtData.kaplama || '0'} gr/m² ${mmGtData.min_mukavemet || '0'}-${mmGtData.max_mukavemet || '0'} MPa ID:${mmGtData.ic_cap || '45'} cm OD:${mmGtData.dis_cap || '75'} cm ${mmGtData.kg || '0'}${bagAmount} kg`;
  };

  // Excel version for YM GT - uses COMMA format
  const generateYmGtStokAdiForExcel = (sequence = '00') => {
    const cap = parseFloat(mmGtData.cap) || 0;
    const toleransPlus = parseFloat(mmGtData.tolerans_plus) || 0;
    const toleransMinus = parseFloat(mmGtData.tolerans_minus) || 0;
    
    // Determine if we need to append the bag amount (cast_kont) value
    const bagAmount = mmGtData.cast_kont && mmGtData.cast_kont.trim() !== '' 
      ? `/${mmGtData.cast_kont}` 
      : '';
    
    // Use comma for Excel display
    return `YM Galvanizli Tel ${cap.toFixed(2).replace('.', ',')} mm -${Math.abs(toleransMinus).toFixed(2).replace('.', ',')}/+${toleransPlus.toFixed(2).replace('.', ',')} ${mmGtData.kaplama || '0'} gr/m² ${mmGtData.min_mukavemet || '0'}-${mmGtData.max_mukavemet || '0'} MPa ID:${mmGtData.ic_cap || '45'} cm OD:${mmGtData.dis_cap || '75'} cm ${mmGtData.kg || '0'}${bagAmount} kg`;
  };

  const generateYmGtCariadiKodu = () => {
    const cap = parseFloat(mmGtData.cap) || 0;
    const toleransPlus = parseFloat(mmGtData.tolerans_plus) || 0;
    const toleransMinus = parseFloat(mmGtData.tolerans_minus) || 0;
    
    return `Tel ${cap.toFixed(2).replace('.', ',')} mm -${Math.abs(toleransMinus).toFixed(2).replace('.', ',')}/+${toleransPlus.toFixed(2).replace('.', ',')} ${mmGtData.kaplama || '0'} gr/m² ${mmGtData.min_mukavemet || '0'}-${mmGtData.max_mukavemet || '0'} MPa ID:${mmGtData.ic_cap || '45'} cm OD:${mmGtData.dis_cap || '75'} cm ${mmGtData.kg || '0'} kg`;
  };

  const generateYmGtInglizceIsim = () => {
    const cap = parseFloat(mmGtData.cap) || 0;
    const toleransPlus = parseFloat(mmGtData.tolerans_plus) || 0;
    const toleransMinus = parseFloat(mmGtData.tolerans_minus) || 0;
    
    return `Galvanized Steel Wire ${cap.toFixed(2).replace('.', ',')} mm -${Math.abs(toleransMinus).toFixed(2).replace('.', ',')}/+${toleransPlus.toFixed(2).replace('.', ',')} ${mmGtData.kaplama || '0'} gr/m² ${mmGtData.min_mukavemet || '0'}-${mmGtData.max_mukavemet || '0'} MPa ID:${mmGtData.ic_cap || '45'} cm OD:${mmGtData.dis_cap || '75'} cm ${mmGtData.kg || '0'} kg`;
  };

  // Database version - uses POINT format
  const generateEnglishName = () => {
    const cap = parseFloat(mmGtData.cap) || 0;
    const toleransPlus = parseFloat(mmGtData.tolerans_plus) || 0;
    const toleransMinus = parseFloat(mmGtData.tolerans_minus) || 0;
    
    // Use points for database storage
    return `Galvanized Steel Wire ${cap.toFixed(2)} mm -${Math.abs(toleransMinus).toFixed(2)}/+${toleransPlus.toFixed(2)} ${mmGtData.kaplama || '0'} gr/m² ${mmGtData.min_mukavemet || '0'}-${mmGtData.max_mukavemet || '0'} MPa ID:${mmGtData.ic_cap || '45'} cm OD:${mmGtData.dis_cap || '75'} cm ${mmGtData.kg || '0'} kg`;
  };

  // Excel version - uses COMMA format
  const generateEnglishNameForExcel = () => {
    const cap = parseFloat(mmGtData.cap) || 0;
    const toleransPlus = parseFloat(mmGtData.tolerans_plus) || 0;
    const toleransMinus = parseFloat(mmGtData.tolerans_minus) || 0;
    
    // Use comma for Excel display
    return `Galvanized Steel Wire ${cap.toFixed(2).replace('.', ',')} mm -${Math.abs(toleransMinus).toFixed(2).replace('.', ',')}/+${toleransPlus.toFixed(2).replace('.', ',')} ${mmGtData.kaplama || '0'} gr/m² ${mmGtData.min_mukavemet || '0'}-${mmGtData.max_mukavemet || '0'} MPa ID:${mmGtData.ic_cap || '45'} cm OD:${mmGtData.dis_cap || '75'} cm ${mmGtData.kg || '0'} kg`;
  };

  // Talep onaylama
  const handleApproveRequest = async () => {
    if (!selectedRequest || !databaseIds.mmGtIds.length) {
      toast.error('Onaylamak icin once veritabanina kaydedin');
      return;
    }
    
    try {
      setIsLoading(true);
      
      const response = await fetchWithAuth(`${API_URLS.galSalRequests}/${selectedRequest.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'approved',
          processed_by: user.username,
          processed_at: new Date().toISOString(),
          mm_gt_id: databaseIds.mmGtIds[0] // Ilk MM GT ID'yi kullan
        })
      });
      
      if (response && response.ok) {
        toast.success('Talep basariyla onaylandi');
        fetchRequests();
        setSelectedRequest(null);
      } else {
        throw new Error('Talep onaylanamadi');
      }
    } catch (error) {
      console.error('Talep onaylama hatasi:', error);
      toast.error('Talep onaylama hatasi: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Talep reddetme
  const handleRejectRequest = async () => {
    if (!selectedRequest) return;
    
    const reason = prompt('Red nedeni:');
    if (!reason) return;
    
    try {
      setIsLoading(true);
      
      const response = await fetchWithAuth(`${API_URLS.galSalRequests}/${selectedRequest.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'rejected',
          processed_by: user.username,
          processed_at: new Date().toISOString(),
          rejection_reason: reason
        })
      });
      
      if (response && response.ok) {
        toast.success('Talep basariyla reddedildi');
        fetchRequests();
        setSelectedRequest(null);
      } else {
        throw new Error('Talep reddedilemedi');
      }
    } catch (error) {
      console.error('Talep reddetme hatasi:', error);
      toast.error('Talep reddetme hatasi: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Shrink miktari ve tipi ile ilgili yardimci fonksiyonlar
  const handleShrinkChange = (recipeIndex, newShrinkCode) => {
    const currentShrinkAmount = calculateShrinkAmount(parseFloat(mmGtData.kg) || 0);
    const allYmSts = [...selectedYmSts, ...autoGeneratedYmSts];
    
    // Mevcut receteleri guncelle
    updateRecipeValue('mmgt', recipeIndex, newShrinkCode, currentShrinkAmount);
    
    // Eski shrink kodlarini temizle (eger farkliysa)
    const shrinkTypes = ['AMB.SHRINK.200*140CM', 'AMB.SHRINK.200*160CM', 'AMB.SHRINK.200*190CM'];
    shrinkTypes.forEach(shrinkType => {
      if (shrinkType !== newShrinkCode) {
        updateRecipeValue('mmgt', recipeIndex, shrinkType, 0);
      }
    });
    
    // Update dropdown state to reflect the change
    setActiveTabDropdownValues(prev => ({
      ...prev,
      shrinkType: newShrinkCode
    }));
  };

  return (
    <div className="p-6 max-w-7xl mx-auto bg-gray-50 min-h-screen">
      {/* Ana Baslik ve Butonlar */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
          <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          Galvanizli Tel Netsis Entegrasyonu
        </h1>
        
        <div className="flex gap-3">
          <button
            onClick={() => setShowSettingsModal(true)}
            className="px-3 py-2 bg-gray-800 text-white rounded-md text-sm flex items-center"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Hesaplama Degerleri
          </button>
          <button
            onClick={() => setShowExistingMmGtModal(true)}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors shadow-lg flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Veritabani
          </button>
          
          <button
            onClick={() => {
              setShowRequestsModal(true);
              fetchRequests(); // Auto-refresh when opening modal
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-lg relative flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            Talepler
            {requests.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {requests.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Ana Icerik */}
      {currentStep === 'input' && (
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-800">MM GT Urun Bilgileri</h2>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              <span>Zorunlu Alanlar</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Cap (mm) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={normalizeDecimalDisplay(mmGtData.cap)}
                onChange={(e) => handleInputChange('cap', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                placeholder="0.00000"
                lang="en-US" // Force EN-US locale with point decimal separator
                onKeyDown={(e) => handleCommaToPoint(e, 'cap')}
              />
              <p className="text-xs text-gray-500 mt-1">Izin verilen aralik: 0.8 - 8 mm</p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Kaplama Turu <span className="text-red-500">*</span>
              </label>
              <select
                value={mmGtData.kod_2}
                onChange={(e) => handleInputChange('kod_2', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
              >
                <option value="NIT">NIT</option>
                <option value="PAD">PAD</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Kaplama (gr/m²) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={normalizeDecimalDisplay(mmGtData.kaplama)}
                onChange={(e) => handleInputChange('kaplama', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                disabled={mmGtData.kod_2 === 'PAD'}
                placeholder="50-400"
                onKeyDown={(e) => handleCommaToPoint(e, 'kaplama')}
              />
              {mmGtData.kod_2 === 'PAD' ? (
                <p className="text-xs text-gray-500 mt-1">PAD kaplama icin sabit deger: 50 g/m²</p>
              ) : (
                <p className="text-xs text-gray-500 mt-1">NIT kaplama icin izin verilen aralik: 100 - 400 g/m²</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Min Mukavemet (MPa) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={normalizeDecimalDisplay(mmGtData.min_mukavemet)}
                onChange={(e) => handleInputChange('min_mukavemet', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                placeholder="350-1000"
                onKeyDown={(e) => handleCommaToPoint(e, 'min_mukavemet')}
              />
              <p className="text-xs text-gray-500 mt-1">Onerilen aralik: 350 - 1000 MPa</p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Max Mukavemet (MPa) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={normalizeDecimalDisplay(mmGtData.max_mukavemet)}
                onChange={(e) => handleInputChange('max_mukavemet', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                placeholder="350-1000"
                onKeyDown={(e) => handleCommaToPoint(e, 'max_mukavemet')}
              />
              <p className="text-xs text-gray-500 mt-1">Onerilen aralik: 350 - 1000 MPa</p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Agirlik (kg) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={normalizeDecimalDisplay(mmGtData.kg)}
                onChange={(e) => handleInputChange('kg', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                placeholder="250-1250"
                onKeyDown={(e) => handleCommaToPoint(e, 'kg')}
              />
              <p className="text-xs text-gray-500 mt-1">Izin verilen aralik: 250 - 1250 kg</p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Ic Cap (cm)
              </label>
              <select
                value={mmGtData.ic_cap}
                onChange={(e) => handleInputChange('ic_cap', parseInt(e.target.value))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
              >
                <option value={45}>45</option>
                <option value={50}>50</option>
                <option value={55}>55</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Dis Cap (cm)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={normalizeDecimalDisplay(mmGtData.dis_cap || '')}
                onChange={(e) => handleInputChange('dis_cap', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-all bg-gray-50"
                readOnly
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Tolerans (+)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={normalizeDecimalDisplay(mmGtData.tolerans_plus || '')}
                onChange={(e) => handleInputChange('tolerans_plus', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                placeholder="0.00000"
                onKeyDown={(e) => handleCommaToPoint(e, 'tolerans_plus')}
              />
              <p className="text-xs text-gray-500 mt-1">Izin verilen aralik: 0 - 0.10 mm</p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Tolerans (-)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={normalizeDecimalDisplay(mmGtData.tolerans_minus || '')}
                onChange={(e) => handleInputChange('tolerans_minus', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                placeholder="0.00000"
                onKeyDown={(e) => handleCommaToPoint(e, 'tolerans_minus')}
              />
              <p className="text-xs text-gray-500 mt-1">Izin verilen aralik: 0 - 0.10 mm</p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Shrink
              </label>
              <select
                value={mmGtData.shrink}
                onChange={(e) => handleInputChange('shrink', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
              >
                <option value="evet">Evet</option>
                <option value="hayir">Hayir</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Unwinding
              </label>
              <select
                value={mmGtData.unwinding}
                onChange={(e) => handleInputChange('unwinding', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
              >
                <option value="">Anti-Clockwise (Varsayilan)</option>
                <option value="Clockwise">Clockwise</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Bag Miktari
              </label>
              <input
                type="text"
                value={mmGtData.cast_kont}
                onChange={(e) => handleInputChange('cast_kont', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                placeholder="Orn: 100"
              />
              <p className="text-xs text-gray-500 mt-1">Bag miktari, stok adinda kg degerinden sonra '/100' seklinde gorunecektir</p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Helix Kont
              </label>
              <input
                type="text"
                value={mmGtData.helix_kont}
                onChange={(e) => handleInputChange('helix_kont', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                placeholder="Opsiyonel"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Elongation
              </label>
              <input
                type="text"
                value={mmGtData.elongation}
                onChange={(e) => handleInputChange('elongation', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                placeholder="Opsiyonel"
              />
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              onClick={handleNext}
              disabled={isLoading}
              className="bg-red-600 text-white px-8 py-3 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 shadow-lg flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Isleniyor...
                </>
              ) : (
                <>
                  Devam
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {currentStep === 'summary' && (
        <div className="space-y-6">
          {/* Durum Cubugu */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {selectedRequest && (
                  <div className="bg-blue-50 px-4 py-2 rounded-lg">
                    <span className="text-blue-700 font-medium">Talep Secildi</span>
                  </div>
                )}
                {selectedExistingMmGt && (
                  <div className="bg-purple-50 px-4 py-2 rounded-lg">
                    <span className="text-purple-700 font-medium">Mevcut MM GT Secildi</span>
                  </div>
                )}
                {isRequestUsed && (
                  <div className="bg-yellow-50 px-4 py-2 rounded-lg border border-yellow-200">
                    <span className="text-yellow-700 font-medium">
                      {isEditingRequest 
                        ? "Duzenlenen talep icin kaydet/export islemi sonrasi talep onaylanacaktir" 
                        : "Kullanilan talep var - Talep onaylandi olarak isaretlenmistir"}
                    </span>
                  </div>
                )}
              </div>
              
              <button
                onClick={handleBackToManual}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Manuel Girise Don
              </button>
            </div>
          </div>

          {/* MM GT Ozet */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <span className="text-red-600 font-bold">MM</span>
              </div>
              MM GT Urun Ozeti
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { label: 'Stok Kodu', value: `GT.${mmGtData.kod_2}.${Math.round(parseFloat(mmGtData.cap || 0) * 100).toString().padStart(4, '0')}.00` },
                { label: 'Cap', value: `${mmGtData.cap || '0'} mm` },
                { label: 'Kaplama Turu', value: mmGtData.kod_2 },
                { label: 'Kaplama', value: `${mmGtData.kaplama || '0'} gr/m²` },
                { label: 'Mukavemet', value: `${mmGtData.min_mukavemet || '0'}-${mmGtData.max_mukavemet || '0'} MPa` },
                { label: 'Agirlik', value: `${mmGtData.kg || '0'} kg` }
              ].map((item, index) => (
                <div key={index} className="bg-gray-50 p-4 rounded-lg">
                  <span className="text-sm text-gray-500 block">{item.label}:</span>
                  <p className="font-semibold text-gray-800">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* YM GT Ozet */}
          {ymGtData && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <span className="text-yellow-600 font-bold">YM</span>
                </div>
                YM GT Urun Ozeti
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <span className="text-sm text-gray-500 block">Stok Kodu:</span>
                  <p className="font-semibold text-gray-800">{ymGtData.stok_kodu}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <span className="text-sm text-gray-500 block">Stok Adi:</span>
                  <p className="font-semibold text-gray-800">{ymGtData.stok_adi}</p>
                </div>
              </div>
            </div>
          )}

          {/* YM ST Yonetimi - Gelistirilmis UI */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 font-bold">ST</span>
                </div>
                YM ST Secimi ve Yonetimi
              </h2>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAddYmStModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-lg flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Manuel YM ST Olustur
                </button>
                <button
                  onClick={async () => {
                    setShowYmStSelectionModal(true);
                    // Load all YM STs for selection with auto-suggested ones on top
                    try {
                      const response = await fetchWithAuth(API_URLS.galYmSt);
                      if (response && response.ok) {
                        const allYmSts = await response.json();
                        if (Array.isArray(allYmSts)) {
                          // Get suggested YM STs using the same logic as Otomatik Olustur
                          const cap = parseFloat(mmGtData.cap) || 0;
                          const suggestedYmSts = [];
                          const otherYmSts = [];
                          
                          allYmSts.forEach(ymSt => {
                            const ymStCap = parseFloat(ymSt.cap) || 0;
                            const capDifference = Math.abs(ymStCap - cap);
                            // Use same suggestion logic as Otomatik Olustur
                            if (capDifference <= 0.5) {
                              suggestedYmSts.push(ymSt);
                            } else {
                              otherYmSts.push(ymSt);
                            }
                          });
                          
                          // Sort suggested ones by closest cap match
                          suggestedYmSts.sort((a, b) => {
                            const aDiff = Math.abs(parseFloat(a.cap || 0) - cap);
                            const bDiff = Math.abs(parseFloat(b.cap || 0) - cap);
                            return aDiff - bDiff;
                          });
                          
                          // Combine: suggested ones first, then others
                          setAllYmStsForSelection([...suggestedYmSts, ...otherYmSts]);
                        }
                      }
                    } catch (error) {
                      console.error('YM ST verileri yuklenemedi:', error);
                      toast.error('YM ST verileri yuklenemedi');
                    }
                  }}
                  disabled={isLoading}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors shadow-lg flex items-center gap-2 disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                  </svg>
                  Kayitlilardan Sec
                </button>
                <button
                  onClick={generateAutoYmSts}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors shadow-lg flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Otomatik Olustur
                </button>
              </div>
            </div>


            {/* Secilen YM ST'ler - Iyilestirilmis tasarim */}
            {(selectedYmSts.length > 0 || autoGeneratedYmSts.length > 0) && (
              <div className="border-t pt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-700">Secilen / Olusturulan YM ST'ler</h3>
                  <div className="flex items-center">
                    <span className="text-sm text-blue-700 font-semibold mr-2">
                      <svg className="w-5 h-5 inline-block mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
                      </svg>
                      Ana YM ST'yi secin - Urun iliskisi buna gore kurulacak
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Secilen YM ST'ler */}
                  {selectedYmSts.map((ymSt, index) => {
                    const selectedIndex = index;
                    const isMain = mainYmStIndex === selectedIndex;
                    
                    return (
                      <div
                        key={`selected-${index}`}
                        className={`p-4 border-2 rounded-lg ${
                          isMain 
                            ? 'border-green-500 bg-green-50 ring-2 ring-green-300' 
                            : ymSt.source === 'manual-added' 
                              ? 'border-blue-200 bg-blue-50'
                              : 'border-purple-200 bg-purple-50'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <div className="flex items-center">
                              <input
                                type="radio"
                                name="mainYmSt"
                                id={`main-ymst-${index}`}
                                checked={isMain}
                                onChange={() => setMainYmStIndex(selectedIndex)}
                                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500"
                              />
                              <label htmlFor={`main-ymst-${index}`} className="font-semibold text-gray-800 text-sm">
                                {isMain && (
                                  <span className="text-blue-700 font-bold mr-1">Ana YM ST - </span>
                                )}
                                {ymSt.stok_kodu || ''}
                              </label>
                            </div>
                            <p className="text-xs text-gray-600 mt-1 line-clamp-2 ml-6">{ymSt.stok_adi || ''}</p>
                          </div>
                          <button
                            onClick={() => {
                              // If removing the main YMST, set a new main YMST
                              if (isMain) {
                                // Find new main index - prefer to keep among selected YMSTs
                                const newMainIndex = selectedYmSts.length > 1 
                                  ? (index === selectedYmSts.length - 1 ? index - 1 : index + 1) 
                                  : (autoGeneratedYmSts.length > 0 ? selectedYmSts.length : 0);
                                setMainYmStIndex(newMainIndex);
                              } else if (index < mainYmStIndex) {
                                // If removing an YMST with index less than main, adjust main index
                                setMainYmStIndex(mainYmStIndex - 1);
                              }
                              removeSelectedYmSt(index);
                            }}
                            className="ml-3 text-red-500 hover:text-red-700 transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className={`inline-block px-3 py-1 text-xs rounded-full ${
                            isMain 
                              ? 'bg-green-200 text-green-800' 
                              : ymSt.source === 'manual-added' 
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-purple-100 text-purple-800'
                          }`}>
                            {ymSt.source === 'manual-added' ? 'Elle Eklendi' : 'Veritabani'}
                            {isMain && ' (Ana)'}
                          </span>
                          <span className="text-sm font-medium text-gray-700">
                            {parseFloat(ymSt.cap || 0)} mm
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Otomatik olusturulan YM ST'ler */}
                  {autoGeneratedYmSts.map((ymSt, index) => {
                    const autoIndex = selectedYmSts.length + index;
                    const isMain = mainYmStIndex === autoIndex;
                    
                    return (
                      <div
                        key={`auto-${index}`}
                        className={`p-4 border-2 rounded-lg ${
                          isMain ? 'border-green-500 bg-green-50 ring-2 ring-green-300' : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <div className="flex items-center">
                              <input
                                type="radio"
                                name="mainYmSt"
                                id={`main-ymst-auto-${index}`}
                                checked={isMain}
                                onChange={() => setMainYmStIndex(autoIndex)}
                                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500"
                              />
                              <label htmlFor={`main-ymst-auto-${index}`} className="font-semibold text-gray-800 text-sm">
                                {isMain && (
                                  <span className="text-blue-700 font-bold mr-1">Ana YM ST - </span>
                                )}
                                {ymSt.stok_kodu || ''}
                              </label>
                            </div>
                            <p className="text-xs text-gray-600 mt-1 line-clamp-2 ml-6">{ymSt.stok_adi || ''}</p>
                          </div>
                          <button
                            onClick={() => {
                              // If removing the main YMST, set a new main YMST
                              if (isMain) {
                                // Find new main index - prefer to keep among auto YMSTs or selected YMSTs
                                const newMainIndex = autoGeneratedYmSts.length > 1 
                                  ? (index === autoGeneratedYmSts.length - 1 
                                    ? selectedYmSts.length + index - 1 
                                    : selectedYmSts.length + index + 1) 
                                  : (selectedYmSts.length > 0 ? 0 : 0);
                                setMainYmStIndex(newMainIndex);
                              } else if (autoIndex < mainYmStIndex) {
                                // If removing an YMST with index less than main, adjust main index
                                setMainYmStIndex(mainYmStIndex - 1);
                              }
                              removeAutoGeneratedYmSt(index);
                            }}
                            className="ml-3 text-red-500 hover:text-red-700 transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className={`inline-block px-3 py-1 text-xs rounded-full ${
                            isMain ? 'bg-green-200 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            Otomatik Olusturuldu
                            {isMain && ' (Ana)'}
                          </span>
                          <span className="text-sm font-medium text-gray-700">
                            {parseFloat(ymSt.cap || 0)} mm
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Recete Bolumu - Kategorize Goruntuleme */}
          {(selectedYmSts.length > 0 || autoGeneratedYmSts.length > 0) && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <span className="text-purple-600 font-bold">R</span>
                  </div>
                  Recete Degerleri
                </h2>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      // Fill empty fields with auto-fill indicators
                      fillEmptyFieldsWithAutoFill();
                    }}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors shadow-lg flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7l4-4 4 4m0 6l-4 4-4-4" />
                    </svg>
                    Otomatik Doldur
                  </button>
                </div>
              </div>

              {/* YM ST Sekmeleri */}
              <div className="flex flex-wrap gap-2 mb-6 border-b">
                {[...selectedYmSts, ...autoGeneratedYmSts].map((ymSt, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveRecipeTab(index)}
                    className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
                      activeRecipeTab === index
                        ? 'bg-purple-100 text-purple-700 border-b-2 border-purple-600'
                        : 'text-gray-600 hover:text-purple-600 hover:bg-purple-50'
                    }`}
                  >
                    YM ST #{index + 1}
                    <span className="text-xs block">
                      {parseFloat(ymSt.cap || 0)} mm
                    </span>
                  </button>
                ))}
              </div>

              {/* Recete Iceriklerini Kategorize Goster */}
              {activeRecipeTab !== null && (
                <div className="space-y-6">
                  {/* MM GT Recete */}
                  <div className="p-6 bg-red-50 rounded-lg">
                    <h3 className="text-lg font-medium mb-4 text-red-700">
                      MM GT #{activeRecipeTab + 1} Recetesi
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* 8 alan icin ozel duzenleme - Shrink alani dropdown ile */}
                      {[
                        { key: `YM.GT.${mmGtData.kod_2}.${Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0')}.${activeRecipeTab.toString().padStart(2, '0')}`, type: 'readonly' }, // YM GT bileseni - sequence eslestirme
                        { key: 'GTPKT01', type: 'input' },
                        { key: 'AMB.CEM.KARTON.GAL', type: 'input' },
                        { key: 'SM.7MMHALKA', type: 'input' },
                        { key: 'AMB.TOKA.SIGNODE.114P. DKP', type: 'input' },
                        { key: 'shrink', type: 'dropdown' }, // Ozel shrink dropdown
                        { key: 'AMB.APEX CEMBER 38X080', type: 'input' },
                        { key: 'SM.DESI.PAK', type: 'input' }
                      ].map(({ key, type }, idx) => {
                        const allYmSts = [...selectedYmSts, ...autoGeneratedYmSts];
                        let currentValue = '';
                        
                        if (type === 'readonly') {
                          currentValue = key;
                        } else if (key === 'shrink') {
                          // Mevcut shrink tipini bul
                          const shrinkKeys = ['AMB.SHRINK.200*140CM', 'AMB.SHRINK.200*160CM', 'AMB.SHRINK.200*190CM'];
                          const currentShrinkKey = shrinkKeys.find(sk => allRecipes.mmGtRecipes[activeRecipeTab]?.[sk] > 0);
                          currentValue = currentShrinkKey || '';
                        } else {
                          currentValue = allRecipes.mmGtRecipes[activeRecipeTab]?.[key] || '';
                        }
                        
                        const friendlyName = type === 'readonly' ? 'YM GT Bileseni' : friendlyNames[key] || key;
                        const statusText = type === 'readonly' ? 'Otomatik olusturuldu' : getRecipeStatusText('mmgt', activeRecipeTab, key);
                        // Force 'readonly' type to use KG as the unit
                        
                        return (
                          <div key={key} className="space-y-2">
                            {type !== 'dropdown' && (
                              <label className="block text-sm font-medium text-gray-700">
                                {friendlyName}
                                <span className="text-xs text-gray-500 ml-2">
                                  ({getOlcuBr(key)})
                                </span>
                              </label>
                            )}
                            {type === 'readonly' ? (
                              <input
                                type="text"
                                value={currentValue}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 focus:outline-none cursor-not-allowed"
                                readOnly
                              />
                            ) : type === 'dropdown' ? (
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <label className="block text-sm font-medium text-gray-700">
                                    Shrink Tipi
                                  </label>
                                  <select
                                    value={activeTabDropdownValues.shrinkType}
                                    onChange={(e) => handleShrinkChange(activeRecipeTab, e.target.value)}
                                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 ${
                                      currentValue && recipeStatus.mmGtRecipes[activeRecipeTab]?.[currentValue] === 'database' ? 'bg-gray-100 cursor-not-allowed' : ''
                                    }`}
                                    disabled={currentValue && recipeStatus.mmGtRecipes[activeRecipeTab]?.[currentValue] === 'database'}
                                  >
                                    <option value="">Shrink Tipi Secin</option>
                                    <option value="AMB.SHRINK.200*140CM">AMB.SHRINK.200*140CM</option>
                                    <option value="AMB.SHRINK.200*160CM">AMB.SHRINK.200*160CM</option>
                                    <option value="AMB.SHRINK.200*190CM">AMB.SHRINK.200*190CM</option>
                                  </select>
                                </div>
                                <div className="space-y-2">
                                  <label className="block text-sm font-medium text-gray-700">
                                    Shrink Tuketimi (KG)
                                  </label>
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={currentValue ? normalizeDecimalDisplay(allRecipes.mmGtRecipes[activeRecipeTab]?.[currentValue] || 0) : ''}
                                    onChange={(e) => currentValue && updateRecipeValue('mmgt', activeRecipeTab, currentValue, e.target.value)}
                                    placeholder="Shrink Miktari"
                                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 ${
                                      currentValue && recipeStatus.mmGtRecipes[activeRecipeTab]?.[currentValue] === 'database' ? 'bg-gray-100 cursor-not-allowed' : ''
                                    }`}
                                    disabled={!currentValue || (currentValue && recipeStatus.mmGtRecipes[activeRecipeTab]?.[currentValue] === 'database')}
                                    onKeyDown={(e) => currentValue && handleRecipeCommaToPoint(e, 'mmgt', activeRecipeTab, currentValue)}
                                  />
                                </div>
                              </div>
                            ) : (
                              <input
                                type="text"
                                inputMode="decimal"
                                value={normalizeDecimalDisplay(currentValue || '')}
                                onChange={(e) => updateRecipeValue('mmgt', activeRecipeTab, key, e.target.value)}
                                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 ${
                                  recipeStatus.mmGtRecipes[activeRecipeTab]?.[key] === 'database' ? 'bg-gray-100 cursor-not-allowed' : ''
                                }`}
                                onKeyDown={(e) => handleRecipeCommaToPoint(e, 'mmgt', activeRecipeTab, key)}
                                disabled={recipeStatus.mmGtRecipes[activeRecipeTab]?.[key] === 'database'}
                              />
                            )}
                            <div className="h-4">
                              {statusText && (
                                <p className="text-xs text-gray-500 italic">{statusText}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* YM GT Recete */}
                  <div className="p-6 bg-yellow-50 rounded-lg">
                    <h3 className="text-lg font-medium mb-4 text-yellow-700">
                      YM GT Recetesi
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      YM ST baglantisi otomatik olarak yapilir. Sadece asagidaki 3 degeri duzenleyebilirsiniz:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* 3 alan icin ozel duzenleme - YM ST bileseni readonly */}
                      {[
                        { key: [...selectedYmSts, ...autoGeneratedYmSts][activeRecipeTab]?.stok_kodu || 'YM.ST.PLACEHOLDER', type: 'readonly' }, // YM ST bileseni otomatik
                        { key: 'GLV01', type: 'input' },
                        { key: '150 03', type: 'input' },
                        { key: 'SM.HIDROLIK.ASIT', type: 'input' }
                      ].map(({ key, type }, idx) => {
                        if (idx === 0) {
                          // Ilk alan YM ST bileseni - sadece gosterim icin
                          return (
                            <div key={key} className="space-y-2">
                              <label className="block text-sm font-medium text-gray-700">
                                YM ST Bileseni (Otomatik)
                              </label>
                              <input
                                type="text"
                                value={key || ''}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 focus:outline-none cursor-not-allowed"
                                readOnly
                              />
                              <p className="text-xs text-gray-500 italic">
                                Otomatik belirlendi
                              </p>
                            </div>
                          );
                        }
                        
                        const friendlyName = friendlyNames[key] || key;
                        // YM GT recipe is shared across all YM STs since it's the final product recipe
                        const isMainYmSt = activeRecipeTab === mainYmStIndex;
                        const currentValue = allRecipes.ymGtRecipe?.[key] || '';
                        const statusText = getRecipeStatusText('ymgt', null, key);
                        
                        return (
                          <div key={key} className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              {friendlyName}
                              <span className="text-xs text-gray-500 ml-2">
                                ({getOlcuBr(key)})
                              </span>
                            </label>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={normalizeDecimalDisplay(currentValue || '')}
                              onChange={(e) => updateRecipeValue('ymgt', null, key, e.target.value)}
                              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 ${
                                recipeStatus.ymGtRecipe?.[key] === 'database' ? 'bg-gray-100 cursor-not-allowed' : ''
                              }`}
                              onKeyDown={(e) => handleRecipeCommaToPoint(e, 'ymgt', null, key)}
                              disabled={recipeStatus.ymGtRecipe?.[key] === 'database'}
                              placeholder={!isMainYmSt ? 'Bos - Otomatik Doldur ile doldurabilirsiniz' : ''}
                            />
                            <div className="h-4">
                              {statusText && (
                                <p className="text-xs text-gray-500 italic">{statusText}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* YM ST Recete */}
                  <div className="p-6 bg-green-50 rounded-lg">
                    <h3 className="text-lg font-medium mb-4 text-green-700">
                      YM ST #{activeRecipeTab + 1} Recetesi
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      FLM baglantisi otomatik olarak olusturulan versiyonu duzenleyebilirsiniz:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* FLM ve TLC01 alanlari */}
                      {[
                        { key: 'filmasin_kodu', type: 'input' }, // Filmasin tipi duzenlenebilir
                        { key: 'TLC01', type: 'input' }
                      ].map(({ key, type }, idx) => {
                        if (idx === 0) {
                          // Ilk alan Filmasin tipi - duzenlenebilir
                          const filmasinCode = activeTabDropdownValues.filmasinCode;
                          const statusText = getRecipeStatusText('ymst', activeRecipeTab, 'filmasin_kodu');
                          
                          return (
                            <div key={key} className="space-y-2">
                              <label className="block text-sm font-medium text-gray-700">
                                Filmasin Capi
                              </label>
                              <div className="flex gap-2">
                                <div className="w-1/2">
                                  <label className="block text-xs font-medium text-gray-600 mb-1">
                                    Filmasin Capi
                                  </label>
                                  <select
                                    className={`w-full p-2 border border-gray-300 rounded-md ${
                                      recipeStatus.ymStRecipes[activeRecipeTab]?.[filmasinCode] === 'database' ? 'bg-gray-100 cursor-not-allowed' : ''
                                    }`}
                                    value={activeTabDropdownValues.filmasinCode.substring(4, 8)}
                                    disabled={recipeStatus.ymStRecipes[activeRecipeTab]?.[filmasinCode] === 'database'}
                                    onChange={(e) => {
                                      // Get the diameter part
                                      const newDiameter = e.target.value;
                                      // Get the quality part from existing code
                                      const quality = filmasinCode.substring(9);
                                      
                                      // Construct new filmasin code
                                      const newFilmasinCode = `FLM.${newDiameter}.${quality}`;
                                      
                                      // Get the active YM ST and its current filmasin code
                                      const activeYmSt = [...selectedYmSts, ...autoGeneratedYmSts][activeRecipeTab];
                                      const oldKey = getFilmasinKodu(activeYmSt);
                                      const oldValue = allRecipes.ymStRecipes[activeRecipeTab]?.[oldKey] || 1;
                                      
                                      // Update the YM ST object itself with new values
                                      activeYmSt.filmasin = parseInt(newDiameter);
                                      activeYmSt.quality = quality;
                                      
                                      // Update recipes with new key
                                      const updatedRecipes = { ...allRecipes };
                                      delete updatedRecipes.ymStRecipes[activeRecipeTab][oldKey];
                                      updatedRecipes.ymStRecipes[activeRecipeTab][newFilmasinCode] = oldValue;
                                      setAllRecipes(updatedRecipes);
                                      
                                      // Update dropdown state to reflect the change
                                      setActiveTabDropdownValues(prev => ({
                                        ...prev,
                                        filmasinCode: newFilmasinCode
                                      }));
                                      
                                      // Update recipe status
                                      const updatedStatus = { ...recipeStatus };
                                      updatedStatus.ymStRecipes[activeRecipeTab][newFilmasinCode] = 'manual';
                                      setRecipeStatus(updatedStatus);
                                      
                                      // Force re-render
                                      setSelectedYmSts([...selectedYmSts]);
                                      setAutoGeneratedYmSts([...autoGeneratedYmSts]);
                                    }}
                                  >
                                    <option value="0550">5.50 mm</option>
                                    <option value="0600">6.00 mm</option>
                                    <option value="0700">7.00 mm</option>
                                    <option value="0800">8.00 mm</option>
                                    <option value="0900">9.00 mm</option>
                                    <option value="1000">10.00 mm</option>
                                  </select>
                                </div>
                                
                                <div className="w-1/2">
                                  <label className="block text-xs font-medium text-gray-600 mb-1">
                                    Filmasin Kalitesi
                                  </label>
                                  <select
                                    className={`w-full p-2 border border-gray-300 rounded-md ${
                                      recipeStatus.ymStRecipes[activeRecipeTab]?.[filmasinCode] === 'database' ? 'bg-gray-100 cursor-not-allowed' : ''
                                    }`}
                                    value={activeTabDropdownValues.filmasinCode.substring(9)}
                                    disabled={recipeStatus.ymStRecipes[activeRecipeTab]?.[filmasinCode] === 'database'}
                                    onChange={(e) => {
                                      // Get the quality part
                                      const newQuality = e.target.value;
                                      // Get the diameter part from existing code
                                      const diameter = filmasinCode.substring(4, 8);
                                      
                                      // Construct new filmasin code
                                      const newFilmasinCode = `FLM.${diameter}.${newQuality}`;
                                      
                                      // Get the active YM ST and its current filmasin code
                                      const activeYmSt = [...selectedYmSts, ...autoGeneratedYmSts][activeRecipeTab];
                                      const oldKey = getFilmasinKodu(activeYmSt);
                                      const oldValue = allRecipes.ymStRecipes[activeRecipeTab]?.[oldKey] || 1;
                                      
                                      // Update the YM ST object itself with new values
                                      activeYmSt.filmasin = parseInt(diameter);
                                      activeYmSt.quality = newQuality;
                                      
                                      // Update recipes with new key
                                      const updatedRecipes = { ...allRecipes };
                                      delete updatedRecipes.ymStRecipes[activeRecipeTab][oldKey];
                                      updatedRecipes.ymStRecipes[activeRecipeTab][newFilmasinCode] = oldValue;
                                      setAllRecipes(updatedRecipes);
                                      
                                      // Update dropdown state to reflect the change
                                      setActiveTabDropdownValues(prev => ({
                                        ...prev,
                                        filmasinCode: newFilmasinCode
                                      }));
                                      
                                      // Update recipe status
                                      const updatedStatus = { ...recipeStatus };
                                      updatedStatus.ymStRecipes[activeRecipeTab][newFilmasinCode] = 'manual';
                                      setRecipeStatus(updatedStatus);
                                      
                                      // Force re-render
                                      setSelectedYmSts([...selectedYmSts]);
                                      setAutoGeneratedYmSts([...autoGeneratedYmSts]);
                                    }}
                                  >
                                    <option value="1005">1005</option>
                                    <option value="1006">1006</option>
                                    <option value="1008">1008</option>
                                    <option value="1010">1010</option>
                                  </select>
                                </div>
                              </div>
                              {statusText && (
                                <p className="text-xs text-gray-500 italic">{statusText}</p>
                              )}
                            </div>
                          );
                        }
                        
                        const friendlyName = friendlyNames[key] || key;
                        const currentValue = allRecipes.ymStRecipes[activeRecipeTab]?.[key] || '';
                        const statusText = getRecipeStatusText('ymst', activeRecipeTab, key);
                        
                        return (
                          <div key={key} className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              {friendlyName}
                              <span className="text-xs text-gray-500 ml-2">
                                ({getOlcuBr(key)})
                              </span>
                            </label>
                            <div className="mt-8">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={normalizeDecimalDisplay(currentValue || '')}
                                onChange={(e) => updateRecipeValue('ymst', activeRecipeTab, key, e.target.value)}
                                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
                                  recipeStatus.ymStRecipes[activeRecipeTab]?.[key] === 'database' ? 'bg-gray-100 cursor-not-allowed' : ''
                                }`}
                                onKeyDown={(e) => handleRecipeCommaToPoint(e, 'ymst', activeRecipeTab, key)}
                                disabled={recipeStatus.ymStRecipes[activeRecipeTab]?.[key] === 'database'}
                              />
                            </div>
                            <div className="h-4">
                              {statusText && (
                                <p className="text-xs text-gray-500 italic">{statusText}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Islem Butonlari */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex flex-wrap gap-4 justify-center">
              <button
                onClick={() => {
                  setCurrentStep('input');
                  // Reset all states when going back to input
                  setSavedToDatabase(false);
                  setDatabaseIds({ mmGtIds: [], ymGtId: null, ymStIds: [] });
                  setSessionSavedProducts({ mmGtIds: [], ymGtId: null, ymStIds: [] });
                  setSelectedYmSts([]);
                  setAutoGeneratedYmSts([]);
                  setIsLoading(false);
                  setIsViewingExistingProduct(false); // Reset viewing flag
                  setProcessSequence('00'); // Reset sequence when starting fresh
                  // Also clear sessionStorage
                  sessionStorage.removeItem('lastProcessSequence');
                }}
                className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors shadow-lg flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Geri
              </button>
              
              <button
                onClick={async () => {
                  try {
                    setIsLoading(true);
                    
                    if (isViewingExistingProduct) {
                      // Only generate Excel files when viewing existing product
                      toast.info("Excel dosyalari olusturuluyor...");
                      await generateExcelFiles();
                      toast.success("Excel dosyalari basariyla olusturuldu!");
                    } else {
                      // Normal flow for new products
                      
                      // First save to database if not already saved
                      if (!savedToDatabase) {
                        const saveResult = await checkForDuplicatesAndConfirm();
                        if (!saveResult) {
                          // Either duplicates found or error occurred
                          setIsLoading(false);
                          return;
                        }
                      } else {
                      }
                      
                      // Show notification that we're generating Excel files
                      toast.info("Excel dosyalari olusturuluyor...");
                      
                      // Then generate Excel files
                      await generateExcelFiles();
                      
                      // Success notification
                      toast.success("Islem basariyla tamamlandi!");
                    }
                  } catch (error) {
                    console.error("Error during operation:", error);
                    setError(`Islem hatasi: ${error.message}`);
                    toast.error(`Islem hatasi: ${error.message}`);
                    
                    // Reset loading state to allow user to try again
                    setIsLoading(false);
                  } finally {
                    setIsLoading(false);
                  }
                }}
                disabled={isLoading}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-lg flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Islem Yapiliyor...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    {isViewingExistingProduct ? 'Excel Olustur' : 'Veritabanina Kaydet ve Excel Olustur'}
                  </>
                )}
              </button>
              
              {/* Sadece Kaydet button - show for new products or when editing requests */}
              {((!isViewingExistingProduct && !savedToDatabase) || isEditingRequest) && (
                <button
                  onClick={async () => {
                    try {
                      setIsLoading(true);
                      
                      // Save to database without generating Excel
                      const saveResult = await checkForDuplicatesAndConfirm();
                      if (saveResult) {
                        toast.success("Veriler basariyla veritabanina kaydedildi!");
                      } else {
                      }
                    } catch (error) {
                      console.error("Error during save operation:", error);
                      setError(`Kaydetme hatasi: ${error.message}`);
                      toast.error(`Kaydetme hatasi: ${error.message}`);
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  disabled={isLoading}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 shadow-lg flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Kaydediliyor...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Sadece Kaydet
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal for User Input Values */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Hesaplama Degerleri
                </h2>
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-6">
                <p className="text-sm text-gray-600 mb-4">
                  Bu degerler hesaplamalarda kullanilacak olan sabit degerlerdir. Degisiklik yaptiktan sonra "Kaydet" dugmesine basarak kaydedin.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Ash (Kul) (Kg/tonne)
                    </label>
                    <input
                      type="text"
                      value={userInputValues.ash}
                      onChange={(e) => setUserInputValues(prev => ({ 
                        ...prev, 
                        ash: e.target.value.replace(/,/g, '.') // Replace commas with points
                      }))}
                      onBlur={(e) => setUserInputValues(prev => ({
                        ...prev,
                        ash: parseFloat(e.target.value.replace(/,/g, '.')) || prev.ash // Convert to number on blur
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Lapa (Kg/tonne)
                    </label>
                    <input
                      type="text"
                      value={userInputValues.lapa}
                      onChange={(e) => setUserInputValues(prev => ({ 
                        ...prev, 
                        lapa: e.target.value.replace(/,/g, '.') 
                      }))}
                      onBlur={(e) => setUserInputValues(prev => ({
                        ...prev,
                        lapa: parseFloat(e.target.value.replace(/,/g, '.')) || prev.lapa
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Uretim Kapasitesi (Aylik)
                    </label>
                    <input
                      type="text"
                      value={userInputValues.uretim_kapasitesi_aylik}
                      onChange={(e) => setUserInputValues(prev => ({ 
                        ...prev, 
                        uretim_kapasitesi_aylik: e.target.value.replace(/,/g, '.') 
                      }))}
                      onBlur={(e) => setUserInputValues(prev => ({
                        ...prev,
                        uretim_kapasitesi_aylik: parseFloat(e.target.value.replace(/,/g, '.')) || prev.uretim_kapasitesi_aylik
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Toplam Tuketilen Asit
                    </label>
                    <input
                      type="text"
                      value={userInputValues.toplam_tuketilen_asit}
                      onChange={(e) => setUserInputValues(prev => ({ 
                        ...prev, 
                        toplam_tuketilen_asit: e.target.value.replace(/,/g, '.') 
                      }))}
                      onBlur={(e) => setUserInputValues(prev => ({
                        ...prev,
                        toplam_tuketilen_asit: parseFloat(e.target.value.replace(/,/g, '.')) || prev.toplam_tuketilen_asit
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Ortalama Uretim Capi
                    </label>
                    <input
                      type="text"
                      value={userInputValues.ortalama_uretim_capi}
                      onChange={(e) => setUserInputValues(prev => ({ 
                        ...prev, 
                        ortalama_uretim_capi: e.target.value.replace(/,/g, '.') 
                      }))}
                      onBlur={(e) => setUserInputValues(prev => ({
                        ...prev,
                        ortalama_uretim_capi: parseFloat(e.target.value.replace(/,/g, '.')) || prev.ortalama_uretim_capi
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Paketleme Dk. Adet
                    </label>
                    <input
                      type="text"
                      value={userInputValues.paketlemeDkAdet}
                      onChange={(e) => setUserInputValues(prev => ({ 
                        ...prev, 
                        paketlemeDkAdet: e.target.value.replace(/,/g, '.') 
                      }))}
                      onBlur={(e) => setUserInputValues(prev => ({
                        ...prev,
                        paketlemeDkAdet: parseFloat(e.target.value.replace(/,/g, '.')) || prev.paketlemeDkAdet
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowSettingsModal(false)}
                    className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    Iptal
                  </button>
                  <button
                    onClick={saveUserInputValues}
                    className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Kaydet
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* YM ST Ekleme Modali */}
      {showAddYmStModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">YM ST Ekle</h2>
                <button
                  onClick={() => setShowAddYmStModal(false)}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cap (mm)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={normalizeDecimalDisplay(newYmStData.cap)}
                    onChange={(e) => setNewYmStData(prev => ({ ...prev, cap: normalizeInputValue(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00000"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Filmasin
                  </label>
                  <select
                    value={newYmStData.filmasin}
                    onChange={(e) => setNewYmStData(prev => ({ ...prev, filmasin: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Secin</option>
                    <option value="0550">0550</option>
                    <option value="0600">0600</option>
                    <option value="0700">0700</option>
                    <option value="0800">0800</option>
                    <option value="0900">0900</option>
                    <option value="1000">1000</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kalite
                  </label>
                  <select
                    value={newYmStData.quality}
                    onChange={(e) => setNewYmStData(prev => ({ ...prev, quality: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Secin</option>
                    <option value="1006">1006</option>
                    <option value="1008">1008</option>
                    <option value="1010">1010</option>
                  </select>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddYmStModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Iptal
                </button>
                <button
                  onClick={handleAddYmSt}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Ekle
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Talepler Modali */}
      {showRequestsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[80vh] overflow-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  Galvanizli Tel Talepleri
                </h2>
                <div className="flex gap-3">
                  {/* Excel Export Buttons */}
                  <button
                    onClick={exportAllApprovedToExcel}
                    disabled={isExportingExcel || requests.filter(req => req.status?.toString().toLowerCase().trim() === 'approved').length === 0}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Tum onaylanmis talepleri Excel'e aktar"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {isExportingExcel ? 'Isleniyor...' : 'Tum Onaylanmislar Excel'}
                  </button>
                  
                  <button
                    onClick={exportSelectedToExcel}
                    disabled={isExportingExcel || selectedRequestIds.length === 0}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={`${selectedRequestIds.length} secili onaylanmis talebi Excel'e aktar`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {isExportingExcel ? 'Isleniyor...' : `Secili Onaylanmislar Excel (${selectedRequestIds.length})`}
                  </button>
                  
                  <button
                    onClick={fetchRequests}
                    disabled={isLoading}
                    className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors shadow-sm flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Yenile
                  </button>
                  <button
                    onClick={() => setShowRequestsModal(false)}
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* Filtering and Search */}
              <div className="mb-6 flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <label htmlFor="searchQuery" className="block text-sm font-medium text-gray-700 mb-1">Ara</label>
                  <div className="relative">
                    <input
                      type="text"
                      id="searchQuery"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cap, kaplama, aciklama vb."
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 pl-3 pr-10 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700 mb-1">Durum Filtresi</label>
                  <select
                    id="statusFilter"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">Tum Durumlar</option>
                    <option value="pending">Beklemede</option>
                    <option value="approved">Onaylandi</option>
                    <option value="rejected">Reddedildi</option>
                    <option value="in_progress">Isleniyor</option>
                    <option value="completed">Tamamlandi</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="sortField" className="block text-sm font-medium text-gray-700 mb-1">Siralama</label>
                  <div className="flex space-x-2">
                    <select
                      id="sortField"
                      value={sortField}
                      onChange={(e) => setSortField(e.target.value)}
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="created_at">Olusturma Tarihi</option>
                      <option value="status">Durum</option>
                      <option value="cap">Cap</option>
                      <option value="kod_2">Kaplama Turu</option>
                      <option value="kaplama">Kaplama Miktari</option>
                      <option value="kg">Agirlik</option>
                      <option value="cast_kont">Bag Miktari</option>
                      <option value="unwinding">Unwinding</option>
                    </select>
                    <button
                      onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                      className="p-2 bg-gray-100 rounded-md hover:bg-gray-200"
                      title={sortDirection === 'asc' ? 'Artan' : 'Azalan'}
                    >
                      {sortDirection === 'asc' ? (
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
              
              {isLoading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="text-gray-500 flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Yukleniyor...
                  </div>
                </div>
              ) : getFilteredAndSortedRequests().length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p className="text-gray-500 text-lg">Talep bulunamadi.</p>
                  {(statusFilter !== 'all' || searchQuery.trim() !== '') && (
                    <button 
                      onClick={() => {
                        setStatusFilter('all');
                        setSearchQuery('');
                      }}
                      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Filtreleri Temizle
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  {/* Display for filtered results info */}
                  {(statusFilter !== 'all' || searchQuery.trim() !== '') && (
                    <div className="mb-4 text-sm text-gray-500 flex items-center">
                      <svg className="w-4 h-4 mr-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>
                        {getFilteredAndSortedRequests().length} / {requests.length} talep gosteriliyor
                        {statusFilter !== 'all' && ` (${getStatusText(statusFilter)} durumunda)`}
                        {searchQuery.trim() !== '' && ` "${searchQuery}" arama sonuclari`}
                      </span>
                      <button 
                        onClick={() => {
                          setStatusFilter('all');
                          setSearchQuery('');
                        }}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                      >
                        Filtreleri Temizle
                      </button>
                    </div>
                  )}
                  
                  <table className="w-full divide-y divide-gray-200 table-fixed">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={
                                selectedRequestIds.length > 0 && 
                                selectedRequestIds.length === getFilteredAndSortedRequests().filter(req => req.status?.toString().toLowerCase().trim() === 'approved').length &&
                                getFilteredAndSortedRequests().filter(req => req.status?.toString().toLowerCase().trim() === 'approved').length > 0
                              }
                              onChange={handleSelectAllRequests}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              title="Tum onaylanmis talepleri sec/kaldir"
                            />
                          </div>
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                          Cap
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                          Tip
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                          Kaplama
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                          Mukavemet
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                          Agirlik
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                          Unwinding
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                          Durum
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                          Tarih
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                          Talep Eden
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                          Isleyen
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                          Islem
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {getFilteredAndSortedRequests().map((request) => (
                        <tr key={request.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-2 py-3 whitespace-nowrap">
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                checked={selectedRequestIds.includes(request.id)}
                                onChange={() => handleToggleRequestSelection(request.id)}
                                disabled={request.status !== 'approved'}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                title={request.status?.toString().toLowerCase().trim() === 'approved' ? 'Bu talebi sec/kaldir' : 'Sadece onaylanmis talepler secilebilir'}
                              />
                            </div>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-xs font-medium text-gray-900">
                            {request.cap || 0}mm
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-500">
                            <span className={`px-1 py-0.5 rounded text-xs font-medium ${
                              request.kod_2 === 'NIT' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                            }`}>
                              {request.kod_2 || ''}
                            </span>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-500">
                            {request.kaplama || '0'}g/m²
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-500">
                            {request.min_mukavemet || '0'}-{request.max_mukavemet || '0'}MPa
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-500">
                            {request.kg || '0'}kg
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-500">
                            {(request.unwinding || 'Anti-Clockwise').slice(0, 8)}...
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <span className={`px-1 py-0.5 text-xs font-medium rounded border ${getStatusBadgeColor(request.status)}`}>
                              {getStatusText(request.status).slice(0, 6)}
                            </span>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-500">
                            {formatDate(request.created_at)?.slice(0, 8)}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-500">
                            {getUsernameById(request.created_by)?.slice(0, 8)}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-500">
                            {getUsernameById(request.processed_by)?.slice(0, 8)}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-xs font-medium">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleSelectRequest(request)}
                                className="text-blue-600 hover:text-blue-900 transition-colors"
                                disabled={request.status === 'rejected'}
                                title={request.status === 'rejected' ? 'Reddedilmis talepler kullanilamaz' : 'Talebi goruntule'}
                              >
                                Sec
                              </button>
                              {request.status === 'pending' && (
                                <button
                                  onClick={() => {
                                    if (window.confirm('Bu talebi silmek istediginizden emin misiniz?')) {
                                      deleteRequest(request.id);
                                    }
                                  }}
                                  className="text-red-600 hover:text-red-900 transition-colors"
                                >
                                  Sil
                                </button>
                              )}
                              {request.status?.toString().toLowerCase().trim() === 'approved' && (
                                <button
                                  onClick={() => {
                                    if (window.confirm('Bu onaylanmis talebi silmek istediginizden emin misiniz?\n\nBu islem geri alinamaz.')) {
                                      deleteRequest(request.id);
                                    }
                                  }}
                                  className="text-red-600 hover:text-red-900 transition-colors"
                                  title="Onaylanmis talebi sil"
                                >
                                  Sil
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Talep Detay Modali */}
      {showRequestDetailModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Talep Detaylari
                </h2>
                <button
                  onClick={() => setShowRequestDetailModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
                <p className="text-blue-700 text-sm">
                  Bu talebi duzenleyebilir, onaylayabilir veya reddedebilirsiniz. Onayladiginizda talep "onaylandi" olarak isaretlenecek ve hesaplamalar icin kullanilacaktir.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Sol sutun */}
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Talep ID</p>
                    <p className="text-base text-gray-900">{selectedRequest.id}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Durum</p>
                    <p className="px-2 py-1 text-xs inline-flex items-center font-medium rounded-full border bg-yellow-100 text-yellow-800 border-yellow-200">
                      {selectedRequest.status === 'pending' ? 'Beklemede' : 
                       selectedRequest.status?.toString().toLowerCase().trim() === 'approved' ? 'Onaylandi' : 
                       selectedRequest.status === 'rejected' ? 'Reddedildi' : 
                       selectedRequest.status === 'in_progress' ? 'Isleniyor' : 
                       selectedRequest.status === 'completed' ? 'Tamamlandi' : 
                       selectedRequest.status}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Tel Capi</p>
                    <p className="text-base text-gray-900">{selectedRequest.cap} mm</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Kaplama</p>
                    <p className="text-base text-gray-900">{selectedRequest.kod_2} {selectedRequest.kaplama} g/m²</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Mukavemet</p>
                    <p className="text-base text-gray-900">{selectedRequest.min_mukavemet} - {selectedRequest.max_mukavemet} MPa</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Agirlik</p>
                    <p className="text-base text-gray-900">{selectedRequest.kg} kg</p>
                  </div>
                </div>
                
                {/* Sag sutun */}
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Ic Cap</p>
                    <p className="text-base text-gray-900">{selectedRequest.ic_cap} cm</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Dis Cap</p>
                    <p className="text-base text-gray-900">{selectedRequest.dis_cap} cm</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Tolerans</p>
                    <p className="text-base text-gray-900">+{selectedRequest.tolerans_plus} mm / -{selectedRequest.tolerans_minus} mm</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Shrink</p>
                    <p className="text-base text-gray-900">{selectedRequest.shrink || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Unwinding</p>
                    <p className="text-base text-gray-900">{selectedRequest.unwinding || 'Anti-Clockwise'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Bag Miktari</p>
                    <p className="text-base text-gray-900">{selectedRequest.cast_kont || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Helix Kontrol</p>
                    <p className="text-base text-gray-900">{selectedRequest.helix_kont || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Elongation</p>
                    <p className="text-base text-gray-900">{selectedRequest.elongation || '-'}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowRequestDetailModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Iptal
                </button>
                
                <div className="flex gap-3">
                  <button
                    onClick={handleEditRequest}
                    className="px-4 py-2 text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 flex items-center"
                  >
                    <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Duzenle
                  </button>
                  
                  <button
                    onClick={handleDetailApproveRequest}
                    disabled={isLoading}
                    className="px-4 py-2 text-green-700 bg-green-100 rounded-md hover:bg-green-200 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <svg className="animate-spin w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    Onayla
                  </button>
                  
                  <button
                    onClick={handleOpenRejectModal}
                    disabled={isLoading}
                    className="px-4 py-2 text-red-700 bg-red-100 rounded-md hover:bg-red-200 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Reddet
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Reddetme Nedeni Modali */}
      {showRejectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Talebi Reddetme Nedeni
                </h2>
                <button
                  onClick={() => setShowRejectionModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-6">
                <label htmlFor="rejectionReason" className="block text-sm font-medium text-gray-700 mb-1">
                  Ret Nedeni
                </label>
                <textarea
                  id="rejectionReason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
                  placeholder="Talebi neden reddettiginizi aciklayin..."
                />
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowRejectionModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Iptal
                </button>
                <button
                  onClick={handleDetailRejectConfirm}
                  disabled={isLoading || !rejectionReason.trim()}
                  className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isLoading ? (
                    <svg className="animate-spin w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  Talebi Reddet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Onay Talebi Modali */}
      {showApproveConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Talebi Onaylama
                </h2>
                <button
                  onClick={() => {
                    setShowApproveConfirmModal(false);
                    setIsInApprovalProcess(false); // Reset approval flag when cancelled
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-700">
                  Duzenlediginiz talebi onaylayip veri tabanina kaydetmek istiyor musunuz?
                  <br /><br />
                  Bu islem talebi "Onaylandi" olarak isaretleyecek ve veriler veri tabanina kaydedilecektir.
                </p>
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowApproveConfirmModal(false);
                    setIsInApprovalProcess(false); // Reset approval flag when cancelled
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Iptal
                </button>
                <button
                  onClick={() => {
                    // Simple approach - just call the function directly
                    // Hide the modal and then call the approval function
                    setShowApproveConfirmModal(false);
                    approveRequestAndContinue();
                  }}
                  disabled={isLoading}
                  className="px-4 py-2 text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isLoading ? (
                    <svg className="animate-spin w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  Onayla ve Kaydet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mevcut MM GT / YM ST Modali */}
      {showExistingMmGtModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[80vh] overflow-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                  </svg>
                  Veritabani
                </h2>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      fetchExistingMmGts();
                      fetchExistingYmSts();
                    }}
                    disabled={isLoading}
                    className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors shadow-sm flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Yenile
                  </button>
                  <button
                    onClick={() => setShowExistingMmGtModal(false)}
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* Tab'lar */}
              <div className="flex gap-4 mb-6 border-b">
                <button
                  onClick={() => setActiveDbTab('mmgt')}
                  className={`px-4 py-2 font-medium transition-colors ${
                    activeDbTab === 'mmgt'
                      ? 'text-purple-600 border-b-2 border-purple-600'
                      : 'text-gray-600 hover:text-purple-600'
                  }`}
                >
                  MM GT
                </button>
                <button
                  onClick={() => setActiveDbTab('ymst')}
                  className={`px-4 py-2 font-medium transition-colors ${
                    activeDbTab === 'ymst'
                      ? 'text-purple-600 border-b-2 border-purple-600'
                      : 'text-gray-600 hover:text-purple-600'
                  }`}
                >
                  YM ST
                </button>
              </div>
              
              {/* MM GT Tab Icerigi */}
              {activeDbTab === 'mmgt' && (
                <>
                  {existingMmGts.length === 0 ? (
                    <div className="text-center py-12">
                      <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <p className="text-gray-500 text-lg">Mevcut MM GT bulunamadi.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Stok Kodu
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Cap
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Kaplama Turu
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Kaplama
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Mukavemet
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Agirlik
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Islem
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {existingMmGts.map((mmGt) => (
                            <tr key={mmGt.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {mmGt.stok_kodu || ''}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {parseFloat(mmGt.cap || 0)} mm
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  mmGt.kod_2 === 'NIT' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                                }`}>
                                  {mmGt.kod_2 || ''}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {mmGt.kaplama || '0'} gr/m²
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {mmGt.min_mukavemet || '0'}-{mmGt.max_mukavemet || '0'} MPa
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {mmGt.kg || '0'} kg
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleSelectExistingMmGt(mmGt)}
                                    className="text-purple-600 hover:text-purple-900 transition-colors"
                                  >
                                    Sec
                                  </button>
                                  <button
                                    onClick={() => handleDeleteClick(mmGt, 'mmgt')}
                                    className="text-red-600 hover:text-red-900 transition-colors"
                                  >
                                    Sil
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
              
              {/* YM ST Tab Icerigi */}
              {activeDbTab === 'ymst' && (
                <>
                  {existingYmSts.length === 0 ? (
                    <div className="text-center py-12">
                      <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <p className="text-gray-500 text-lg">Mevcut YM ST bulunamadi.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Stok Kodu
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Cap
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Filmasin
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Kalite
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Islem
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {existingYmSts.map((ymSt) => (
                            <tr key={ymSt.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {ymSt.stok_kodu || ''}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {parseFloat(ymSt.cap || 0)} mm
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {ymSt.filmasin || ''}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {ymSt.quality || ''}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <button
                                  onClick={() => handleDeleteClick(ymSt, 'ymst')}
                                  className="text-red-600 hover:text-red-900 transition-colors"
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
                </>
              )}
              
              {/* Delete All Button - Only show for active tab with items */}
              {((activeDbTab === 'mmgt' && existingMmGts.length > 0) || 
                (activeDbTab === 'ymst' && existingYmSts.length > 0)) && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="flex justify-center">
                    <button
                      onClick={() => setShowDeleteAllConfirm(true)}
                      className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-lg flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Tumunu Sil
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Silme Onay Modali */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">Silme Onayi</h2>
                <button
                  onClick={() => handleDeleteCancel()}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <p className="text-gray-600 mb-6">
                {deleteType === 'mmgt' 
                  ? 'Bu MM GT\'yi ve tum bagli verilerini (YM GT\'ler, receteler vb.) silmek istediginizden emin misiniz?'
                  : 'Bu YM ST\'yi ve bagli recetelerini silmek istediginizden emin misiniz?'
                }
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => handleDeleteCancel()}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Iptal
                </button>
                <button
                  onClick={() => deleteType === 'mmgt' ? deleteMmGt(itemToDelete) : deleteYmSt(itemToDelete)}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Siliniyor...' : 'Sil'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tumunu Sil Onay Modali */}
      {showDeleteAllConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">Tumunu Sil Onayi</h2>
                <button
                  onClick={() => {
                    setShowDeleteAllConfirm(false);
                    setDeleteAllConfirmText('');
                  }}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <p className="text-gray-600 mb-4">
                {activeDbTab === 'mmgt' 
                  ? 'Tum MM GT ve iliskili YM GT verilerini ve bunlarin tum recetelerini silmek istediginizden emin misiniz? Bu islem geri alinamaz.'
                  : 'Tum YM ST verilerini ve recetelerini silmek istediginizden emin misiniz? Bu islem geri alinamaz.'}
              </p>
              
              <p className="text-red-600 font-medium mb-4">
                Onaylamak icin asagiya <span className="font-bold">"Hepsini Sil"</span> yazin:
              </p>
              
              <input
                type="text"
                value={deleteAllConfirmText}
                onChange={(e) => setDeleteAllConfirmText(e.target.value)}
                placeholder="Hepsini Sil"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 mb-6"
              />
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteAllConfirm(false);
                    setDeleteAllConfirmText('');
                    setIsLoading(false);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Iptal
                </button>
                <button
                  onClick={handleDeleteAll}
                  disabled={isLoading || deleteAllConfirmText !== 'Hepsini Sil'}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Siliniyor...' : 'Tumunu Sil'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Product Confirmation Modal */}
      {showDuplicateConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  Mevcut Urunler Tespit Edildi
                </h2>
                <button
                  onClick={() => {
                    setShowDuplicateConfirmModal(false);
                    setDuplicateProducts([]);
                    setPendingSaveData(null);
                    setIsLoading(false);
                  }}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <p className="text-gray-600 mb-4">
                Ayni teknik ozelliklere sahip {duplicateProducts.length} adet urun bulundu. Mevcut urunlerden birini kullanabilir veya yeni bir varyant olusturabilirsiniz:
              </p>
              
              <div className="max-h-60 overflow-y-auto mb-6">
                {duplicateProducts.map((product, index) => (
                  <div 
                    key={index} 
                    className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-3 cursor-pointer hover:bg-orange-100 transition-colors"
                    onClick={() => {
                      // User clicked on a specific product
                      setShowDuplicateConfirmModal(false);
                      handleSelectExistingMmGt(product);
                      setShowExistingMmGtModal(false);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <span className="inline-block bg-orange-100 text-orange-800 text-xs font-medium px-2 py-1 rounded-full">
                          {product.type}
                        </span>
                        <p className="font-medium text-gray-800 mt-1">
                          Stok Kodu: {product.stok_kodu}
                        </p>
                        <p className="text-sm text-gray-600">
                          Stok Adi: {product.stok_adi}
                        </p>
                      </div>
                      <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowDuplicateConfirmModal(false);
                    setDuplicateProducts([]);
                    setPendingSaveData(null);
                    setIsLoading(false);
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                >
                  Iptal
                </button>
                {duplicateProducts.some(p => p.type === 'YM ST') && (
                  <button
                    onClick={async () => {
                      if (pendingSaveData) {
                        setShowDuplicateConfirmModal(false);
                        
                        // Fetch existing YM STs from database for Excel generation
                        const existingYmStsForExcel = [];
                        for (const duplicate of duplicateProducts.filter(p => p.type === 'YM ST')) {
                          try {
                            const existingYmSt = await checkExistingProduct(API_URLS.galYmSt, duplicate.stok_kodu);
                            if (existingYmSt) {
                              existingYmStsForExcel.push({
                                ...existingYmSt,
                                source: 'database'
                              });
                            }
                          } catch (error) {
                            console.error('Error fetching existing YM ST:', error);
                          }
                        }
                        
                        // Keep non-duplicate YM STs and add existing ones for Excel
                        const ymStsForSave = pendingSaveData.allYmSts.filter(ymSt => 
                          ymSt.source === 'database' || 
                          !duplicateProducts.some(dup => dup.type === 'YM ST' && dup.stok_kodu === ymSt.stok_kodu)
                        );
                        
                        const ymStsForExcel = [
                          ...ymStsForSave,
                          ...existingYmStsForExcel
                        ];
                        
                        // Update the selected YM STs for Excel generation
                        const originalSelectedYmSts = [...selectedYmSts];
                        const originalAutoGeneratedYmSts = [...autoGeneratedYmSts];
                        
                        // Temporarily update YM STs for Excel generation
                        setSelectedYmSts(ymStsForExcel.filter(ym => ym.source === 'database'));
                        setAutoGeneratedYmSts(ymStsForExcel.filter(ym => ym.source !== 'database'));
                        
                        const result = await proceedWithSave(ymStsForSave, pendingSaveData.nextSequence);
                        if (result) {
                          try {
                            toast.info("Excel dosyalari olusturuluyor...");
                            await generateExcelFiles();
                            toast.success("Islem basariyla tamamlandi!");
                          } catch (error) {
                            console.error("Excel generation error:", error);
                            toast.error(`Excel olusturma hatasi: ${error.message}`);
                          }
                        }
                        
                        // Restore original YM ST states
                        setSelectedYmSts(originalSelectedYmSts);
                        setAutoGeneratedYmSts(originalAutoGeneratedYmSts);
                        
                        setDuplicateProducts([]);
                        setPendingSaveData(null);
                      }
                    }}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    YM ST Guncellemeden Devam Et
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* YM ST Database Selection Modal */}
      {showYmStSelectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[80vh] overflow-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                  </svg>
                  Kayitli YM ST'leri Sec
                </h2>
                <button
                  onClick={() => {
                    setShowYmStSelectionModal(false);
                    setSelectedYmStsForAdd([]);
                    setYmStSearchQuery('');
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Search Bar */}
              <div className="mb-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={ymStSearchQuery}
                    onChange={(e) => setYmStSearchQuery(e.target.value)}
                    placeholder="YM ST ara (Stok Kodu, Stok Adi, Cap)..."
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center mb-4">
                <div className="text-sm text-gray-500">
                  {selectedYmStsForAdd.length > 0 ? `${selectedYmStsForAdd.length} oge secili` : 'Hic oge secilmedi'}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedYmStsForAdd([])}
                    disabled={selectedYmStsForAdd.length === 0}
                    className="px-3 py-1 text-sm text-gray-600 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
                  >
                    Secimi Temizle
                  </button>
                  <button
                    onClick={async () => {
                      // Add selected YM STs to the main selection
                      const ymStsToAdd = selectedYmStsForAdd.filter(ymSt => 
                        !selectedYmSts.find(selected => selected.stok_kodu === ymSt.stok_kodu)
                      );
                      
                      // Add all YM STs first
                      const newYmSts = ymStsToAdd.map(ymSt => ({ ...ymSt, source: 'database' }));
                      setSelectedYmSts(prev => [...prev, ...newYmSts]);
                      
                      // Close modal and clear selection
                      setShowYmStSelectionModal(false);
                      setSelectedYmStsForAdd([]);
                      setYmStSearchQuery('');
                      
                      // Wait for state update then load recipe data
                      setTimeout(async () => {
                        if (newYmSts.length > 0) {
                          await loadExistingRecipeData(newYmSts);
                        }
                        toast.success(`${ymStsToAdd.length} YM ST eklendi ve recete verileri yuklendi`);
                      }, 100);
                    }}
                    disabled={selectedYmStsForAdd.length === 0}
                    className="px-4 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
                  >
                    Ekle ({selectedYmStsForAdd.length})
                  </button>
                </div>
              </div>

              {/* YM ST Table/Grid */}
              <div className="max-h-96 overflow-y-auto">
                {allYmStsForSelection.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-gray-500">YM ST verileri yukleniyor...</div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {allYmStsForSelection
                      .filter(ymSt => {
                        if (!ymStSearchQuery) return true;
                        const query = ymStSearchQuery.toLowerCase();
                        return (ymSt.stok_kodu || '').toLowerCase().includes(query) ||
                               (ymSt.stok_adi || '').toLowerCase().includes(query) ||
                               (ymSt.cap || '').toString().includes(query);
                      })
                      .map(ymSt => {
                        const isSelected = selectedYmStsForAdd.find(selected => selected.stok_kodu === ymSt.stok_kodu);
                        const isAlreadyInMain = selectedYmSts.find(selected => selected.stok_kodu === ymSt.stok_kodu);
                        
                        return (
                          <div
                            key={ymSt.id}
                            className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                              isAlreadyInMain
                                ? 'bg-green-50 border-green-300 opacity-50'
                                : isSelected
                                ? 'bg-purple-100 border-purple-500 shadow-lg'
                                : 'bg-gray-50 border-gray-200 hover:bg-purple-50 hover:border-purple-300'
                            }`}
                            onClick={() => {
                              if (isAlreadyInMain) return;
                              if (isSelected) {
                                setSelectedYmStsForAdd(prev => prev.filter(item => item.stok_kodu !== ymSt.stok_kodu));
                              } else {
                                setSelectedYmStsForAdd(prev => [...prev, ymSt]);
                              }
                            }}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1">
                                <p className="font-semibold text-gray-800 text-xs">{ymSt.stok_kodu || ''}</p>
                                <p className="text-xs text-gray-600 line-clamp-2">{ymSt.stok_adi || ''}</p>
                              </div>
                              <div className={`ml-2 ${isAlreadyInMain ? 'text-green-600' : isSelected ? 'text-purple-600' : 'text-gray-400'}`}>
                                {isAlreadyInMain ? (
                                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                ) : isSelected ? (
                                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                ) : (
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                  </svg>
                                )}
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-1 text-xs">
                              <div>
                                <span className="text-gray-500">Cap:</span>
                                <span className="ml-1 font-medium">{ymSt.cap || 'N/A'} mm</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Filmasin:</span>
                                <span className="ml-1 font-medium">{ymSt.filmasin || 'N/A'}</span>
                              </div>
                            </div>
                            
                            {isAlreadyInMain && (
                              <div className="mt-2 text-xs text-green-600 font-medium">
                                Zaten secili
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hata ve Basari Mesajlari */}
      {error && (
        <div className="mt-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 shadow-sm">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              {error.split('\n').map((line, i) => (
                <div key={i} className={line.startsWith('•') ? 'ml-2' : 'font-medium'}>{line}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Product Conflict Warning Modal */}
      {showProductConflictModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  Urun Cakismasi
                </h2>
                <button
                  onClick={() => {
                    setShowProductConflictModal(false);
                    setConflictProduct(null);
                    setConflictType('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-6">
                {conflictType === 'exact' ? (
                  <div className="text-center">
                    <div className="text-red-600 mb-4">
                      <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Ayni Urun Zaten Mevcut</h3>
                    <p className="text-gray-600 mb-4">
                      Bu urun zaten veritabaninda kayitli. Mevcut urunu kullanmak icin "Veritabani" secenegini kullanin.
                    </p>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-gray-700">Mevcut Urun:</p>
                      <p className="text-sm text-gray-600">{conflictProduct?.stok_kodu}</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="text-orange-500 mb-4">
                      <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Benzer Urun Mevcut</h3>
                    <p className="text-gray-600 mb-4">
                      Bu anahtar ozelliklere sahip bir urun zaten mevcut. Lutfen mevcut urunu secin veya ERP Yoneticisine danisin.
                    </p>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-gray-700">Mevcut Urun:</p>
                      <p className="text-sm text-gray-600">{conflictProduct?.stok_kodu}</p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowProductConflictModal(false);
                    setConflictProduct(null);
                    setConflictType('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Tamam
                </button>
                <button
                  onClick={() => {
                    setShowProductConflictModal(false);
                    setConflictProduct(null);
                    setConflictType('');
                    setShowExistingMmGtModal(true);
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Veritabani
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* YMST Already Exists Modal */}
      {showYmStExistsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Mevcut YM ST Urunleri Bulundu
                </h2>
                <button
                  onClick={() => {
                    setShowYmStExistsModal(false);
                    setExistingYmStsForModal([]);
                  }}
                  className="text-gray-400 hover:text-gray-600 text-xl font-bold"
                >
                  ×
                </button>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-700 mb-4">
                  <span className="font-semibold text-blue-600">{existingYmStsForModal.length} adet</span> otomatik olusturulacak YM ST urunu zaten veritabaninda mevcut:
                </p>
                
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
                  <div className="space-y-2">
                    {existingYmStsForModal.map((ym, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-medium text-blue-700">{ym.stok_kodu}</span>
                        <span className="text-gray-600">- {ym.stok_adi}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <p className="text-gray-600 text-sm">
                  Mevcut urunleri kullanmak, kayitli recete verilerini otomatik olarak yukler ve tutarliligi saglar.
                </p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handleGoToYmStSelection}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  Kayitlilardan Sec
                </button>
                <button
                  onClick={handleUseExistingYmSts}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Mevcut Urunleri Kullan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {successMessage && (
        <div className="mt-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 shadow-lg animate-pulse">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {successMessage}
          </div>
        </div>
      )}
    </div>
  );
};

export default GalvanizliTelNetsis;