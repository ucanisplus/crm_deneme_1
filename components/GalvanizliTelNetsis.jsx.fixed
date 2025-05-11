import React, { useState, useEffect, useContext, createContext, useCallback } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '@/context/AuthContext';
import { API_URLS, fetchWithAuth } from '@/api-config';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { toast } from 'react-toastify';

// Simplified validation schemas
const mmGtValidationSchema = Yup.object().shape({
  cap: Yup.number().required('Çap zorunludur').min(0.8).max(8.0),
  kod_2: Yup.string().required('Kaplama türü zorunludur'),
  kaplama: Yup.number().required('Kaplama zorunludur').min(50).max(400),
  min_mukavemet: Yup.number().required('Min mukavemet zorunludur').min(350).max(1000),
  max_mukavemet: Yup.number().required('Max mukavemet zorunludur').min(350).max(1000),
  tolerans_plus: Yup.number().required('Tolerans (+) zorunludur').min(0).max(0.1),
  tolerans_minus: Yup.number().required('Tolerans (-) zorunludur').min(0).max(0.1),
  kg: Yup.number().required('Ağırlık zorunludur').min(250).max(1250),
});

const receteValidationSchema = Yup.object().shape({
  boraks_tuketimi: Yup.number().required('Boraks tüketimi zorunludur').min(0.001),
  asit_tuketimi: Yup.number().required('Asit tüketimi zorunludur').min(0.001),
  desi_tuketimi: Yup.number().required('Desi tüketimi zorunludur').min(0.001),
  paketleme_suresi: Yup.number().required('Paketleme süresi zorunludur').min(0.001),
  galvanizleme_suresi: Yup.number().required('Galvanizleme süresi zorunludur').min(0.001),
  tel_cekme_suresi: Yup.number().required('Tel çekme süresi zorunludur').min(0.0001),
});

// Galvanizli Tel Context
const GalvanizliTelContext = createContext();

// Context Provider Bileşeni
export const GalvanizliTelProvider = ({ children }) => {
  // Core state variables
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
    ymStList: []
  });
  const { user } = useAuth();

  // Error handling function
  const handleApiError = (error, customMessage) => {
    console.error(customMessage, error);
    setError(
      error.response?.data?.error ||
      error.message ||
      customMessage ||
      'Bir hata oluştu'
    );
    setLoading(false);
  };

  // Fetch initial data
  const fetchInitialData = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const [mmGtResponse, ymGtResponse, ymStResponse] = await Promise.all([
        fetchWithAuth(API_URLS.GET_MM_GT_LIST),
        fetchWithAuth(API_URLS.GET_YM_GT_LIST),
        fetchWithAuth(API_URLS.GET_YM_ST_LIST)
      ]);
      
      setProductDatabase({
        mmGtList: mmGtResponse.data,
        ymGtList: ymGtResponse.data,
        ymStList: ymStResponse.data
      });
    } catch (error) {
      handleApiError(error, 'Ürün verileri yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  }, [user]);
  
  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // MM GT operations
  const saveMmGt = async (values) => {
    setLoading(true);
    setError(null);
    
    try {
      const endpoint = isEditMode ? API_URLS.UPDATE_MM_GT : API_URLS.CREATE_MM_GT;
      const method = isEditMode ? 'PUT' : 'POST';
      const data = isEditMode ? { ...values, id: mmGtData.id } : values;
      
      const response = await fetchWithAuth(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      setMmGtData(response.data);
      setSuccessMessage(`MM GT ${isEditMode ? 'güncellendi' : 'oluşturuldu'}`);
      toast.success(`MM GT ${isEditMode ? 'güncellendi' : 'oluşturuldu'}`);
      setIsEditMode(false);
      fetchInitialData();
    } catch (error) {
      handleApiError(error, 'MM GT kaydedilirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };
  
  const deleteMmGt = async (id) => {
    if (!window.confirm('Bu MM GT ürününü silmek istediğinizden emin misiniz?')) return;
    
    setLoading(true);
    setError(null);
    
    try {
      await fetchWithAuth(`${API_URLS.DELETE_MM_GT}/${id}`, {
        method: 'DELETE'
      });
      
      setSuccessMessage('MM GT silindi');
      toast.success('MM GT silindi');
      setMmGtData(null);
      fetchInitialData();
    } catch (error) {
      handleApiError(error, 'MM GT silinirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // YM GT operations
  const saveYmGt = async (values) => {
    setLoading(true);
    setError(null);
    
    try {
      const endpoint = isEditMode ? API_URLS.UPDATE_YM_GT : API_URLS.CREATE_YM_GT;
      const method = isEditMode ? 'PUT' : 'POST';
      const data = isEditMode ? { ...values, id: ymGtData.id } : values;
      
      const response = await fetchWithAuth(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      setYmGtData(response.data);
      setSuccessMessage(`YM GT ${isEditMode ? 'güncellendi' : 'oluşturuldu'}`);
      toast.success(`YM GT ${isEditMode ? 'güncellendi' : 'oluşturuldu'}`);
      setIsEditMode(false);
      fetchInitialData();
    } catch (error) {
      handleApiError(error, 'YM GT kaydedilirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };
  
  const deleteYmGt = async (id) => {
    if (!window.confirm('Bu YM GT ürününü silmek istediğinizden emin misiniz?')) return;
    
    setLoading(true);
    setError(null);
    
    try {
      await fetchWithAuth(`${API_URLS.DELETE_YM_GT}/${id}`, {
        method: 'DELETE'
      });
      
      setSuccessMessage('YM GT silindi');
      toast.success('YM GT silindi');
      setYmGtData(null);
      fetchInitialData();
    } catch (error) {
      handleApiError(error, 'YM GT silinirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // YM ST operations
  const saveYmSt = async (values) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetchWithAuth(API_URLS.CREATE_YM_ST, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      });
      
      setSelectedYmSt(prev => [...prev, response.data]);
      setSuccessMessage('YM ST oluşturuldu');
      toast.success('YM ST oluşturuldu');
      fetchInitialData();
    } catch (error) {
      handleApiError(error, 'YM ST kaydedilirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };
  
  const deleteYmSt = async (id) => {
    if (!window.confirm('Bu YM ST ürününü silmek istediğinizden emin misiniz?')) return;
    
    setLoading(true);
    setError(null);
    
    try {
      await fetchWithAuth(`${API_URLS.DELETE_YM_ST}/${id}`, {
        method: 'DELETE'
      });
      
      setSelectedYmSt(prev => prev.filter(item => item.id !== id));
      setSuccessMessage('YM ST silindi');
      toast.success('YM ST silindi');
      fetchInitialData();
    } catch (error) {
      handleApiError(error, 'YM ST silinirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Reçete operations
  const saveRecete = async (values) => {
    setLoading(true);
    setError(null);
    
    try {
      const endpoint = isEditMode ? API_URLS.UPDATE_RECETE : API_URLS.CREATE_RECETE;
      const method = isEditMode ? 'PUT' : 'POST';
      const data = isEditMode ? { ...values, id: receteData.id } : values;
      
      const response = await fetchWithAuth(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      setReceteData(response.data);
      setSuccessMessage(`Reçete ${isEditMode ? 'güncellendi' : 'oluşturuldu'}`);
      toast.success(`Reçete ${isEditMode ? 'güncellendi' : 'oluşturuldu'}`);
      setIsEditMode(false);
    } catch (error) {
      handleApiError(error, 'Reçete kaydedilirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Auto-select YM ST items
  const autoSelectYmSt = (values) => {
    const availableYmSt = productDatabase.ymStList
      .filter(ymSt => { 
        return ymSt.cap.toString() <= values.cap.toString() &&
               ymSt.aktif === 'evet';
      })
      .sort((a, b) => {
        // Çapa göre sırala (büyükten küçüğe)
        const capComparison = parseFloat(b.cap) - parseFloat(a.cap);
        if (capComparison !== 0) return capComparison;
        
        // Sequence'e göre sırala (küçükten büyüğe)
        return parseFloat(a.sequence) - parseFloat(b.sequence);
      });
    
    setSelectedYmSt(availableYmSt);
  };

  // Export data to Excel
  const exportToExcel = useCallback(async (data, sheetName, fileName) => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(sheetName);
      
      if (data.length === 0) {
        toast.error('Dışa aktarılacak veri bulunamadı');
        return;
      }
      
      // Add headers
      const headers = Object.keys(data[0]);
      worksheet.addRow(headers);
      
      // Add data
      data.forEach(item => {
        worksheet.addRow(Object.values(item));
      });
      
      // Style headers
      worksheet.getRow(1).font = { bold: true };
      
      // Auto-fit columns
      worksheet.columns.forEach(column => {
        column.width = 15;
      });
      
      // Generate Excel file
      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), fileName);
      
      toast.success('Veriler Excel\'e aktarıldı');
    } catch (error) {
      console.error('Excel dışa aktarma hatası:', error);
      toast.error('Excel dışa aktarma sırasında bir hata oluştu');
    }
  }, []);

  // Context value
  const contextValue = {
    // State
    mmGtData,
    ymGtData,
    ymStList,
    selectedYmSt,
    receteData,
    loading,
    error,
    successMessage,
    isEditMode,
    dataExist,
    activeTab,
    productDatabase,
    
    // Setters
    setMmGtData,
    setYmGtData,
    setYmStList,
    setSelectedYmSt,
    setReceteData,
    setLoading,
    setError,
    setSuccessMessage,
    setIsEditMode,
    setDataExist,
    setActiveTab,
    
    // Operations
    saveMmGt,
    deleteMmGt,
    saveYmGt,
    deleteYmGt,
    saveYmSt,
    deleteYmSt,
    saveRecete,
    autoSelectYmSt,
    exportToExcel,
    fetchInitialData
  };

  return (
    <GalvanizliTelContext.Provider value={contextValue}>
      {children}
    </GalvanizliTelContext.Provider>
  );
};

// Custom hook for using GT context
export const useGalvanizliTel = () => {
  const context = useContext(GalvanizliTelContext);
  if (!context) {
    throw new Error('useGalvanizliTel hook must be used within a GalvanizliTelProvider');
  }
  return context;
};

// Main component
const GalvanizliTelNetsis = () => {
  // Use GT context
  const {
    mmGtData,
    ymGtData,
    selectedYmSt,
    receteData,
    loading,
    error,
    successMessage,
    isEditMode,
    activeTab,
    productDatabase,
    setMmGtData,
    setYmGtData,
    setSelectedYmSt,
    setError,
    setSuccessMessage,
    setIsEditMode,
    setActiveTab,
    saveMmGt,
    deleteMmGt,
    saveYmGt,
    deleteYmGt,
    saveYmSt,
    deleteYmSt,
    saveRecete,
    autoSelectYmSt,
    exportToExcel,
    fetchInitialData
  } = useGalvanizliTel();

  // Local state
  const [currentStep, setCurrentStep] = useState('form');
  const [formValues, setFormValues] = useState({
    cap: '',
    kod_2: '',
    kaplama: '',
    min_mukavemet: '',
    max_mukavemet: '',
    tolerans_plus: '',
    tolerans_minus: '',
    kg: '',
    renk: '',
    ic_cap: '',
    dis_cap: '',
    shrink: 'hayır'
  });
  const [showReceteModal, setShowReceteModal] = useState(false);
  const [showYmStModal, setShowYmStModal] = useState(false);
  const [showTalepModal, setShowTalepModal] = useState(false);
  const [talepNotu, setTalepNotu] = useState('');
  const [showRejectTalepModal, setShowRejectTalepModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [sequence, setSequence] = useState(1);

  // Auth hook
  const { user } = useAuth();

  // Fetch product data on component mount
  useEffect(() => {
    if (user) {
      fetchInitialData();
    }
  }, [user, fetchInitialData]);

  // Tab change handler
  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    setError(null);
    setSuccessMessage('');
  };

  // Product edit handlers
  const handleEditProduct = () => {
    setIsEditMode(true);
    setCurrentStep('form');
  };
  
  const handleEditYmSt = () => {
    setShowYmStModal(true);
  };

  // Form input change handler
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormValues({
      ...formValues,
      [name]: value
    });
  };

  // Form submission handler
  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    try {
      await saveMmGt(values);
      setFormValues(values);
      setCurrentStep('summary');
      resetForm();
    } catch (error) {
      console.error('Form submit error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Cancel handler
  const handleCancel = () => {
    setCurrentStep('form');
    setIsEditMode(false);
    setFormValues({
      cap: '',
      kod_2: '',
      kaplama: '',
      min_mukavemet: '',
      max_mukavemet: '',
      tolerans_plus: '',
      tolerans_minus: '',
      kg: '',
      renk: '',
      ic_cap: '',
      dis_cap: '',
      shrink: 'hayır'
    });
  };

  // YM ST Save handler
  const handleSaveYmSt = async (values) => {
    await saveYmSt(values);
    setShowYmStModal(false);
  };

  // Stok Kodu formatter
  const getFormattedStokKodu = () => {
    if (!formValues.cap || !formValues.kod_2) return '';
    
    const capFormatted = formValues.cap.toString().replace('.', ',');
    return `GT.${formValues.kod_2}.${capFormatted}`;
  };

  // Recete save handler
  const handleSaveRecete = async (values) => {
    await saveRecete({
      ...values,
      mm_gt_id: mmGtData?.id,
      ym_gt_id: ymGtData?.id
    });
    setShowReceteModal(false);
  };

  // Talep handlers
  const handleOpenTalepModal = () => {
    setShowTalepModal(true);
    setTalepNotu('');
  };
  
  const handleCloseTalepModal = () => {
    setShowTalepModal(false);
    setTalepNotu('');
  };
  
  const handleSubmitTalep = async () => {
    if (!talepNotu.trim()) {
      setError('Talep notu boş olamaz');
      return;
    }
    
    try {
      await fetchWithAuth(API_URLS.CREATE_TALEP, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mm_gt_id: mmGtData?.id,
          talep_notu: talepNotu,
          talep_eden: user?.id
        })
      });
      
      setSuccessMessage('Talep başarıyla oluşturuldu');
      toast.success('Talep başarıyla oluşturuldu');
      setShowTalepModal(false);
      setTalepNotu('');
    } catch (error) {
      console.error('Talep oluşturma hatası:', error);
      setError('Talep oluşturulurken bir hata oluştu');
    }
  };
  
  const handleRejectTalep = async () => {
    if (!rejectionReason.trim()) {
      setError('Red nedeni boş olamaz');
      return;
    }
    
    try {
      await fetchWithAuth(API_URLS.REJECT_TALEP, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          talep_id: mmGtData?.talep_id,
          red_nedeni: rejectionReason,
          reddeden: user?.id
        })
      });
      
      setSuccessMessage('Talep başarıyla reddedildi');
      toast.success('Talep başarıyla reddedildi');
      setShowRejectTalepModal(false);
      setRejectionReason('');
      fetchInitialData();
    } catch (error) {
      console.error('Talep reddetme hatası:', error);
      setError('Talep reddedilirken bir hata oluştu');
    }
  };

  // Excel export handler
  const handleExport = (type) => {
    let data, sheetName, fileName;
    
    switch (type) {
      case 'mm-gt':
        data = productDatabase.mmGtList;
        sheetName = 'MM GT Listesi';
        fileName = 'mm_gt_listesi.xlsx';
        break;
      case 'ym-gt':
        data = productDatabase.ymGtList;
        sheetName = 'YM GT Listesi';
        fileName = 'ym_gt_listesi.xlsx';
        break;
      case 'ym-st':
        data = productDatabase.ymStList;
        sheetName = 'YM ST Listesi';
        fileName = 'ym_st_listesi.xlsx';
        break;
      default:
        return;
    }
    
    exportToExcel(data, sheetName, fileName);
  };

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <h2 className="text-2xl font-bold mb-6">Galvanizli Tel Netsis Entegrasyonu</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          {error}
        </div>
      )}
      
      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4">
          {successMessage}
        </div>
      )}
      
      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => handleTabChange("mm-gt-tanimla")}
          className={`py-2 px-4 font-medium ${
            activeTab === "mm-gt-tanimla"
              ? "border-b-2 border-red-500 text-red-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          MM GT Tanımla
        </button>
        
        <button
          onClick={() => handleTabChange("mm-gt-listesi")}
          className={`py-2 px-4 font-medium ${
            activeTab === "mm-gt-listesi"
              ? "border-b-2 border-red-500 text-red-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          MM GT Listesi
        </button>
        
        <button
          onClick={() => handleTabChange("ym-gt-listesi")}
          className={`py-2 px-4 font-medium ${
            activeTab === "ym-gt-listesi"
              ? "border-b-2 border-red-500 text-red-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          YM GT Listesi
        </button>
        
        <button
          onClick={() => handleTabChange("ym-st-listesi")}
          className={`py-2 px-4 font-medium ${
            activeTab === "ym-st-listesi"
              ? "border-b-2 border-red-500 text-red-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          YM ST Listesi
        </button>
      </div>
      
      {/* Tab Content */}
      {activeTab === "mm-gt-tanimla" && (
        <div className="bg-white p-6 rounded-md shadow-md">
          {currentStep === 'form' && (
            <div>
              <h3 className="text-lg font-bold mb-4">
                {isEditMode ? 'MM GT Düzenle' : 'MM GT Tanımla'}
              </h3>
              
              <Formik
                initialValues={
                  isEditMode
                    ? mmGtData
                    : {
                        cap: '',
                        kod_2: '',
                        kaplama: '',
                        min_mukavemet: '',
                        max_mukavemet: '',
                        tolerans_plus: '',
                        tolerans_minus: '',
                        kg: '',
                        renk: '',
                        ic_cap: '',
                        dis_cap: '',
                        shrink: 'hayır'
                      }
                }
                validationSchema={mmGtValidationSchema}
                onSubmit={handleSubmit}
              >
                {({ isSubmitting, values, setFieldValue }) => (
                  <Form>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Çap (mm)
                        </label>
                        <Field
                          type="number"
                          name="cap"
                          step="0.1"
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                          onChange={(e) => {
                            setFieldValue('cap', e.target.value);
                            handleInputChange(e);
                          }}
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
                          <option value="">Seçiniz</option>
                          <option value="GI">GI (Sıcak Daldırma)</option>
                          <option value="EG">EG (Elektrolitik)</option>
                        </Field>
                        <ErrorMessage name="kod_2" component="div" className="text-red-500 text-sm mt-1" />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Kaplama (g/m²)
                        </label>
                        <Field
                          type="number"
                          name="kaplama"
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                          onChange={handleInputChange}
                        />
                        <ErrorMessage name="kaplama" component="div" className="text-red-500 text-sm mt-1" />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Min Mukavemet (N/mm²)
                        </label>
                        <Field
                          type="number"
                          name="min_mukavemet"
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                          onChange={handleInputChange}
                        />
                        <ErrorMessage name="min_mukavemet" component="div" className="text-red-500 text-sm mt-1" />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Max Mukavemet (N/mm²)
                        </label>
                        <Field
                          type="number"
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
                          type="number"
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
                          type="number"
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
                          type="number"
                          name="kg"
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                          onChange={handleInputChange}
                        />
                        <ErrorMessage name="kg" component="div" className="text-red-500 text-sm mt-1" />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Renk
                        </label>
                        <Field
                          type="text"
                          name="renk"
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                          onChange={handleInputChange}
                        />
                        <ErrorMessage name="renk" component="div" className="text-red-500 text-sm mt-1" />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          İç Çap (cm)
                        </label>
                        <Field
                          type="number"
                          name="ic_cap"
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                          onChange={handleInputChange}
                        />
                        <ErrorMessage name="ic_cap" component="div" className="text-red-500 text-sm mt-1" />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Dış Çap (cm)
                        </label>
                        <Field
                          type="number"
                          name="dis_cap"
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                          onChange={handleInputChange}
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
                      <span className="text-sm text-gray-500">Çap:</span>
                      <p>{formValues.cap} mm</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Kaplama Türü:</span>
                      <p>{formValues.kod_2}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Kaplama:</span>
                      <p>{formValues.kaplama} g/m²</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Mukavemet:</span>
                      <p>{formValues.min_mukavemet}-{formValues.max_mukavemet} N/mm²</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Tolerans:</span>
                      <p>+{formValues.tolerans_plus}/-{formValues.tolerans_minus} mm</p>
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
                    <div className="flex space-x-3">
                      <button
                        onClick={() => autoSelectYmSt(formValues)}
                        type="button"
                        className="text-green-600 hover:text-green-800"
                      >
                        Otomatik Oluştur
                      </button>
                      <button
                        onClick={handleEditYmSt}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Düzenle
                      </button>
                    </div>
                  </div>
                  
                  {selectedYmSt.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Stok Kodu
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Stok Adı
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Çap
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              İşlem
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {selectedYmSt.map((item) => (
                            <tr key={item.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {item.stok_kodu}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {item.stok_adi}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {item.cap} mm
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <button
                                  onClick={() => deleteYmSt(item.id)}
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
                  ) : (
                    <p className="text-gray-500 italic">YM ST eklenmemiş</p>
                  )}
                </div>
                
                {/* Reçete Bilgileri */}
                <div className="bg-gray-50 p-4 rounded-md">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-md font-semibold">Reçete Bilgileri</h4>
                    <button
                      onClick={() => setShowReceteModal(true)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      {receteData ? 'Düzenle' : 'Oluştur'}
                    </button>
                  </div>
                  
                  {receteData ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      <div>
                        <span className="text-sm text-gray-500">Boraks Tüketimi:</span>
                        <p>{receteData.boraks_tuketimi}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Asit Tüketimi:</span>
                        <p>{receteData.asit_tuketimi}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Desi Tüketimi:</span>
                        <p>{receteData.desi_tuketimi}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Paketleme Süresi:</span>
                        <p>{receteData.paketleme_suresi}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Galvanizleme Süresi:</span>
                        <p>{receteData.galvanizleme_suresi}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Tel Çekme Süresi:</span>
                        <p>{receteData.tel_cekme_suresi}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">Reçete tanımlanmamış</p>
                  )}
                </div>
                
                {/* İşlem Butonları */}
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                  >
                    Yeni Ürün Tanımla
                  </button>
                  <button
                    onClick={handleOpenTalepModal}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                  >
                    Talep Oluştur
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* MM GT Listesi Tab */}
      {activeTab === "mm-gt-listesi" && (
        <div className="bg-white p-6 rounded-md shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">MM GT Listesi</h3>
            <button
              onClick={() => handleExport('mm-gt')}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              Excel'e Aktar
            </button>
          </div>
          
          {loading ? (
            <p className="text-center py-4">Yükleniyor...</p>
          ) : productDatabase.mmGtList.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stok Kodu
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stok Adı
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Çap
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kaplama
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      İşlemler
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {productDatabase.mmGtList.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.stok_kodu}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.stok_adi}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.cap} mm
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.kaplama} g/m²
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 space-x-2">
                        <button
                          onClick={() => {
                            setMmGtData(item);
                            setIsEditMode(true);
                            setFormValues(item);
                            setActiveTab("mm-gt-tanimla");
                            setCurrentStep('form');
                          }}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Düzenle
                        </button>
                        <button
                          onClick={() => deleteMmGt(item.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Sil
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center py-4">Kayıt bulunamadı</p>
          )}
        </div>
      )}
      
      {/* YM GT Listesi Tab */}
      {activeTab === "ym-gt-listesi" && (
        <div className="bg-white p-6 rounded-md shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">YM GT Listesi</h3>
            <button
              onClick={() => handleExport('ym-gt')}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              Excel'e Aktar
            </button>
          </div>
          
          {loading ? (
            <p className="text-center py-4">Yükleniyor...</p>
          ) : productDatabase.ymGtList.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stok Kodu
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stok Adı
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      İşlemler
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {productDatabase.ymGtList.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.stok_kodu}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.stok_adi}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 space-x-2">
                        <button
                          onClick={() => {
                            setYmGtData(item);
                            setIsEditMode(true);
                          }}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Düzenle
                        </button>
                        <button
                          onClick={() => deleteYmGt(item.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Sil
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center py-4">Kayıt bulunamadı</p>
          )}
        </div>
      )}
      
      {/* YM ST Listesi Tab */}
      {activeTab === "ym-st-listesi" && (
        <div className="bg-white p-6 rounded-md shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">YM ST Listesi</h3>
            <button
              onClick={() => handleExport('ym-st')}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              Excel'e Aktar
            </button>
          </div>
          
          {loading ? (
            <p className="text-center py-4">Yükleniyor...</p>
          ) : productDatabase.ymStList.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stok Kodu
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stok Adı
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Çap
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aktif
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      İşlemler
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {productDatabase.ymStList.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.stok_kodu}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.stok_adi}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.cap} mm
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.aktif}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 space-x-2">
                        <button
                          onClick={() => deleteYmSt(item.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Sil
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center py-4">Kayıt bulunamadı</p>
          )}
        </div>
      )}

      {/* Reçete Modal */}
      {showReceteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Reçete Tanımla</h3>
            
            <Formik
              initialValues={
                receteData || {
                  boraks_tuketimi: '',
                  asit_tuketimi: '',
                  desi_tuketimi: '',
                  paketleme_suresi: '',
                  galvanizleme_suresi: '',
                  tel_cekme_suresi: ''
                }
              }
              validationSchema={receteValidationSchema}
              onSubmit={handleSaveRecete}
            >
              {({ isSubmitting }) => (
                <Form>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Boraks Tüketimi
                      </label>
                      <Field
                        type="number"
                        name="boraks_tuketimi"
                        step="0.001"
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                      />
                      <ErrorMessage name="boraks_tuketimi" component="div" className="text-red-500 text-sm mt-1" />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Asit Tüketimi
                      </label>
                      <Field
                        type="number"
                        name="asit_tuketimi"
                        step="0.001"
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                      />
                      <ErrorMessage name="asit_tuketimi" component="div" className="text-red-500 text-sm mt-1" />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Desi Tüketimi
                      </label>
                      <Field
                        type="number"
                        name="desi_tuketimi"
                        step="0.001"
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                      />
                      <ErrorMessage name="desi_tuketimi" component="div" className="text-red-500 text-sm mt-1" />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Paketleme Süresi
                      </label>
                      <Field
                        type="number"
                        name="paketleme_suresi"
                        step="0.001"
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                      />
                      <ErrorMessage name="paketleme_suresi" component="div" className="text-red-500 text-sm mt-1" />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Galvanizleme Süresi
                      </label>
                      <Field
                        type="number"
                        name="galvanizleme_suresi"
                        step="0.001"
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                      />
                      <ErrorMessage name="galvanizleme_suresi" component="div" className="text-red-500 text-sm mt-1" />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tel Çekme Süresi
                      </label>
                      <Field
                        type="number"
                        name="tel_cekme_suresi"
                        step="0.0001"
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                      />
                      <ErrorMessage name="tel_cekme_suresi" component="div" className="text-red-500 text-sm mt-1" />
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-2 mt-6">
                    <button
                      type="button"
                      onClick={() => setShowReceteModal(false)}
                      className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                    >
                      İptal
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                    >
                      {isSubmitting ? 'İşleniyor...' : 'Kaydet'}
                    </button>
                  </div>
                </Form>
              )}
            </Formik>
          </div>
        </div>
      )}

      {/* YM ST Modal */}
      {showYmStModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-4xl">
            <h3 className="text-lg font-bold mb-4">YM ST Seçimi</h3>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Seçim
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stok Kodu
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stok Adı
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Çap
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Durum
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {productDatabase.ymStList
                    .filter(item => item.aktif === 'evet')
                    .map((item) => {
                      const isSelected = selectedYmSt.some(selected => selected.id === item.id);
                      
                      return (
                        <tr key={item.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                if (isSelected) {
                                  setSelectedYmSt(prev => prev.filter(selected => selected.id !== item.id));
                                } else {
                                  setSelectedYmSt(prev => [...prev, item]);
                                }
                              }}
                              className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.stok_kodu}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.stok_adi}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.cap} mm
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.aktif}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
            
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setShowYmStModal(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Talep Oluşturma Modalı */}
      {showTalepModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Talep Oluştur</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Talep Notu
              </label>
              <textarea
                value={talepNotu}
                onChange={(e) => setTalepNotu(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                rows={4}
                placeholder="Talebinizle ilgili açıklama yazın..."
              />
              {error && !talepNotu.trim() && (
                <div className="text-red-500 text-sm mt-1">Talep notu belirtmelisiniz</div>
              )}
            </div>
            
            <div className="flex justify-end space-x-2">
              <button
                onClick={handleCloseTalepModal}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleSubmitTalep}
                disabled={loading || !talepNotu.trim()}
                className={`px-4 py-2 ${!talepNotu.trim() ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'} text-white rounded-md transition-colors`}
              >
                {loading ? 'İşleniyor...' : 'Gönder'}
              </button>
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

// Default export
export default GalvanizliTelNetsis;