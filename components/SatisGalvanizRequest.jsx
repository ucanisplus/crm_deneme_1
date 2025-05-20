// SatisGalvanizRequest.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { API_URLS, fetchWithAuth, normalizeInputValue } from '@/api-config';
import { toast } from 'react-toastify';

/**
 * Sales team request form component for galvanized wire products
 * This component allows sales team to create requests for the production team
 * and view existing requests
 */
const SatisGalvanizRequest = () => {
  const { user, hasPermission } = useAuth();
  
  // State variables
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Requests list state
  const [requests, setRequests] = useState([]);
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  
  // Filtering and sorting state
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Request details modal state
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  
  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState(null);
  
  // Form data for MM GT request
  const [requestData, setRequestData] = useState({
    cap: '2.50',           // Default: 2.50mm (valid range: 0.8-8)
    kod_2: 'NIT',          // Default: NIT
    kaplama: '100',        // Default: 100 g/m² (NIT valid range: 100-400, PAD fixed at 50)
    min_mukavemet: '350',  // Default: 350 MPa
    max_mukavemet: '550',  // Default: 550 MPa
    kg: '500',             // Default: 500 kg (valid range: 250-1250)
    ic_cap: 45,            // Default: 45 cm
    dis_cap: 75,           // Default: 75 cm
    tolerans_plus: '0.05', // Default: ±0.05 mm (valid range: 0-0.10)
    tolerans_minus: '0.06', // Default: ±0.06 mm (valid range: 0-0.10)
    shrink: 'evet',         // Default: Yes
    unwinding: ''           // Optional
  });
  
  // Fetch existing requests on component mount
  useEffect(() => {
    fetchRequests();
  }, []);
  
  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchQuery, sortField, sortDirection]);
  
  // Fetch requests from API
  const fetchRequests = async () => {
    try {
      setIsLoadingRequests(true);
      
      // Get only user's requests
      let url = `${API_URLS.galSalRequests}?created_by=${user?.id}`;
      
      const response = await fetchWithAuth(url);
      
      if (!response || !response.ok) {
        throw new Error('Talep listesi alınamadı');
      }
      
      const requestsData = await response.json();
      setRequests(requestsData || []);
    } catch (error) {
      console.error('Talep listesi alınamadı:', error);
      toast.error('Talepler alınamadı: ' + error.message);
    } finally {
      setIsLoadingRequests(false);
    }
  };
  
  // Permission check
  if (!hasPermission('access:galvanizli-tel-request')) {
    return (
      <div className="p-4 text-center">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-700">Bu modüle erişim izniniz bulunmamaktadır.</p>
        </div>
      </div>
    );
  }
  
  // Handle form input changes with validation
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let normalizedValue = value;
    
    // Convert comma to point for decimal values and ensure proper format
    if (name === 'cap' || name === 'kaplama' || name === 'min_mukavemet' || 
        name === 'max_mukavemet' || name === 'kg' || 
        name === 'tolerans_plus' || name === 'tolerans_minus') {
      normalizedValue = normalizeInputValue(value);
    }
    
    // Apply validation rules based on field
    if (name === 'cap') {
      // Diameter validation: between 0.8 and 8
      const numValue = parseFloat(normalizedValue);
      if (!isNaN(numValue) && (numValue < 0.8 || numValue > 8)) {
        toast.error('Çap değeri 0.8 ile 8 arasında olmalıdır.');
        return;
      }
    } else if (name === 'kaplama') {
      // Kaplama validation based on kod_2 (coating type)
      const numValue = parseFloat(normalizedValue);
      if (!isNaN(numValue)) {
        if (requestData.kod_2 === 'PAD' && numValue !== 50) {
          toast.error('PAD kaplama türü için kaplama değeri 50 olmalıdır.');
          return;
        } else if (requestData.kod_2 === 'NIT' && (numValue < 100 || numValue > 400)) {
          toast.error('NIT kaplama türü için kaplama değeri 100 ile 400 arasında olmalıdır.');
          return;
        }
      }
    } else if (name === 'tolerans_plus' || name === 'tolerans_minus') {
      // Tolerance validation: between 0 and 0.10
      const numValue = parseFloat(normalizedValue);
      if (!isNaN(numValue) && (numValue < 0 || numValue > 0.10)) {
        toast.error('Tolerans değeri 0 ile 0.10 arasında olmalıdır.');
        return;
      }
    } else if (name === 'kg') {
      // Weight validation: between 250 and 1250
      const numValue = parseFloat(normalizedValue);
      if (!isNaN(numValue) && (numValue < 250 || numValue > 1250)) {
        toast.error('Ağırlık değeri 250 ile 1250 arasında olmalıdır.');
        return;
      }
    } else if (name === 'kod_2') {
      // When coating type changes, set kaplama value accordingly for PAD
      if (normalizedValue === 'PAD') {
        toast.info('PAD kaplama türü için kaplama değeri otomatik olarak 50 ayarlanacaktır.');
        setRequestData({
          ...requestData,
          [name]: normalizedValue,
          kaplama: '50'
        });
        return;
      }
    }
    
    setRequestData({
      ...requestData,
      [name]: normalizedValue
    });
  };
  
  // Cap input change also updates dis_cap automatically
  const handleCapChange = (e) => {
    const value = normalizeInputValue(e.target.value);
    
    // Diameter validation: between 0.8 and 8
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && (numValue < 0.8 || numValue > 8)) {
      toast.error('Çap değeri 0.8 ile 8 arasında olmalıdır.');
      return;
    }
    
    setRequestData(prev => {
      const icCap = prev.ic_cap || 45;
      let disCap;
      
      if (icCap === 45) disCap = 75;
      else if (icCap === 50) disCap = 90;
      else if (icCap === 55) disCap = 105;
      else disCap = icCap + (parseFloat(value) * 10); // General calculation
      
      return {
        ...prev,
        cap: value,
        dis_cap: disCap
      };
    });
  };
  
  // Handle internal diameter change
  const handleIcCapChange = (e) => {
    const value = parseInt(e.target.value);
    setRequestData(prev => {
      let disCap;
      
      if (value === 45) disCap = 75;
      else if (value === 50) disCap = 90;
      else if (value === 55) disCap = 105;
      else disCap = value + (parseFloat(prev.cap) * 10); // General calculation
      
      return {
        ...prev,
        ic_cap: value,
        dis_cap: disCap
      };
    });
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('tr-TR');
  };
  
  // Filter and sort requests
  const getFilteredAndSortedRequests = (applyPagination = true) => {
    let filteredRequests = [...requests];
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filteredRequests = filteredRequests.filter(request => request.status === statusFilter);
    }
    
    // Apply search query
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filteredRequests = filteredRequests.filter(request => 
        request.cap.toString().includes(query) ||
        request.kod_2.toLowerCase().includes(query) ||
        request.kaplama.toString().includes(query) ||
        request.id.toLowerCase().includes(query)
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
      if (sortField === 'cap' || sortField === 'kaplama' || sortField === 'kg') {
        aValue = parseFloat(aValue);
        bValue = parseFloat(bValue);
      }
      
      // Apply sort direction
      const modifier = sortDirection === 'asc' ? 1 : -1;
      
      if (aValue < bValue) return -1 * modifier;
      if (aValue > bValue) return 1 * modifier;
      return 0;
    });
    
    // Apply pagination if requested
    if (applyPagination) {
      const startIndex = (currentPage - 1) * itemsPerPage;
      return filteredRequests.slice(startIndex, startIndex + itemsPerPage);
    }
    
    return filteredRequests;
  };
  
  // Get total pages
  const getTotalPages = () => {
    const totalItems = getFilteredAndSortedRequests(false).length;
    return Math.ceil(totalItems / itemsPerPage);
  };

  // Show delete confirmation modal
  const confirmDelete = (request) => {
    setRequestToDelete(request);
    setShowDeleteModal(true);
  };
  
  // Delete request
  const deleteRequest = async () => {
    if (!requestToDelete) return;
    
    try {
      setIsLoading(true);
      
      const response = await fetchWithAuth(`${API_URLS.galSalRequests}/${requestToDelete.id}`, {
        method: 'DELETE'
      });
      
      if (!response || !response.ok) {
        throw new Error('Talep silinemedi');
      }
      
      toast.success('Talep başarıyla silindi');
      // Close the modal
      setShowDeleteModal(false);
      setRequestToDelete(null);
      // Refresh request list
      await fetchRequests();
    } catch (error) {
      console.error('Talep silme hatası:', error);
      toast.error('Talep silinemedi: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Update request status
  const updateRequestStatus = async (requestId, newStatus) => {
    try {
      setIsLoading(true);
      
      const response = await fetchWithAuth(`${API_URLS.galSalRequests}/${requestId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
      });
      
      if (!response || !response.ok) {
        throw new Error('Talep durumu güncellenemedi');
      }
      
      toast.success('Talep durumu başarıyla güncellendi');
      // Refresh request list
      await fetchRequests();
    } catch (error) {
      console.error('Talep durumu güncelleme hatası:', error);
      toast.error('Talep durumu güncellenemedi: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Validate request data
  const validateRequestData = () => {
    const validationErrors = [];
    
    // Validate diameter (cap)
    const capValue = parseFloat(requestData.cap);
    if (isNaN(capValue) || capValue < 0.8 || capValue > 8) {
      validationErrors.push('Çap değeri 0.8 ile 8 arasında olmalıdır.');
    }
    
    // Validate coating (kaplama) based on type (kod_2)
    const kaplamaValue = parseFloat(requestData.kaplama);
    if (isNaN(kaplamaValue)) {
      validationErrors.push('Geçerli bir kaplama değeri giriniz.');
    } else {
      if (requestData.kod_2 === 'PAD' && kaplamaValue !== 50) {
        validationErrors.push('PAD kaplama türü için kaplama değeri 50 olmalıdır.');
      } else if (requestData.kod_2 === 'NIT' && (kaplamaValue < 100 || kaplamaValue > 400)) {
        validationErrors.push('NIT kaplama türü için kaplama değeri 100 ile 400 arasında olmalıdır.');
      }
    }
    
    // Validate tolerances
    const toleransPlusValue = parseFloat(requestData.tolerans_plus);
    if (isNaN(toleransPlusValue) || toleransPlusValue < 0 || toleransPlusValue > 0.10) {
      validationErrors.push('Tolerans+ değeri 0 ile 0.10 arasında olmalıdır.');
    }
    
    const toleransMinusValue = parseFloat(requestData.tolerans_minus);
    if (isNaN(toleransMinusValue) || toleransMinusValue < 0 || toleransMinusValue > 0.10) {
      validationErrors.push('Tolerans- değeri 0 ile 0.10 arasında olmalıdır.');
    }
    
    // Validate weight (kg)
    const kgValue = parseFloat(requestData.kg);
    if (isNaN(kgValue) || kgValue < 250 || kgValue > 1250) {
      validationErrors.push('Ağırlık değeri 250 ile 1250 arasında olmalıdır.');
    }
    
    return validationErrors;
  };
  
  // Submit the request
  const submitRequest = async (e) => {
    e.preventDefault();
    
    // Validate request data
    const validationErrors = validateRequestData();
    if (validationErrors.length > 0) {
      validationErrors.forEach(error => toast.error(error));
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      setSuccessMessage('');
      
      // Create request object with only fields that exist in the database
      const request = {
        cap: requestData.cap,
        kod_2: requestData.kod_2,
        kaplama: requestData.kaplama,
        min_mukavemet: requestData.min_mukavemet,
        max_mukavemet: requestData.max_mukavemet,
        kg: requestData.kg,
        ic_cap: requestData.ic_cap,
        dis_cap: requestData.dis_cap,
        tolerans_plus: requestData.tolerans_plus,
        tolerans_minus: requestData.tolerans_minus,
        shrink: requestData.shrink,
        unwinding: requestData.unwinding || null,
        status: 'pending',                // Initial status: pending
        created_by: user?.id || null      // Track who created the request
      };
      
      // Send the request to the API
      const response = await fetchWithAuth(API_URLS.galSalRequests, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      });
      
      if (!response) {
        throw new Error('Sunucudan yanıt alınamadı.');
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Talep oluşturulurken hata: ${errorText}`);
      }
      
      // Get the response data
      const data = await response.json();
      
      // Email notification placeholder - to be implemented later
      // sendEmailNotification(data);
      
      // Reset form after successful submission
      setRequestData({
        cap: '2.50',
        kod_2: 'NIT',
        kaplama: '100',
        min_mukavemet: '350',
        max_mukavemet: '550',
        kg: '500',
        ic_cap: 45,
        dis_cap: 75,
        tolerans_plus: '0.05',
        tolerans_minus: '0.06',
        shrink: 'evet',
        unwinding: ''
      });
      
      // Refresh the request list
      fetchRequests();
      
      // Show success message
      setSuccessMessage('Talep başarıyla oluşturuldu.');
      toast.success('Talep başarıyla oluşturuldu.');
      
    } catch (error) {
      console.error('Talep oluşturma hatası:', error);
      setError(error.message || 'Talep oluşturulurken bir hata meydana geldi.');
      toast.error(error.message || 'Talep oluşturulurken bir hata meydana geldi.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Get status badge color
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
  
  // Get status text
  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return 'Beklemede';
      case 'approved':
        return 'Onaylandı';
      case 'rejected':
        return 'Reddedildi';
      case 'in_progress':
        return 'İşleniyor';
      case 'completed':
        return 'Tamamlandı';
      default:
        return status;
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-6xl mx-auto">
      {/* Header with toggle button */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Galvanizli Tel Talebi Oluştur
        </h1>
        
        <button 
          onClick={() => setShowRequestsModal(!showRequestsModal)}
          className="flex items-center px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
          </svg>
          {showRequestsModal ? 'Talep Formu' : 'Taleplerim'}
        </button>
      </div>
      
      {/* Main content - Toggle between form and requests list */}
      {showRequestsModal ? (
        // Requests list panel
        <div className="bg-white rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-gray-700 flex items-center">
            <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Mevcut Talepleriniz
          </h2>
          
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
                  placeholder="Çap, kaplama, açıklama vb."
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
                <option value="all">Tüm Durumlar</option>
                <option value="pending">Beklemede</option>
                <option value="approved">Onaylandı</option>
                <option value="rejected">Reddedildi</option>
                <option value="in_progress">İşleniyor</option>
                <option value="completed">Tamamlandı</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="sortField" className="block text-sm font-medium text-gray-700 mb-1">Sıralama</label>
              <div className="flex space-x-2">
                <select
                  id="sortField"
                  value={sortField}
                  onChange={(e) => setSortField(e.target.value)}
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="created_at">Oluşturma Tarihi</option>
                  <option value="status">Durum</option>
                  <option value="cap">Çap</option>
                  <option value="kod_2">Kaplama Türü</option>
                  <option value="kaplama">Kaplama Miktarı</option>
                  <option value="kg">Ağırlık</option>
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
          
          {isLoadingRequests ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
            </div>
          ) : requests.length === 0 ? (
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="mt-4 text-gray-600">Henüz hiç talep oluşturmadınız.</p>
              <button 
                onClick={() => setShowRequestsModal(false)}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Yeni Talep Oluştur
              </button>
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
                    {getFilteredAndSortedRequests().length} / {requests.length} talep gösteriliyor
                    {statusFilter !== 'all' && ` (${getStatusText(statusFilter)} durumunda)`}
                    {searchQuery.trim() !== '' && ` "${searchQuery}" arama sonuçları`}
                  </span>
                  {(statusFilter !== 'all' || searchQuery.trim() !== '') && (
                    <button 
                      onClick={() => {
                        setStatusFilter('all');
                        setSearchQuery('');
                      }}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      Filtreleri Temizle
                    </button>
                  )}
                </div>
              )}
              
              {/* No results message */}
              {getFilteredAndSortedRequests().length === 0 && (
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                  <svg className="w-12 h-12 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <p className="mt-4 text-gray-600">Filtreleme kriterleriyle eşleşen talep bulunamadı.</p>
                  <button 
                    onClick={() => {
                      setStatusFilter('all');
                      setSearchQuery('');
                    }}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Filtreleri Temizle
                  </button>
                </div>
              )}
              
              {getFilteredAndSortedRequests().length > 0 && (
                <>
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Talep No</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Çap</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kaplama</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mukavemet</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ağırlık</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {getFilteredAndSortedRequests().map((request, index) => (
                        <tr key={request.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {request.id.substring(0, 8)}...
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {request.cap} mm
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {request.kod_2} {request.kaplama} g/m²
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {request.min_mukavemet} - {request.max_mukavemet} MPa
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {request.kg} kg
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {hasPermission('manage:galvanizli-tel-requests') ? (
                              <select
                                value={request.status}
                                onChange={(e) => updateRequestStatus(request.id, e.target.value)}
                                className={`text-xs font-medium rounded border px-2 py-1 ${getStatusBadgeColor(request.status)}`}
                                disabled={isLoading}
                              >
                                <option value="pending">Beklemede</option>
                                <option value="approved">Onaylandı</option>
                                <option value="rejected">Reddedildi</option>
                                <option value="in_progress">İşleniyor</option>
                                <option value="completed">Tamamlandı</option>
                              </select>
                            ) : (
                              <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusBadgeColor(request.status)}`}>
                                {getStatusText(request.status)}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(request.created_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 flex items-center space-x-2">
                            <button
                              onClick={() => {
                                setSelectedRequest(request);
                                setShowDetailsModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-800 mr-2 text-sm"
                            >
                              Detay
                            </button>
                            <button
                              onClick={() => confirmDelete(request)}
                              disabled={isLoading || request.status !== 'pending'}
                              className="text-red-600 hover:text-red-800 disabled:text-gray-400 disabled:cursor-not-allowed text-sm"
                            >
                              Sil
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {/* Pagination Controls */}
                  {getFilteredAndSortedRequests(false).length > itemsPerPage && (
                    <div className="mt-6 flex flex-col md:flex-row items-center justify-between space-y-3 md:space-y-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-700">
                          Sayfa <span className="font-medium">{currentPage}</span> / <span className="font-medium">{getTotalPages()}</span>
                        </span>
                        <select
                          value={itemsPerPage}
                          onChange={(e) => {
                            setItemsPerPage(Number(e.target.value));
                            setCurrentPage(1); // Reset to first page when changing items per page
                          }}
                          className="border border-gray-300 rounded px-2 py-1 text-sm"
                        >
                          <option value={5}>5 / sayfa</option>
                          <option value={10}>10 / sayfa</option>
                          <option value={20}>20 / sayfa</option>
                          <option value={50}>50 / sayfa</option>
                        </select>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setCurrentPage(1)}
                          disabled={currentPage === 1}
                          className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          «
                        </button>
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          ‹
                        </button>
                        
                        {/* Page Numbers */}
                        <div className="flex items-center space-x-1">
                          {[...Array(getTotalPages())].map((_, i) => {
                            const pageNum = i + 1;
                            // Show only current page, first, last, and 1 page before and after current
                            if (
                              pageNum === 1 || 
                              pageNum === getTotalPages() || 
                              pageNum === currentPage ||
                              pageNum === currentPage - 1 ||
                              pageNum === currentPage + 1
                            ) {
                              return (
                                <button
                                  key={pageNum}
                                  onClick={() => setCurrentPage(pageNum)}
                                  className={`w-8 h-8 flex items-center justify-center border ${
                                    currentPage === pageNum 
                                    ? 'bg-blue-600 text-white border-blue-600' 
                                    : 'border-gray-300 hover:bg-gray-50'
                                  } rounded-md text-sm`}
                                >
                                  {pageNum}
                                </button>
                              );
                            } else if (
                              (pageNum === 2 && currentPage > 3) ||
                              (pageNum === getTotalPages() - 1 && currentPage < getTotalPages() - 2)
                            ) {
                              return <span key={pageNum} className="text-gray-500">...</span>;
                            } else {
                              return null;
                            }
                          })}
                        </div>
                        
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, getTotalPages()))}
                          disabled={currentPage === getTotalPages()}
                          className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          ›
                        </button>
                        <button
                          onClick={() => setCurrentPage(getTotalPages())}
                          disabled={currentPage === getTotalPages()}
                          className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          »
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => setShowRequestsModal(false)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Yeni Talep Oluştur
            </button>
          </div>
        </div>
      ) : (
        // Request form panel
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Left column - Basic information */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tel Çapı (mm)</label>
                <input
                  type="text"
                  name="cap"
                  value={requestData.cap}
                  onChange={handleCapChange}
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Örn: 2.50"
                />
                <p className="text-xs text-gray-500 mt-1">İzin verilen aralık: 0.8 - 8 mm</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kaplama Türü</label>
                <select
                  name="kod_2"
                  value={requestData.kod_2}
                  onChange={handleInputChange}
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="NIT">NIT</option>
                  <option value="PAD">PAD</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kaplama (gr/m²)</label>
                <input
                  type="text"
                  name="kaplama"
                  value={requestData.kaplama}
                  onChange={handleInputChange}
                  className={`block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${requestData.kod_2 === 'PAD' ? 'bg-gray-100' : ''}`}
                  placeholder={requestData.kod_2 === 'PAD' ? '50' : 'Örn: 100'}
                  readOnly={requestData.kod_2 === 'PAD'}
                />
                {requestData.kod_2 === 'PAD' ? (
                  <p className="text-xs text-gray-500 mt-1">PAD kaplama için sabit değer: 50 g/m²</p>
                ) : (
                  <p className="text-xs text-gray-500 mt-1">İzin verilen aralık: 100 - 400 g/m²</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Mukavemet (MPa)</label>
                <input
                  type="text"
                  name="min_mukavemet"
                  value={requestData.min_mukavemet}
                  onChange={handleInputChange}
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Örn: 350"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Maksimum Mukavemet (MPa)</label>
                <input
                  type="text"
                  name="max_mukavemet"
                  value={requestData.max_mukavemet}
                  onChange={handleInputChange}
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Örn: 550"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ağırlık (kg)</label>
                <input
                  type="text"
                  name="kg"
                  value={requestData.kg}
                  onChange={handleInputChange}
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Örn: 500"
                />
                <p className="text-xs text-gray-500 mt-1">İzin verilen aralık: 250 - 1250 kg</p>
              </div>
            </div>
            
            {/* Right column - Additional details */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">İç Çap (cm)</label>
                <select
                  name="ic_cap"
                  value={requestData.ic_cap}
                  onChange={handleIcCapChange}
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={45}>45 cm</option>
                  <option value={50}>50 cm</option>
                  <option value={55}>55 cm</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dış Çap (cm)</label>
                <input
                  type="text"
                  name="dis_cap"
                  value={requestData.dis_cap}
                  disabled
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-gray-100"
                />
                <p className="text-xs text-gray-500 mt-1">Dış çap, iç çap ve tel çapına göre otomatik hesaplanır.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tolerans+ (mm)</label>
                  <input
                    type="text"
                    name="tolerans_plus"
                    value={requestData.tolerans_plus}
                    onChange={handleInputChange}
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Örn: 0.05"
                  />
                  <p className="text-xs text-gray-500 mt-1">İzin verilen aralık: 0 - 0.10 mm</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tolerans- (mm)</label>
                  <input
                    type="text"
                    name="tolerans_minus"
                    value={requestData.tolerans_minus}
                    onChange={handleInputChange}
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Örn: 0.06"
                  />
                  <p className="text-xs text-gray-500 mt-1">İzin verilen aralık: 0 - 0.10 mm</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shrink</label>
                <select
                  name="shrink"
                  value={requestData.shrink}
                  onChange={handleInputChange}
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="evet">Evet</option>
                  <option value="hayir">Hayır</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unwinding</label>
                <input
                  type="text"
                  name="unwinding"
                  value={requestData.unwinding}
                  onChange={handleInputChange}
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
          
          {/* Submit button */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={submitRequest}
              disabled={isLoading}
              className="px-6 py-3 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  İşleniyor...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Talep Oluştur
                </>
              )}
            </button>
          </div>
          
          {/* Error and success messages */}
          {error && (
            <div className="mt-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-sm">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {error}
              </div>
            </div>
          )}
          
          {successMessage && (
            <div className="mt-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg shadow-sm">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {successMessage}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Footer information */}
      <div className="mt-8 p-4 border border-dashed border-gray-300 rounded-md bg-gray-50">
        <h3 className="text-md font-medium text-gray-700 mb-2 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Bilgilendirme
        </h3>
        <p className="text-sm text-gray-600">
          Oluşturduğunuz talepler üretim ekibi tarafından değerlendirilecektir. Talebin durumunu bu sayfadan takip edebilirsiniz.
          Onaylanan talepler için üretim planlaması yapılacak ve size bilgi verilecektir.
        </p>
      </div>
      
      {/* Request Details Modal */}
      {showDetailsModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Talep Detayları
              </h3>
              <button 
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left column - Basic information */}
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Talep ID</p>
                    <p className="text-base text-gray-900">{selectedRequest.id}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Durum</p>
                    <div className="mt-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getStatusBadgeColor(selectedRequest.status)}`}>
                        {getStatusText(selectedRequest.status)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Oluşturulma Tarihi</p>
                    <p className="text-base text-gray-900">{formatDate(selectedRequest.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Tel Çapı</p>
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
                </div>
                
                {/* Right column - Additional details */}
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Ağırlık</p>
                    <p className="text-base text-gray-900">{selectedRequest.kg} kg</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">İç Çap</p>
                    <p className="text-base text-gray-900">{selectedRequest.ic_cap} cm</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Dış Çap</p>
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
                    <p className="text-base text-gray-900">{selectedRequest.unwinding || '-'}</p>
                  </div>
                </div>
              </div>
              

              {/* Response info (if rejected) */}
              {selectedRequest.status === 'rejected' && selectedRequest.rejection_reason && (
                <div className="mt-6">
                  <p className="text-sm font-medium text-gray-500">Reddedilme Sebebi</p>
                  <div className="mt-2 p-4 bg-red-50 rounded-md border border-red-200">
                    <p className="text-base text-red-900 whitespace-pre-line">{selectedRequest.rejection_reason}</p>
                  </div>
                </div>
              )}
              
              {/* Processing info */}
              {selectedRequest.processed_by && selectedRequest.processed_at && (
                <div className="mt-6">
                  <p className="text-sm font-medium text-gray-500">İşlem Bilgileri</p>
                  <div className="mt-2">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">İşleyen:</span> {selectedRequest.processed_by}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">İşlem Tarihi:</span> {formatDate(selectedRequest.processed_at)}
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="border-t border-gray-200 px-6 py-4 flex justify-end">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteModal && requestToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-center text-red-600 mb-4">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-center text-gray-900 mb-4">Talebi Silmeyi Onaylayın</h3>
              <p className="text-center text-gray-700 mb-6">
                <span className="font-semibold">{requestToDelete.cap}mm {requestToDelete.kod_2} {requestToDelete.kaplama}g/m²</span> talebini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
              </p>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setRequestToDelete(null);
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={deleteRequest}
                  disabled={isLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Siliniyor...
                    </span>
                  ) : (
                    <span>Evet, Sil</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SatisGalvanizRequest;