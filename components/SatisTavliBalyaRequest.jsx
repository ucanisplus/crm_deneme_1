// SatisTavliBalyaRequest.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { API_URLS, fetchWithAuth, normalizeInputValue } from '@/api-config';
import { toast } from 'react-toastify';

/**
 * Sales team request form component for Tavlı Tel (Annealed Wire) and Balya Teli (Bale Wire) products
 * Both product types can be Yagli (Püskürtme/Daldırma) or Yagsiz
 * This component allows sales team to create requests for the production team
 * and view existing requests
 */
const SatisTavliBalyaRequest = () => {
  const { user, hasPermission } = useAuth();
  
  // Memoize permission check to prevent infinite loops in table rendering
  const canManageRequests = useMemo(() =>
    hasPermission('manage:tavli-balya-tel-requests'),
    [hasPermission]
  );

  // Product type state - TAVLI (Tavlı Tel) or BALYA (Balya Teli)
  const [productType, setProductType] = useState('TAVLI');
  
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
  
  // Product search and viewing state
  const [showProductSearchModal, setShowProductSearchModal] = useState(false);
  const [existingProducts, setExistingProducts] = useState([]);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showProductDetailsModal, setShowProductDetailsModal] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [productFilter, setProductFilter] = useState({
    cap: '',
    product_type: 'all',  // 'TAVLI', 'BALYA', or 'all'
    yaglama_tipi: 'all'   // For filtering Balya products
  });
  
  // Duplicate product warning state
  const [duplicateProduct, setDuplicateProduct] = useState(null);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);

  // Default form values
  const defaultRequestData = {
    cap: '2.50',           // Default: 2.50mm (valid range: 0.8-8)
    product_type: 'TAVLI', // Default: TAVLI (Tavlı Tel)
    yaglama_tipi: '',      // For both TAVLI and BALYA (Püskürtme/Daldırma or empty for Yagsiz)
    min_mukavemet: '350',  // Default: 350 MPa
    max_mukavemet: '550',  // Default: 550 MPa
    kg: '500',             // Default: 500 kg (valid range: 250-20000)
    ic_cap: 45,            // Default: 45 cm (from combination 45-75)
    dis_cap: 75,           // Default: 75 cm (from combination 45-75)
    tolerans_plus: '0.05', // Default: ±0.05 mm (valid range: 0-0.10)
    tolerans_minus: '0.06', // Default: ±0.06 mm (valid range: 0-0.10)
    shrink: 'evet',         // Default: Yes
    unwinding: 'Anti-Clockwise', // Default: Anti-Clockwise
    cast_kont: '',          // Bağ Miktarı (Optional)
    helix_kont: '',         // Helix Control (Optional)
    elongation: ''          // Elongation (Optional)
  };

  // Form data for Tavlı/Balya Tel request - load from sessionStorage or use defaults
  const [requestData, setRequestData] = useState(() => {
    try {
      const savedData = sessionStorage.getItem('tavliBalyaRequestFormData');
      return savedData ? { ...defaultRequestData, ...JSON.parse(savedData) } : defaultRequestData;
    } catch (error) {
      console.warn('Failed to load saved form data:', error);
      return defaultRequestData;
    }
  });
  
  // Tolerans işaret durumları - load from sessionStorage or use defaults
  const [toleransMaxSign, setToleransMaxSign] = useState(() => {
    try {
      const saved = sessionStorage.getItem('tavliBalyaToleranceMaxSign');
      return saved || '+';
    } catch (error) {
      return '+';
    }
  });
  const [toleransMinSign, setToleransMinSign] = useState(() => {
    try {
      const saved = sessionStorage.getItem('tavliBalyaToleranceMinSign');
      return saved || '-';
    } catch (error) {
      return '-';
    }
  });
  
  // Paketleme seçenekleri için state
  const [paketlemeSecenekleri, setPaketlemeSecenekleri] = useState({
    shrink: true, // Default olarak seçili
    paletli: false,
    karton: false  // Replaces sepetli
  });
  
  // Bulk selection state
  const [selectedRequestIds, setSelectedRequestIds] = useState([]);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);

  // Save form data to sessionStorage whenever it changes
  useEffect(() => {
    try {
      sessionStorage.setItem('tavliBalyaRequestFormData', JSON.stringify(requestData));
    } catch (error) {
      console.warn('Failed to save form data:', error);
    }
  }, [requestData]);

  // Save tolerance signs to sessionStorage whenever they change
  useEffect(() => {
    try {
      sessionStorage.setItem('tavliBalyaToleranceMaxSign', toleransMaxSign);
    } catch (error) {
      console.warn('Failed to save tolerance max sign:', error);
    }
  }, [toleransMaxSign]);

  useEffect(() => {
    try {
      sessionStorage.setItem('tavliBalyaToleranceMinSign', toleransMinSign);
    } catch (error) {
      console.warn('Failed to save tolerance min sign:', error);
    }
  }, [toleransMinSign]);

  // Fetch existing requests when user is loaded
  useEffect(() => {
    if (user && user.id) {
      fetchRequests();
      fetchExistingProducts();
    }
  }, [user]);
  
  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchQuery, sortField, sortDirection]);

  // YM.ST selection removed from sales page - production team handles this

  // Remove real-time duplicate checking - will check on submit instead
  
  // Fetch requests from API
  const fetchRequests = async () => {
    try {
      // Don't fetch if user is not loaded
      if (!user || !user.id) {
        console.log('User not loaded yet, skipping fetchRequests');
        return;
      }
      
      setIsLoadingRequests(true);
      
      // Get only user's requests
      let url = `${API_URLS.tavliBalyaSalRequests}?created_by=${user.id}`;
      
      const response = await fetchWithAuth(url);
      
      if (!response || !response.ok) {
        // Try fetching without created_by filter if it fails
        console.log('Failed with created_by filter, trying without...');
        const allRequestsResponse = await fetchWithAuth(API_URLS.tavliBalyaSalRequests);
        
        if (!allRequestsResponse || !allRequestsResponse.ok) {
          throw new Error('Talep listesi alınamadı');
        }
        
        const allRequestsData = await allRequestsResponse.json();
        // Filter on client side
        const requestsData = allRequestsData.filter(req => req.created_by === user.id);
        setRequests(requestsData || []);
      } else {
        const requestsData = await response.json();
        setRequests(requestsData || []);
      }
      
      // Update selectedRequest if it's currently open to refresh the modal with latest data
      if (selectedRequest && showDetailsModal) {
        const updatedRequest = requestsData.find(req => req.id === selectedRequest.id);
        if (updatedRequest) {
          setSelectedRequest(updatedRequest);
        }
      }
    } catch (error) {
      console.error('Talep listesi alınamadı:', error);
      toast.error('Talepler alınamadı: ' + error.message);
    } finally {
      setIsLoadingRequests(false);
    }
  };

  // Check if products associated with requests still exist
  const checkForDeletedProducts = async (requestsData) => {
    try {
      // Get all MM GT products to check against
      const response = await fetchWithAuth(API_URLS.tavliBalyaMm);
      if (!response || !response.ok) {
        console.warn('Could not fetch products to check for deleted items');
        return;
      }
      
      const allProducts = await response.json();
      const requestsToUpdate = [];
      
      // Check each request to see if its associated product still exists
      for (const request of requestsData) {
        // Skip requests that are already marked as "Silinmiş"
        if (request.status === 'silinmis') {
          continue;
        }
        
        // Find matching product using different matching strategies
        let productExists = false;
        
        // Strategy 1: Try to match by final_product_key if available
        if (request.final_product_key) {
          productExists = allProducts.some(product => {
            const productKey = generateProductKeyFromProduct(product);
            return productKey === request.final_product_key;
          });
        }
        
        // Strategy 2: Try to match by original stok_kodu
        if (!productExists && request.stok_kodu) {
          productExists = allProducts.some(product => product.stok_kodu === request.stok_kodu);
        }
        
        // Strategy 3: Try to match by final_stok_adi if available  
        if (!productExists && request.final_stok_adi) {
          productExists = allProducts.some(product => product.stok_adi === request.final_stok_adi);
        }
        
        // Strategy 4: Match by product specifications (fallback)
        if (!productExists) {
          productExists = allProducts.some(product => {
            return (
              Math.abs(parseFloat(product.cap || 0) - parseFloat(request.cap || 0)) < 0.01 &&
              product.product_type === request.product_type &&
              // For BALYA, also check yaglama_tipi
              (product.product_type === 'TAVLI' || product.yaglama_tipi === request.yaglama_tipi) &&
              Math.abs(parseFloat(product.min_mukavemet || 0) - parseFloat(request.min_mukavemet || 0)) < 1 &&
              Math.abs(parseFloat(product.max_mukavemet || 0) - parseFloat(request.max_mukavemet || 0)) < 1 &&
              Math.abs(parseFloat(product.kg || 0) - parseFloat(request.kg || 0)) < 1 &&
              Math.abs(parseFloat(product.ic_cap || 0) - parseFloat(request.ic_cap || 0)) < 0.1 &&
              Math.abs(parseFloat(product.dis_cap || 0) - parseFloat(request.dis_cap || 0)) < 0.1
            );
          });
        }
        
        // If product doesn't exist, mark request as "Silinmiş"
        if (!productExists) {
          requestsToUpdate.push(request.id);
        }
      }
      
      // Update requests that have deleted products
      if (requestsToUpdate.length > 0) {
        console.log(`Found ${requestsToUpdate.length} requests with deleted products, updating status...`);
        
        for (const requestId of requestsToUpdate) {
          try {
            await fetchWithAuth(`${API_URLS.tavliBalyaSalRequests}/${requestId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'silinmis' })
            });
          } catch (error) {
            console.error(`Failed to update request ${requestId} status:`, error);
          }
        }
        
        // Refresh requests to show updated statuses
        setTimeout(() => {
          fetchRequests();
        }, 1000);
      }
    } catch (error) {
      console.error('Error checking for deleted products:', error);
    }
  };

  // Generate product key from product data for comparison
  const generateProductKeyFromProduct = (product) => {
    if (!product) return '';
    
    return `${product.cap || ''}_${product.product_type || ''}_${product.yaglama_tipi || ''}_${product.min_mukavemet || ''}_${product.max_mukavemet || ''}_${product.kg || ''}_${product.ic_cap || ''}_${product.dis_cap || ''}_${product.tolerans_plus || ''}_${product.tolerans_minus || ''}_${product.shrink || ''}_${product.unwinding || ''}`;
  };
  
  // Fetch existing products from MM GT database
  const fetchExistingProducts = async () => {
    try {
      setIsLoadingProducts(true);
      
      const response = await fetchWithAuth(API_URLS.tavliBalyaMm);
      
      if (!response || !response.ok) {
        throw new Error('Ürün listesi alınamadı');
      }
      
      const productsData = await response.json();
      setExistingProducts(productsData || []);
    } catch (error) {
      console.error('Ürün listesi alınamadı:', error);
      // Don't show error toast for products, it's not critical
    } finally {
      setIsLoadingProducts(false);
    }
  };
  
  // Check for duplicate product when submitting
  const checkForDuplicateProduct = async () => {
    try {
      // Generate stok_adi for the current request to compare (including bag amount and packaging options)
      const bagAmount = requestData.cast_kont && requestData.cast_kont.trim() !== ''
        ? `/${requestData.cast_kont}`
        : '';

      // Paketleme eklerini oluştur
      let paketlemeEkleri = '';
      if (paketlemeSecenekleri.shrink) {
        paketlemeEkleri += '-Shrink';
      }
      if (paketlemeSecenekleri.paletli) {
        paketlemeEkleri += '-Plt';
      }
      if (paketlemeSecenekleri.karton) {
        paketlemeEkleri += '-Krtn';
      }

      // Generate tolerance text
      const plusValue = parseFloat(requestData.tolerans_plus) || 0;
      const minusValue = parseFloat(requestData.tolerans_minus) || 0;
      const actualPlusValue = toleransMaxSign === '-' ? -Math.abs(plusValue) : Math.abs(plusValue);
      const actualMinusValue = toleransMinSign === '-' ? -Math.abs(minusValue) : Math.abs(minusValue);
      const higherValue = Math.max(actualPlusValue, actualMinusValue);
      const lowerValue = Math.min(actualPlusValue, actualMinusValue);
      const toleranceText = `${lowerValue}/${higherValue >= 0 ? '+' : ''}${higherValue}`;

      // Build stok adi based on product type with oil information
      // ✅ FIXED: Oil type format matches production component (PSK, DLD, or Yagsiz)
      let yaglamaText = '';
      if (requestData.yaglama_tipi === 'Püskürtme') {
        yaglamaText = '-PSK';
      } else if (requestData.yaglama_tipi === 'Daldırma') {
        yaglamaText = '-DLD';
      } else {
        yaglamaText = '-Yagsiz';
      }

      // Product name based on type
      const productName = requestData.product_type === 'BALYA' ? 'Balya Teli' : 'Tavli Tel';

      // Full stock name with oil type BEFORE paketlemeEkleri (which includes Shrink)
      const currentStokAdi = `${productName} ${parseFloat(requestData.cap).toFixed(2)} mm ${toleranceText} ${requestData.min_mukavemet}-${requestData.max_mukavemet} MPa ID:${requestData.ic_cap} cm OD:${requestData.dis_cap} cm ${requestData.kg}${bagAmount} kg${yaglamaText}${paketlemeEkleri}`;
      
      // Check 1: Find matching products in existing MM GT database by stok_adi
      console.log('🔍 Duplicate check - Current stok_adi:', currentStokAdi);
      console.log('🔍 Duplicate check - Checking against', existingProducts.length, 'existing products');
      
      const matchingProduct = existingProducts.find(product => {
        const matches = product.stok_adi === currentStokAdi;
        if (matches) {
          console.log('✅ Found matching product:', product.stok_adi);
        }
        return matches;
      });
      
      if (matchingProduct) {
        setDuplicateProduct({
          ...matchingProduct,
          source: 'product_database',
          message: 'Bu ürün zaten üretim veritabanında mevcut!'
        });
        return true; // Found duplicate in products
      }
      
      // Check 2: Find matching in existing requests (all users' requests) by stok_adi
      try {
        // Fetch ALL requests, not just current user's
        const allRequestsResponse = await fetchWithAuth(API_URLS.tavliBalyaSalRequests);
        if (allRequestsResponse && allRequestsResponse.ok) {
          const allRequests = await allRequestsResponse.json();
          
          // Find matching request by stok_adi
          const matchingRequest = allRequests.find(request => {
            // Skip completed or rejected requests
            if (request.status === 'completed' || request.status === 'rejected') {
              return false;
            }
            
            // Compare stok_adi
            return request.stok_adi === currentStokAdi;
          });
          
          if (matchingRequest) {
            setDuplicateProduct({
              stok_kodu: matchingRequest.stok_kodu || 'Beklemede',
              stok_adi: matchingRequest.stok_adi,
              cap: matchingRequest.cap,
              product_type: matchingRequest.product_type,
              yaglama_tipi: matchingRequest.yaglama_tipi,
              min_mukavemet: matchingRequest.min_mukavemet,
              max_mukavemet: matchingRequest.max_mukavemet,
              kg: matchingRequest.kg,
              source: 'pending_request',
              message: `Bu ürün için zaten ${matchingRequest.status === 'pending' ? 'bekleyen' : 'işlenen'} bir talep var!`,
              request_id: matchingRequest.id,
              request_status: matchingRequest.status,
              created_at: matchingRequest.created_at
            });
            return true; // Found duplicate in requests
          }
        }
      } catch (error) {
        console.error('Error checking existing requests:', error);
        // Continue even if request check fails
      }
      
      setDuplicateProduct(null);
      return false; // No duplicate found
    } catch (error) {
      console.error('Duplicate check error:', error);
      return false;
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
  
  // Handle form input changes without immediate validation
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let normalizedValue = value;
    
    // Convert comma to point for decimal values and ensure proper format
    if (name === 'cap' || name === 'min_mukavemet' ||
        name === 'max_mukavemet' || name === 'kg' ||
        name === 'tolerans_plus' || name === 'tolerans_minus') {
      normalizedValue = normalizeInputValue(value);
    }

    // Update state without validation - we'll validate on form submission
    setRequestData({
      ...requestData,
      [name]: normalizedValue
    });
  };
  
  // Cap input change also updates dis_cap automatically
  const handleCapChange = (e) => {
    const value = normalizeInputValue(e.target.value);

    setRequestData(prev => {
      const icCap = prev.ic_cap || 45;
      let disCap;

      // Try to calculate dis_cap, but use safe default if cap is not a valid number
      let capValue;
      try {
        capValue = parseFloat(value);
        if (isNaN(capValue)) capValue = 0;
      } catch (e) {
        capValue = 0;
      }

      if (icCap === 45) disCap = 75;
      else if (icCap === 50) disCap = 90;
      else if (icCap === 55) disCap = 105;
      else disCap = icCap + (capValue * 10); // General calculation

      // ✅ CONSTRAINT: Auto-clear "Daldırma" if diameter moves outside valid range (1.80-3.80mm)
      const newData = {
        ...prev,
        cap: value,
        dis_cap: disCap
      };

      if (prev.yaglama_tipi === 'Daldırma' && capValue && (capValue < 1.80 || capValue > 3.80)) {
        console.warn(`Diameter ${capValue}mm is outside Daldırma range (1.80-3.80mm), clearing yaglama_tipi`);
        newData.yaglama_tipi = '';
        // Show toast notification
        setTimeout(() => {
          alert('Daldırma yağlama sadece 1.80-3.80mm çap aralığında kullanılabilir. Yağlama tipi sıfırlandı.');
        }, 100);
      }

      return newData;
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

  // Comma to point conversion handler for onKeyDown
  const handleCommaToPoint = (e, field) => {
    // Prevent +/- characters from being entered in tolerance fields
    if ((field === 'tolerans_plus' || field === 'tolerans_minus') && (e.key === '+' || e.key === '-')) {
      e.preventDefault();
      return;
    }
    
    // Convert comma to point for decimal input
    if (e.key === ',') {
      e.preventDefault();
      const target = e.target;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const value = target.value;
      const newValue = value.substring(0, start) + '.' + value.substring(end);
      target.value = newValue;
      target.setSelectionRange(start + 1, start + 1);
      
      // Trigger change event
      const event = new Event('input', { bubbles: true });
      target.dispatchEvent(event);
    }
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
    
    // Apply search query with partial matching
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filteredRequests = filteredRequests.filter(request => 
        request.cap.toString().startsWith(query) ||
        request.product_type.toLowerCase().includes(query) ||
        (request.yaglama_tipi && request.yaglama_tipi.toLowerCase().includes(query)) ||
        request.id.toLowerCase().includes(query) ||
        request.min_mukavemet.toString().startsWith(query) ||
        request.max_mukavemet.toString().startsWith(query) ||
        request.kg.toString().startsWith(query) ||
        (request.cast_kont && request.cast_kont.toString().startsWith(query)) ||
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
      if (sortField === 'cap' || sortField === 'kg' || sortField === 'cast_kont') {
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
    if (request.status === 'approved') {
      // Special handling for approved requests with warning
      if (window.confirm('Bu onaylanmış talebi silmek istediğinizden emin misiniz?\n\nBu ürünler zaten veritabanına kaydedilmiş olabilir. Onaylanmış talepleri takip etmek istiyorsanız bu kayıtları saklamanız önerilir.')) {
        setRequestToDelete(request);
        deleteRequest();
      }
    } else {
      // Regular confirmation for non-approved requests
      setRequestToDelete(request);
      setShowDeleteModal(true);
    }
  };
  
  // Delete request
  const deleteRequest = async () => {
    if (!requestToDelete) return;
    
    try {
      setIsLoading(true);
      
      const response = await fetchWithAuth(`${API_URLS.tavliBalyaSalRequests}/${requestToDelete.id}`, {
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
  
  // Handle select all requests
  const handleSelectAllRequests = () => {
    const currentPageRequests = getFilteredAndSortedRequests().slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
    const allIds = currentPageRequests.map(req => req.id);
    
    if (selectedRequestIds.length === allIds.length) {
      // Deselect all
      setSelectedRequestIds([]);
    } else {
      // Select all on current page
      setSelectedRequestIds(allIds);
    }
  };
  
  // Handle toggle individual request selection
  const handleToggleRequestSelection = (requestId) => {
    setSelectedRequestIds(prev => {
      if (prev.includes(requestId)) {
        return prev.filter(id => id !== requestId);
      } else {
        return [...prev, requestId];
      }
    });
  };
  
  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedRequestIds.length === 0) {
      toast.warning('Lütfen silmek için en az bir talep seçin');
      return;
    }
    
    const confirmMessage = `${selectedRequestIds.length} adet talebi silmek istediğinizden emin misiniz?`;
    if (!window.confirm(confirmMessage)) {
      return;
    }
    
    try {
      setIsDeletingBulk(true);
      
      // Delete selected requests
      const deletePromises = selectedRequestIds.map(async (id) => {
        const response = await fetchWithAuth(`${API_URLS.tavliBalyaSalRequests}/${id}`, {
          method: 'DELETE'
        });
        return response;
      });
      
      await Promise.all(deletePromises);
      
      toast.success(`${selectedRequestIds.length} adet talep başarıyla silindi`);
      setSelectedRequestIds([]);
      await fetchRequests();
      
    } catch (error) {
      console.error('Toplu silme hatası:', error);
      toast.error('Toplu silme hatası: ' + error.message);
    } finally {
      setIsDeletingBulk(false);
    }
  };

  // Permanently delete "Silinmiş" request from database
  const permanentlyDeleteRequest = async (request) => {
    if (request.status !== 'silinmis') {
      toast.error('Sadece "Silinmiş" durumundaki talepler kalıcı olarak silinebilir');
      return;
    }

    if (!window.confirm(`Bu "Silinmiş" talebi kalıcı olarak veritabanından silmek istediğinizden emin misiniz?\n\nBu işlem geri alınamaz!`)) {
      return;
    }

    try {
      setIsLoading(true);
      
      const response = await fetchWithAuth(`${API_URLS.tavliBalyaSalRequests}/${request.id}`, {
        method: 'DELETE'
      });
      
      if (!response || !response.ok) {
        throw new Error('Talep kalıcı olarak silinemedi');
      }
      
      toast.success('Silinmiş talep kalıcı olarak veritabanından silindi');
      fetchRequests(); // Refresh the list
    } catch (error) {
      console.error('Talep kalıcı olarak silinirken hata:', error);
      toast.error('Talep kalıcı olarak silinemedi: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Update request status
  const updateRequestStatus = async (requestId, newStatus) => {
    try {
      setIsLoading(true);
      
      const response = await fetchWithAuth(`${API_URLS.tavliBalyaSalRequests}/${requestId}`, {
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
  
  // Validate request data with comprehensive error messages
  const validateRequestData = () => {
    const validationErrors = [];

    // Validate diameter (cap)
    const capValue = parseFloat(requestData.cap);
    if (isNaN(capValue)) {
      validationErrors.push('Çap için geçerli bir sayısal değer giriniz (0.90 ile 4.00 arasında).');
    } else if (capValue < 0.90 || capValue > 4.00) {
      validationErrors.push(`Çap değeri 0.90 ile 4.00 arasında olmalıdır. Girilen değer: ${requestData.cap}`);
    }

    // Validate product type
    if (!requestData.product_type || (requestData.product_type !== 'TAVLI' && requestData.product_type !== 'BALYA')) {
      validationErrors.push('Ürün tipi seçilmelidir (Tavlı Tel veya Balya Teli).');
    }

    // Note: YM.ST selection removed - production team will select during approval

    // Note: yaglama_tipi is optional for both TAVLI and BALYA (can be NULL for Yagsiz)

    // Validate tolerances
    const toleransPlusValue = parseFloat(requestData.tolerans_plus);
    if (isNaN(toleransPlusValue)) {
      validationErrors.push('Tolerans+ için geçerli bir sayısal değer giriniz.');
    } else if (toleransPlusValue < 0) {
      validationErrors.push(`Tolerans+ değeri 0 veya daha büyük olmalıdır. Girilen değer: ${requestData.tolerans_plus}`);
    }

    const toleransMinusValue = parseFloat(requestData.tolerans_minus);
    if (isNaN(toleransMinusValue)) {
      validationErrors.push('Tolerans- için geçerli bir sayısal değer giriniz.');
    } else if (toleransMinusValue < 0) {
      validationErrors.push(`Tolerans- değeri 0 veya daha büyük olmalıdır. Girilen değer: ${requestData.tolerans_minus}`);
    }

    // Validate weight (kg)
    const kgValue = parseFloat(requestData.kg);
    if (isNaN(kgValue)) {
      validationErrors.push('Ağırlık için geçerli bir sayısal değer giriniz (250 ile 1250 arasında).');
    } else if (kgValue < 250 || kgValue > 20000) {
      validationErrors.push(`Ağırlık değeri 250 ile 20000 arasında olmalıdır. Girilen değer: ${requestData.kg}`);
    }

    return validationErrors;
  };
  
  // Get the next sequence number for packaging variants
  // Products with same core specs but different packaging should get incremented sequence
  const getNextSequenceForPackagingVariant = async (data) => {
    try {
      // Core specs that define the product (excluding packaging)
      const coreSpecs = {
        cap: parseFloat(data.cap),
        product_type: data.product_type,
        yaglama_tipi: data.yaglama_tipi || '',
        min_mukavemet: data.min_mukavemet,
        max_mukavemet: data.max_mukavemet,
        kg: data.kg,
        ic_cap: data.ic_cap,
        dis_cap: data.dis_cap,
        tolerans_plus: data.tolerans_plus,
        tolerans_minus: data.tolerans_minus,
        cast_kont: data.cast_kont || ''
      };

      // Check both Tavlı/Balya Tel database and existing requests for products with same core specs
      const capFormatted = Math.round(parseFloat(data.cap) * 100).toString().padStart(4, '0');
      const productPrefix = data.product_type === 'BALYA' ? 'TT.BALYA' : 'TT.BAG';
      const basePattern = `${productPrefix}.${capFormatted}`;

      let maxSequence = -1;

      // Check existing Tavlı/Balya Tel products
      try {
        const mmResponse = await fetchWithAuth(`${API_URLS.tavliBalyaMm}`);
        if (mmResponse && mmResponse.ok) {
          const mmProducts = await mmResponse.json();

          mmProducts.forEach(product => {
            // Check if this product has the same core specs
            if (product.stok_kodu && product.stok_kodu.startsWith(basePattern)) {
              const productCoreSpecs = {
                cap: parseFloat(product.cap),
                product_type: product.product_type,
                yaglama_tipi: product.yaglama_tipi || '',
                min_mukavemet: product.min_mukavemet,
                max_mukavemet: product.max_mukavemet,
                kg: product.kg,
                ic_cap: product.ic_cap,
                dis_cap: product.dis_cap,
                tolerans_plus: product.tolerans_plus,
                tolerans_minus: product.tolerans_minus,
                cast_kont: product.cast_kont || ''
              };

              // Compare core specs (excluding packaging)
              const coreSpecsMatch = Object.keys(coreSpecs).every(key =>
                String(coreSpecs[key]) === String(productCoreSpecs[key])
              );

              if (coreSpecsMatch) {
                const sequencePart = product.stok_kodu.split('.').pop();
                const sequenceNum = parseInt(sequencePart);
                if (!isNaN(sequenceNum) && sequenceNum > maxSequence) {
                  maxSequence = sequenceNum;
                }
              }
            }
          });
        }
      } catch (error) {
        console.error('Error checking Tavlı/Balya Tel products:', error);
      }

      // Check existing sales requests
      try {
        const requestsResponse = await fetchWithAuth(API_URLS.tavliBalyaSalRequests);
        if (requestsResponse && requestsResponse.ok) {
          const existingRequests = await requestsResponse.json();

          existingRequests.forEach(request => {
            // Skip completed or rejected requests
            if (request.status === 'completed' || request.status === 'rejected') {
              return;
            }

            if (request.stok_kodu && request.stok_kodu.startsWith(basePattern)) {
              const requestCoreSpecs = {
                cap: parseFloat(request.cap),
                product_type: request.product_type,
                yaglama_tipi: request.yaglama_tipi || '',
                min_mukavemet: request.min_mukavemet,
                max_mukavemet: request.max_mukavemet,
                kg: request.kg,
                ic_cap: request.ic_cap,
                dis_cap: request.dis_cap,
                tolerans_plus: request.tolerans_plus,
                tolerans_minus: request.tolerans_minus,
                cast_kont: request.cast_kont || ''
              };

              // Compare core specs
              const coreSpecsMatch = Object.keys(coreSpecs).every(key =>
                String(coreSpecs[key]) === String(requestCoreSpecs[key])
              );

              if (coreSpecsMatch) {
                const sequencePart = request.stok_kodu.split('.').pop();
                const sequenceNum = parseInt(sequencePart);
                if (!isNaN(sequenceNum) && sequenceNum > maxSequence) {
                  maxSequence = sequenceNum;
                }
              }
            }
          });
        }
      } catch (error) {
        console.error('Error checking existing requests:', error);
      }

      // Return next sequence number
      return maxSequence + 1;

    } catch (error) {
      console.error('Error determining sequence for packaging variant:', error);
      return 0; // Default to 00 if error occurs
    }
  };
  
  // Generate stok kodu and stok adi for the request
  const generateStokKoduAndAdi = async (data) => {
    try {
      // Determine the correct sequence based on existing products with same core specs but different packaging
      const sequence = await getNextSequenceForPackagingVariant(data);
      const capFormatted = Math.round(parseFloat(data.cap) * 100).toString().padStart(4, '0');

      // Determine product prefix based on type: TT.BAG for Tavlı, TT.BALYA for Balya
      const productPrefix = data.product_type === 'BALYA' ? 'TT.BALYA' : 'TT.BAG';
      const stokKodu = `${productPrefix}.${capFormatted}.${sequence.toString().padStart(2, '0')}`;

      // Generate stok adi with optional bag amount
      const bagAmount = data.cast_kont && data.cast_kont.trim() !== ''
        ? `/${data.cast_kont}`
        : '';
      // Generate stok adi with actual tolerance signs
      const plusValue = parseFloat(data.tolerans_plus) || 0;
      const minusValue = parseFloat(data.tolerans_minus) || 0;

      // Apply signs to get the actual values
      const actualPlusValue = toleransMaxSign === '-' ? -Math.abs(plusValue) : Math.abs(plusValue);
      const actualMinusValue = toleransMinSign === '-' ? -Math.abs(minusValue) : Math.abs(minusValue);

      // Determine which value is mathematically higher/lower
      // Higher value goes to plus column, lower value goes to minus column
      const higherValue = Math.max(actualPlusValue, actualMinusValue);
      const lowerValue = Math.min(actualPlusValue, actualMinusValue);

      // Format tolerance text with proper signs
      const toleranceText = `${lowerValue}/${higherValue >= 0 ? '+' : ''}${higherValue}`;

      // Paketleme eklerini oluştur
      let paketlemeEkleri = '';
      if (paketlemeSecenekleri.shrink) {
        paketlemeEkleri += '-Shrink';
      }
      if (paketlemeSecenekleri.paletli) {
        paketlemeEkleri += '-Plt';
      }
      if (paketlemeSecenekleri.karton) {
        paketlemeEkleri += '-Krtn';
      }

      // Generate stok adi based on product type
      // Build stok adi with oil information
      // ✅ FIXED: Oil type format matches production component (PSK, DLD, or Yagsiz)
      let yaglamaText = '';
      if (data.yaglama_tipi === 'Püskürtme') {
        yaglamaText = '-PSK';
      } else if (data.yaglama_tipi === 'Daldırma') {
        yaglamaText = '-DLD';
      } else {
        yaglamaText = '-Yagsiz';
      }

      // Product name based on type
      const productName = data.product_type === 'BALYA' ? 'Balya Teli' : 'Tavli Tel';

      // Full stock name with oil type BEFORE paketlemeEkleri (which includes Shrink)
      const stokAdi = `${productName} ${parseFloat(data.cap).toFixed(2)} mm ${toleranceText} ${data.min_mukavemet}-${data.max_mukavemet} MPa ID:${data.ic_cap} cm OD:${data.dis_cap} cm ${data.kg}${bagAmount} kg${yaglamaText}${paketlemeEkleri}`;

      return { stokKodu, stokAdi };
    } catch (error) {
      console.error('Error generating stok kodu/adi:', error);
      // Return null if generation fails - the request can still be saved without these
      return { stokKodu: null, stokAdi: null };
    }
  };

  // Submit the request
  const submitRequest = async (e) => {
    e.preventDefault();
    
    // Check if user is loaded
    if (!user || !user.id) {
      toast.error('Kullanıcı bilgisi yüklenemedi. Lütfen sayfayı yenileyin.');
      return;
    }
    
    // Validate request data
    const validationErrors = validateRequestData();
    if (validationErrors.length > 0) {
      // Display all validation errors at once
      setError(`Lütfen aşağıdaki hataları düzeltiniz:\n\n${validationErrors.map(err => `• ${err}`).join('\n')}`);
      
      // Also show the first error as a toast
      toast.error('Formdaki hataları düzeltiniz', { autoClose: 5000 });
      return;
    }
    
    // Check for duplicate product before submitting
    const hasDuplicate = await checkForDuplicateProduct();
    
    // If duplicate exists, show warning modal instead of submitting
    if (hasDuplicate) {
      setShowDuplicateWarning(true);
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      setSuccessMessage('');
      
      // Generate stok kodu and stok adi
      const { stokKodu, stokAdi } = await generateStokKoduAndAdi(requestData);
      
      // Create request object with only fields that exist in the database
      const request = {
        cap: requestData.cap,
        product_type: requestData.product_type,           // TAVLI or BALYA
        yaglama_tipi: requestData.yaglama_tipi || null,  // For Balya Teli only
        min_mukavemet: requestData.min_mukavemet,
        max_mukavemet: requestData.max_mukavemet,
        kg: requestData.kg,
        ic_cap: requestData.ic_cap,
        dis_cap: requestData.dis_cap,
        tolerans_plus: requestData.tolerans_plus,
        tolerans_minus: requestData.tolerans_minus,
        tolerans_max_sign: toleransMaxSign,     // Save max tolerance sign
        tolerans_min_sign: toleransMinSign,     // Save min tolerance sign
        shrink: requestData.shrink,
        paletli: paketlemeSecenekleri.paletli ? 'evet' : 'hayır',  // Add paletli
        karton: paketlemeSecenekleri.karton ? 'evet' : 'hayır',    // Add karton
        unwinding: requestData.unwinding || 'Anti-Clockwise',
        cast_kont: requestData.cast_kont || null,         // Bağ miktarı
        helix_kont: requestData.helix_kont || null,       // Helix kontrol
        elongation: requestData.elongation || null,       // Elongation
        status: 'pending',                // Initial status: pending
        created_by: user.id,               // Track who created the request (already validated)
        stok_kodu: stokKodu,              // Generated stok kodu
        stok_adi: stokAdi                 // Generated stok adi
      };
      
      // Send the request to the API
      const response = await fetchWithAuth(API_URLS.tavliBalyaSalRequests, {
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
      
      // Send email notification through isolated backend endpoint
      // This is wrapped in try-catch to ensure talep creation succeeds even if email fails
      try {
        console.log('📧 Sending email notification for request:', data.id);
        
        // Get the backend URL based on the environment
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://crm-deneme-backend.vercel.app/api';
        
        const emailResponse = await fetch(`${backendUrl}/send-galvaniz-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            requestData: request,
            requestId: data.id
          })
        });
        
        const emailResult = await emailResponse.json();
        
        if (emailResult.emailSent) {
          console.log('✅ Talep bildirim e-postası başarıyla gönderildi');
        } else {
          console.warn('⚠️ Talep bildirim e-postası gönderilemedi, ancak talep oluşturuldu');
          if (emailResult.error) {
            console.error('Email error details:', emailResult.error);
          }
        }
      } catch (emailError) {
        // Email error doesn't affect the main flow
        console.error('⚠️ E-posta gönderme hatası (ignored):', emailError);
      }
      
      console.log('✅ Talep başarıyla oluşturuldu');
      
      // Only clear optional fields after successful submission, keep the main values
      setRequestData(prev => ({
        ...prev,
        cast_kont: '',
        helix_kont: '',
        elongation: ''
      }));
      
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
      case 'silinmis':
        return 'bg-gray-100 text-gray-700 border-gray-300';
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
      case 'silinmis':
        return 'Silinmiş';
      default:
        return status;
    }
  };
  
  // Get filtered products based on search and filters
  const getFilteredProducts = () => {
    let filtered = [...existingProducts];
    
    // Apply search query
    if (productSearchQuery.trim() !== '') {
      const query = productSearchQuery.toLowerCase();
      filtered = filtered.filter(product => 
        product.stok_kodu.toLowerCase().includes(query) ||
        product.stok_adi.toLowerCase().includes(query) ||
        product.cap.toString().includes(query)
      );
    }
    
    // Apply filters with partial matching
    if (productFilter.cap !== '') {
      // Allow partial matching for cap - convert to string and check if it starts with the filter value
      filtered = filtered.filter(product => 
        product.cap.toString().startsWith(productFilter.cap)
      );
    }
    
    if (productFilter.product_type !== 'all') {
      filtered = filtered.filter(product => product.product_type === productFilter.product_type);
    }

    if (productFilter.yaglama_tipi && productFilter.yaglama_tipi !== 'all') {
      filtered = filtered.filter(product => product.yaglama_tipi === productFilter.yaglama_tipi);
    }
    
    // Sort by stok_kodu
    filtered.sort((a, b) => a.stok_kodu.localeCompare(b.stok_kodu));
    
    return filtered;
  };
  
  // Copy stok kodu to clipboard
  const copyStokKodu = (stokKodu) => {
    navigator.clipboard.writeText(stokKodu);
    toast.success(`Stok kodu kopyalandı: ${stokKodu}`);
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md p-4 max-w-full mx-auto">
      {/* Header with toggle button */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Galvanizli Tel Talebi Oluştur
        </h1>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowProductSearchModal(true)}
            className="flex items-center px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-md transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Mevcut Ürünler
          </button>
          
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
                  placeholder="Çap, ürün tipi, açıklama vb."
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
                <option value="silinmis">Silinmiş</option>
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
                  <option value="product_type">Ürün Tipi</option>
                  <option value="yaglama_tipi">Yağlama Tipi</option>
                  <option value="kg">Ağırlık</option>
                  <option value="cast_kont">Bağ Miktarı</option>
                  <option value="unwinding">Unwinding</option>
                  <option value="helix_kont">Helix Kontrol</option>
                  <option value="elongation">Elongation</option>
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
                  {/* Bulk Delete Button */}
                  {selectedRequestIds.length > 0 && (
                    <div className="mb-4 flex justify-end">
                      <button
                        onClick={handleBulkDelete}
                        disabled={isDeletingBulk}
                        className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isDeletingBulk ? (
                          <>
                            <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                            Siliniyor...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Seçilenleri Sil ({selectedRequestIds.length})
                          </>
                        )}
                      </button>
                    </div>
                  )}
                  
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <input
                            type="checkbox"
                            checked={
                              selectedRequestIds.length > 0 && 
                              selectedRequestIds.length === getFilteredAndSortedRequests().slice(
                                (currentPage - 1) * itemsPerPage,
                                currentPage * itemsPerPage
                              ).length
                            }
                            onChange={handleSelectAllRequests}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            title="Tüm talepleri seç/kaldır"
                          />
                        </th>
                        <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Talep No</th>
                        <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stok Kodu</th>
                        <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Çap</th>
                        <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ürün Tipi</th>
                        <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mukavemet</th>
                        <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ağırlık</th>
                        <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bağ Miktarı</th>
                        <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unwinding</th>
                        <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                        <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
                        <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {getFilteredAndSortedRequests().map((request, index) => (
                        <tr key={request.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            <input
                              type="checkbox"
                              checked={selectedRequestIds.includes(request.id)}
                              onChange={() => handleToggleRequestSelection(request.id)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              title="Bu talebi seç/kaldır"
                            />
                          </td>
                          <td className="px-2 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {request.id.substring(0, 8)}...
                          </td>
                          <td className="px-2 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {request.stok_kodu || '-'}
                          </td>
                          <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500">
                            {parseFloat(request.cap)} mm
                          </td>
                          <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500">
                            {request.product_type === 'BALYA' ? 'Balya Teli' : 'Tavlı Tel'}
                            {request.yaglama_tipi && (
                              <span className="text-xs ml-1">({request.yaglama_tipi})</span>
                            )}
                          </td>
                          <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500">
                            {parseFloat(request.min_mukavemet)} - {parseFloat(request.max_mukavemet)} MPa
                          </td>
                          <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500">
                            {parseFloat(request.kg)} kg
                          </td>
                          <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500">
                            {request.cast_kont || '-'}
                          </td>
                          <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500">
                            {request.unwinding || 'Anti-Clockwise'}
                          </td>
                          <td className="px-2 py-4 whitespace-nowrap">
                            {canManageRequests ? (
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
                                <option value="silinmis">Silinmiş</option>
                              </select>
                            ) : (
                              <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusBadgeColor(request.status)}`}>
                                {getStatusText(request.status)}
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(request.created_at)}
                          </td>
                          <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500 flex items-center space-x-2">
                            <button
                              onClick={() => {
                                setSelectedRequest(request);
                                setShowDetailsModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-800 mr-2 text-sm"
                            >
                              Detay
                            </button>
                            {request.status === 'silinmis' ? (
                              <button
                                onClick={() => permanentlyDeleteRequest(request)}
                                disabled={isLoading}
                                className="text-red-700 hover:text-red-900 disabled:text-gray-400 disabled:cursor-not-allowed p-1"
                                title="Kalıcı Sil (Veritabanından Sil)"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12-9v18a2 2 0 01-2 2H5a2 2 0 01-2-2V4a2 2 0 012-2h14a2 2 0 012 2z" />
                                </svg>
                              </button>
                            ) : (
                              <button
                                onClick={() => confirmDelete(request)}
                                disabled={isLoading}
                                className="text-red-600 hover:text-red-800 disabled:text-gray-400 disabled:cursor-not-allowed p-1"
                                title="Sil"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
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
          {/* Product Type Selection */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-3">Ürün Tipi</label>
            <div className="flex gap-6">
              <div className="flex items-center">
                <input
                  type="radio"
                  id="product-type-tavli"
                  name="product-type"
                  checked={productType === 'TAVLI'}
                  onChange={() => {
                    setProductType('TAVLI');
                    setRequestData(prev => ({
                      ...prev,
                      product_type: 'TAVLI',
                      yaglama_tipi: '' // Clear yaglama when switching to Tavlı
                    }));
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <label htmlFor="product-type-tavli" className="ml-2 text-sm text-gray-900">
                  Tavlı Tel (Annealed Wire)
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="radio"
                  id="product-type-balya"
                  name="product-type"
                  checked={productType === 'BALYA'}
                  onChange={() => {
                    setProductType('BALYA');
                    setRequestData(prev => ({
                      ...prev,
                      product_type: 'BALYA'
                    }));
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <label htmlFor="product-type-balya" className="ml-2 text-sm text-gray-900">
                  Balya Teli (Bale Wire)
                </label>
              </div>
            </div>
          </div>

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
                <p className="text-xs text-gray-500 mt-1">İzin verilen aralık: 0.90 - 4.00 mm</p>
              </div>

              {/* Info: Raw material selection by production team */}
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-blue-800">Ham Madde Seçimi</p>
                    <p className="mt-1 text-sm text-blue-700">
                      Ham madde (YM.ST - Siyah Tel) seçimi üretim ekibi tarafından talep onayı sırasında yapılacaktır.
                    </p>
                  </div>
                </div>
              </div>

              {/* Yağlama Tipi - For both TAVLI and BALYA */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Yağlama Tipi
                </label>
                <select
                  name="yaglama_tipi"
                  value={requestData.yaglama_tipi || ''}
                  onChange={handleInputChange}
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Yağsız (No Oil)</option>
                  <option value="Püskürtme">Yağlı - Püskürtme (PSK - Slightly Oiled)</option>
                  <option
                    value="Daldırma"
                    disabled={!requestData.cap || parseFloat(requestData.cap) < 1.80 || parseFloat(requestData.cap) > 3.80}
                  >
                    Yağlı - Daldırma (DLD - Dipped Oiled) {(!requestData.cap || parseFloat(requestData.cap) < 1.80 || parseFloat(requestData.cap) > 3.80) && '(Sadece 1.80-3.80mm)'}
                  </option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Hem Tavlı Tel hem de Balya Teli yağlı veya yağsız olabilir. Daldırma sadece 1.80-3.80mm çap için geçerlidir.</p>
                {requestData.yaglama_tipi === 'Daldırma' && requestData.cap && (parseFloat(requestData.cap) < 1.80 || parseFloat(requestData.cap) > 3.80) && (
                  <p className="text-xs text-amber-600 mt-1">
                    ⚠️ Daldırma yağlama sadece 1.80-3.80mm çap aralığında kullanılabilir
                  </p>
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
                <p className="text-xs text-gray-500 mt-1">İzin verilen aralık: 5 - 750 kg</p>
              </div>
            </div>
            
            {/* Right column - Additional details */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bobın Boyutu (İç Çap - Dış Çap)</label>
                <select
                  name="coil_size"
                  value={(() => {
                    const standardOptions = ['15-30', '21-34', '23-35', '25-35', '35-65', '45-75', '45-76', '50-90'];
                    const currentValue = `${requestData.ic_cap}-${requestData.dis_cap}`;
                    return standardOptions.includes(currentValue) ? currentValue : 'custom';
                  })()}
                  onChange={(e) => {
                    if (e.target.value === 'custom') {
                      // Mark as custom, user will enter below
                      setRequestData(prev => ({ ...prev, ic_cap: 0, dis_cap: 0 }));
                      return;
                    }
                    const [ic, dis] = e.target.value.split('-').map(v => parseInt(v));
                    setRequestData(prev => ({
                      ...prev,
                      ic_cap: ic,
                      dis_cap: dis
                    }));
                  }}
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  {(() => {
                    const cap = parseFloat(requestData.cap) || 0;
                    const isPuskurtme = requestData.yaglama_tipi === 'Püskürtme';
                    const isDaldirma = requestData.yaglama_tipi === 'Daldırma';
                    const isYagsiz = !requestData.yaglama_tipi || requestData.yaglama_tipi === '';

                    // Helper to check if option should be enabled
                    const isEnabled = (option) => {
                      // PRIMARY CONSTRAINT: Yaglama type determines size category
                      if (isPuskurtme) {
                        // Püskürtme → TAVLI sizes (23-35, 25-35, 35-65, 45-75, 45-76, 50-90)
                        const isPuskurtmeSize = ['23-35', '25-35', '35-65', '45-75', '45-76', '50-90'].includes(option);
                        if (!isPuskurtmeSize) return false;

                        // SECONDARY CONSTRAINT: Filter by diameter
                        if (cap > 0 && cap < 1.80) {
                          // Small diameter (< 1.80mm): Only 25-35
                          return option === '25-35';
                        } else if (cap >= 1.80 && cap < 2.50) {
                          // Medium diameter (1.80-2.49mm): 23-35, 25-35, 45-75, 45-76
                          return ['23-35', '25-35', '45-75', '45-76'].includes(option);
                        } else if (cap >= 2.50) {
                          // Large diameter (≥ 2.50mm): 35-65, 45-75, 45-76, 50-90
                          return ['35-65', '45-75', '45-76', '50-90'].includes(option);
                        }
                        return true;
                      } else if (isDaldirma || isYagsiz) {
                        // Daldırma or Yağsız → BALYA sizes only (15-30, 21-34)
                        return ['15-30', '21-34'].includes(option);
                      }
                      return true;
                    };

                    const getHint = (option) => {
                      if (!isEnabled(option)) return '';
                      // Recommended option hints
                      if (isPuskurtme) {
                        if (cap > 0 && cap < 1.80 && option === '25-35') return ' ✓ Önerilen';
                        if (cap >= 1.80 && cap < 2.50 && option === '45-75') return ' ✓ Önerilen';
                        if (cap >= 2.50 && option === '50-90') return ' ✓ Önerilen';
                      } else if (isDaldirma || isYagsiz) {
                        if (option === '21-34') return ' ✓ Önerilen';
                      }
                      return '';
                    };

                    const options = [
                      { value: '15-30', label: 'ID: 15 cm - OD: 30 cm' },
                      { value: '21-34', label: 'ID: 21 cm - OD: 34 cm' },
                      { value: '23-35', label: 'ID: 23 cm - OD: 35 cm' },
                      { value: '25-35', label: 'ID: 25 cm - OD: 35 cm' },
                      { value: '35-65', label: 'ID: 35 cm - OD: 65 cm' },
                      { value: '45-75', label: 'ID: 45 cm - OD: 75 cm' },
                      { value: '45-76', label: 'ID: 45 cm - OD: 76 cm' },
                      { value: '50-90', label: 'ID: 50 cm - OD: 90 cm' },
                    ];

                    return (
                      <>
                        {options.map(opt => {
                          const enabled = isEnabled(opt.value);
                          return (
                            <option
                              key={opt.value}
                              value={opt.value}
                              disabled={!enabled}
                              style={!enabled ? { color: '#9ca3af' } : {}}
                            >
                              {opt.label}{getHint(opt.value)}
                            </option>
                          );
                        })}
                        <option value="custom" style={{ borderTop: '2px solid #ddd', marginTop: '8px' }}>
                          ➕ Özel Boyut Gir
                        </option>
                      </>
                    );
                  })()}
                </select>
                {(() => {
                  const cap = parseFloat(requestData.cap) || 0;
                  const isPuskurtme = requestData.yaglama_tipi === 'Püskürtme';
                  const isDaldirma = requestData.yaglama_tipi === 'Daldırma';
                  const isYagsiz = !requestData.yaglama_tipi || requestData.yaglama_tipi === '';
                  const standardOptions = ['15-30', '21-34', '23-35', '25-35', '35-65', '45-75', '45-76', '50-90'];
                  const currentValue = `${requestData.ic_cap}-${requestData.dis_cap}`;
                  const isCustom = !standardOptions.includes(currentValue);

                  if (isCustom && requestData.ic_cap && requestData.dis_cap) {
                    return (
                      <p className="text-xs text-amber-600 mt-1">
                        ⚠️ Özel boyut kullanılıyor. Standart boyutlar önerilir.
                      </p>
                    );
                  }

                  if (!requestData.yaglama_tipi) {
                    return <p className="text-xs text-gray-500 mt-1">Önce yağlama tipini seçin - uygun IC-OD boyutları gösterilecek</p>;
                  }

                  if (isPuskurtme && cap === 0) {
                    return <p className="text-xs text-gray-500 mt-1">Çap seçin - Püskürtme için uygun boyutlar gösterilecek</p>;
                  }

                  if (isPuskurtme) {
                    if (cap > 0 && cap < 1.80) {
                      return <p className="text-xs text-gray-500 mt-1">Püskürtme, küçük çap (&lt;1.80mm): Sadece 25-35 cm uygun</p>;
                    } else if (cap >= 1.80 && cap < 2.50) {
                      return <p className="text-xs text-gray-500 mt-1">Püskürtme, orta çap (1.80-2.49mm): 23-35, 25-35, 45-75, 45-76 cm uygun</p>;
                    } else if (cap >= 2.50) {
                      return <p className="text-xs text-gray-500 mt-1">Püskürtme, büyük çap (≥2.50mm): 35-65, 45-75, 45-76, 50-90 cm uygun</p>;
                    }
                    return <p className="text-xs text-gray-500 mt-1">Püskürtme: TAVLI boyutları (23-35, 25-35, 35-65, 45-75, 45-76, 50-90)</p>;
                  }

                  if (isDaldirma || isYagsiz) {
                    return <p className="text-xs text-gray-500 mt-1">{isDaldirma ? 'Daldırma' : 'Yağsız'}: BALYA boyutları (15-30, 21-34)</p>;
                  }

                  return <p className="text-xs text-gray-500 mt-1">Sabit bobin boyutu kombinasyonları</p>;
                })()}
              </div>

              {/* Custom IC/OD Input Section */}
              {(() => {
                const standardOptions = ['15-30', '21-34', '23-35', '25-35', '35-65', '45-75', '45-76', '50-90'];
                const currentValue = `${requestData.ic_cap}-${requestData.dis_cap}`;
                const showCustomInputs = !standardOptions.includes(currentValue) || (requestData.ic_cap === 0 && requestData.dis_cap === 0);

                if (!showCustomInputs) return null;

                return (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">İç Çap (cm)</label>
                      <input
                        type="number"
                        value={requestData.ic_cap || ''}
                        onChange={(e) => setRequestData(prev => ({ ...prev, ic_cap: parseInt(e.target.value) || 0 }))}
                        className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Örn: 45"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Dış Çap (cm)</label>
                      <input
                        type="number"
                        value={requestData.dis_cap || ''}
                        onChange={(e) => setRequestData(prev => ({ ...prev, dis_cap: parseInt(e.target.value) || 0 }))}
                        className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Örn: 75"
                        min="0"
                      />
                    </div>
                  </div>
                );
              })()}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Tolerans (mm)</label>
                  <div className="flex gap-2">
                    <select
                      value={toleransMaxSign}
                      onChange={(e) => setToleransMaxSign(e.target.value)}
                      className="w-16 px-2 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="+">+</option>
                      <option value="-">-</option>
                    </select>
                    <input
                      type="text"
                      name="tolerans_plus"
                      value={requestData.tolerans_plus}
                      onChange={handleInputChange}
                      onKeyDown={(e) => handleCommaToPoint(e, 'tolerans_plus')}
                      className="flex-1 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Örn: 0.05"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">İzin verilen aralık: Pozitif değerler</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Tolerans (mm)</label>
                  <div className="flex gap-2">
                    <select
                      value={toleransMinSign}
                      onChange={(e) => setToleransMinSign(e.target.value)}
                      className="w-16 px-2 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="+">+</option>
                      <option value="-">-</option>
                    </select>
                    <input
                      type="text"
                      name="tolerans_minus"
                      value={requestData.tolerans_minus}
                      onChange={handleInputChange}
                      onKeyDown={(e) => handleCommaToPoint(e, 'tolerans_minus')}
                      className="flex-1 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Örn: 0.06"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">İzin verilen aralık: Pozitif değerler</p>
                </div>
              </div>
              
              {/* Paketleme Seçenekleri */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-3">Paketleme Seçenekleri</label>
                <div className="space-y-3">
                  {/* Shrink - Checkbox */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="shrink"
                      checked={paketlemeSecenekleri.shrink}
                      onChange={(e) => setPaketlemeSecenekleri({
                        ...paketlemeSecenekleri,
                        shrink: e.target.checked
                      })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="shrink" className="ml-2 text-sm text-gray-900">
                      Shrink (Varsayılan Seçili)
                    </label>
                  </div>

                  {/* Paletli - Checkbox */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="paletli"
                      checked={paketlemeSecenekleri.paletli}
                      onChange={(e) => setPaketlemeSecenekleri({
                        ...paketlemeSecenekleri,
                        paletli: e.target.checked
                      })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="paletli" className="ml-2 text-sm text-gray-900">
                      Paletli
                    </label>
                  </div>

                  {/* Karton - Checkbox (replaces Sepetli) */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="karton"
                      checked={paketlemeSecenekleri.karton}
                      onChange={(e) => setPaketlemeSecenekleri({
                        ...paketlemeSecenekleri,
                        karton: e.target.checked
                      })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="karton" className="ml-2 text-sm text-gray-900">
                      Karton
                    </label>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unwinding</label>
                <select
                  name="unwinding"
                  value={requestData.unwinding}
                  onChange={handleInputChange}
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Anti-Clockwise">Anti-Clockwise (Varsayılan)</option>
                  <option value="Clockwise">Clockwise</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Helix Kontrol</label>
                  <input
                    type="text"
                    name="helix_kont"
                    value={requestData.helix_kont}
                    onChange={handleInputChange}
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Opsiyonel"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Elongation</label>
                  <input
                    type="text"
                    name="elongation"
                    value={requestData.elongation}
                    onChange={handleInputChange}
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Opsiyonel"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bağ Miktarı</label>
                <input
                  type="text"
                  name="cast_kont"
                  value={requestData.cast_kont}
                  onChange={handleInputChange}
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Örn: 100"
                />
                <p className="text-xs text-gray-500 mt-1">Bağ miktarı, ürün stok adında kg değerinden sonra '/100' şeklinde görüntülenecektir</p>
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
            <div className="flex justify-between items-center border-b border-gray-200 px-2 py-4">
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
                    <p className="text-sm font-medium text-gray-500">Stok Kodu</p>
                    <p className="text-base text-gray-900 font-mono bg-gray-50 px-2 py-1 rounded">
                      {selectedRequest.stok_kodu || '-'}
                    </p>
                  </div>
                  {selectedRequest.stok_adi && (
                    <div className="col-span-2">
                      <p className="text-sm font-medium text-gray-500">Stok Adı</p>
                      <p className="text-base text-gray-900">{selectedRequest.stok_adi}</p>
                    </div>
                  )}
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
                    <p className="text-base text-gray-900">{parseFloat(selectedRequest.cap)} mm</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Ürün Tipi</p>
                    <p className="text-base text-gray-900">
                      {selectedRequest.product_type === 'BALYA' ? 'Balya Teli' : 'Tavlı Tel'}
                    </p>
                  </div>
                  {selectedRequest.yaglama_tipi && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Yağlama Tipi</p>
                      <p className="text-base text-gray-900">{selectedRequest.yaglama_tipi}</p>
                    </div>
                  )}
                  {!selectedRequest.yaglama_tipi && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Yağlama Tipi</p>
                      <p className="text-base text-gray-900">Yağsız (No Oil)</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-500">Mukavemet</p>
                    <p className="text-base text-gray-900">{parseFloat(selectedRequest.min_mukavemet)} - {parseFloat(selectedRequest.max_mukavemet)} MPa</p>
                  </div>
                </div>
                
                {/* Right column - Additional details */}
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Ağırlık</p>
                    <p className="text-base text-gray-900">{parseFloat(selectedRequest.kg)} kg</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">İç Çap</p>
                    <p className="text-base text-gray-900">{parseFloat(selectedRequest.ic_cap)} cm</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Dış Çap</p>
                    <p className="text-base text-gray-900">{parseFloat(selectedRequest.dis_cap)} cm</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Tolerans</p>
                    <p className="text-base text-gray-900">
                      {(() => {
                        // Apply mathematical correction to display tolerance values correctly
                        const plusValue = parseFloat(selectedRequest.tolerans_plus) || 0;
                        const minusValue = parseFloat(selectedRequest.tolerans_minus) || 0;
                        const maxSign = selectedRequest.tolerans_max_sign || '+';
                        const minSign = selectedRequest.tolerans_min_sign || '-';
                        
                        // Apply signs to get actual values
                        const actualPlusValue = maxSign === '-' ? -Math.abs(plusValue) : Math.abs(plusValue);
                        const actualMinusValue = minSign === '-' ? -Math.abs(minusValue) : Math.abs(minusValue);
                        
                        // Determine which is mathematically higher/lower
                        const higherValue = Math.max(actualPlusValue, actualMinusValue);
                        const lowerValue = Math.min(actualPlusValue, actualMinusValue);
                        
                        // Format with proper signs - remove trailing zeros by using parseFloat
                        const lowerText = lowerValue >= 0 ? `+${parseFloat(lowerValue.toFixed(2))}` : parseFloat(lowerValue.toFixed(2));
                        const higherText = higherValue >= 0 ? `+${parseFloat(higherValue.toFixed(2))}` : parseFloat(higherValue.toFixed(2));

                        return `${lowerText} mm / ${higherText} mm`;
                      })()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Paketleme Seçenekleri</p>
                    <div className="text-base text-gray-900">
                      {(() => {
                        const packaging = [];
                        // Extract packaging info from stok_adi if available
                        if (selectedRequest.stok_adi) {
                          if (selectedRequest.stok_adi.includes('-Shrink')) packaging.push('Shrink');
                          if (selectedRequest.stok_adi.includes('-Plt')) packaging.push('Paletli');
                          if (selectedRequest.stok_adi.includes('-Krtn')) packaging.push('Karton');
                        }
                        return packaging.length > 0 ? packaging.join(', ') : '-';
                      })()}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Unwinding</p>
                    <p className="text-base text-gray-900">{selectedRequest.unwinding || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Bağ Miktarı</p>
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

              {/* Change tracking information - show if there are any changes recorded */}
              {(selectedRequest.change_summary || selectedRequest.changed_fields || selectedRequest.original_stok_adi !== selectedRequest.final_stok_adi) && (
                <div className="mt-6">
                  <p className="text-sm font-medium text-gray-500">Üretim Ekibi Tarafından Yapılan Değişiklikler</p>
                  <div className="mt-2 p-4 bg-green-50 rounded-md border border-green-200">
                    {selectedRequest.change_summary && selectedRequest.change_summary !== 'Değişiklik yok' ? (
                      <p className="text-base text-green-900 mb-2">{selectedRequest.change_summary}</p>
                    ) : null}
                    
                    {selectedRequest.original_stok_adi && selectedRequest.final_stok_adi && 
                     selectedRequest.original_stok_adi !== selectedRequest.final_stok_adi && (
                      <div className="space-y-1 text-sm">
                        <p className="text-green-700"><strong>Orijinal Ürün:</strong> {selectedRequest.original_stok_adi}</p>
                        <p className="text-green-700"><strong>Son Ürün:</strong> {selectedRequest.final_stok_adi}</p>
                      </div>
                    )}
                    
                    {!selectedRequest.change_summary && !selectedRequest.original_stok_adi && (
                      <p className="text-base text-green-900">Bu talep üretim ekibi tarafından düzenlenmiştir.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="border-t border-gray-200 px-2 py-4 flex justify-end">
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
                <span className="font-semibold">{requestToDelete.cap}mm {requestToDelete.product_type} {requestToDelete.yaglama_tipi && `(${requestToDelete.yaglama_tipi})`}</span> talebini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
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
      
      {/* Product Search Modal */}
      {showProductSearchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center border-b border-gray-200 px-2 py-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Mevcut Ürünler
              </h3>
              <button 
                onClick={() => setShowProductSearchModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-auto">
              {/* Search and Filters */}
              <div className="mb-6 space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <label htmlFor="productSearch" className="block text-sm font-medium text-gray-700 mb-1">Ara</label>
                    <div className="relative">
                      <input
                        type="text"
                        id="productSearch"
                        value={productSearchQuery}
                        onChange={(e) => setProductSearchQuery(e.target.value)}
                        placeholder="Stok kodu, stok adı veya çap ile ara..."
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
                    <label htmlFor="filterCap" className="block text-sm font-medium text-gray-700 mb-1">Çap (mm)</label>
                    <input
                      type="text"
                      id="filterCap"
                      value={productFilter.cap}
                      onChange={(e) => setProductFilter({ ...productFilter, cap: e.target.value })}
                      placeholder="Örn: 2.50"
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="filterKod2" className="block text-sm font-medium text-gray-700 mb-1">Kaplama Türü</label>
                    <select
                      id="filterKod2"
                      value={productFilter.product_type}
                      onChange={(e) => setProductFilter({ ...productFilter, product_type: e.target.value })}
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="all">Tümü</option>
                      <option value="NIT">NIT</option>
                      <option value="PAD">PAD</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="filterKaplama" className="block text-sm font-medium text-gray-700 mb-1">Kaplama (g/m²)</label>
                    <input
                      type="text"
                      id="filterKaplama"
                      value={productFilter.yaglama_tipi}
                      onChange={(e) => setProductFilter({ ...productFilter, yaglama_tipi: e.target.value })}
                      placeholder="Örn: 100"
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                {(productSearchQuery || productFilter.cap || productFilter.product_type !== 'all' || productFilter.yaglama_tipi !== 'all') && (
                  <button
                    onClick={() => {
                      setProductSearchQuery('');
                      setProductFilter({ cap: '', product_type: 'all', yaglama_tipi: 'all' });
                    }}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Filtreleri Temizle
                  </button>
                )}
              </div>
              
              {/* Products Table */}
              {isLoadingProducts ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
                </div>
              ) : getFilteredProducts().length === 0 ? (
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                  <svg className="w-12 h-12 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p className="mt-4 text-gray-600">
                    {productSearchQuery || productFilter.cap || productFilter.product_type !== 'all' || productFilter.yaglama_tipi !== 'all'
                      ? 'Arama kriterlerine uygun ürün bulunamadı.'
                      : 'Henüz kayıtlı ürün bulunmamaktadır.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stok Kodu</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stok Adı</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Çap</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ürün Tipi</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mukavemet</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ağırlık</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {getFilteredProducts().map((product, index) => (
                        <tr key={product.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-2 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {product.stok_kodu}
                          </td>
                          <td className="px-2 py-4 text-sm text-gray-500">
                            {product.stok_adi}
                          </td>
                          <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500">
                            {product.cap} mm
                          </td>
                          <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500">
                            {product.product_type === 'BALYA' ? 'Balya Teli' : 'Tavlı Tel'}
                            {product.yaglama_tipi && (
                              <span className="text-xs ml-1">({product.yaglama_tipi})</span>
                            )}
                          </td>
                          <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500">
                            {product.min_mukavemet} - {product.max_mukavemet} MPa
                          </td>
                          <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500">
                            {product.kg} kg
                          </td>
                          <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => {
                                  setSelectedProduct(product);
                                  setShowProductDetailsModal(true);
                                }}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                Detay
                              </button>
                              <button
                                onClick={() => copyStokKodu(product.stok_kodu)}
                                className="text-green-600 hover:text-green-800"
                              >
                                Kopyala
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              
              <div className="mt-4 text-sm text-gray-500">
                Toplam {getFilteredProducts().length} ürün bulundu
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Product Details Modal */}
      {showProductDetailsModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
            <div className="flex justify-between items-center border-b border-gray-200 px-2 py-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Ürün Detayları
              </h3>
              <button 
                onClick={() => setShowProductDetailsModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Stok Kodu</p>
                    <p className="text-lg font-semibold text-gray-900">{selectedProduct.stok_kodu}</p>
                  </div>
                  <button
                    onClick={() => copyStokKodu(selectedProduct.stok_kodu)}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm leading-5 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:border-blue-300 focus:ring-blue"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Stok Kodunu Kopyala
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Stok Adı</p>
                    <p className="text-base text-gray-900">{selectedProduct.stok_adi}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Tel Çapı</p>
                    <p className="text-base text-gray-900">{parseFloat(selectedProduct.cap)} mm</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Kaplama</p>
                    <p className="text-base text-gray-900">{selectedProduct.product_type} {selectedProduct.yaglama_tipi && `(${selectedProduct.yaglama_tipi})`}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Mukavemet</p>
                    <p className="text-base text-gray-900">{selectedProduct.min_mukavemet} - {selectedProduct.max_mukavemet} MPa</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Ağırlık</p>
                    <p className="text-base text-gray-900">{selectedProduct.kg} kg</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">İç Çap</p>
                    <p className="text-base text-gray-900">{selectedProduct.ic_cap} cm</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Dış Çap</p>
                    <p className="text-base text-gray-900">{selectedProduct.dis_cap} cm</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Tolerans</p>
                    <p className="text-base text-gray-900">+{selectedProduct.tolerans_plus} / -{selectedProduct.tolerans_minus} mm</p>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-500">Paketleme Seçenekleri</p>
                  <div className="text-base text-gray-900">
                    {(() => {
                      const packaging = [];
                      // Extract packaging info from stok_adi
                      if (selectedProduct.stok_adi) {
                        if (selectedProduct.stok_adi.includes('-Shrink')) packaging.push('Shrink');
                        if (selectedProduct.stok_adi.includes('-Plt')) packaging.push('Paletli');
                        if (selectedProduct.stok_adi.includes('-Krtn')) packaging.push('Karton');
                      }
                      // Fallback to shrink field if no packaging suffixes found
                      if (packaging.length === 0 && selectedProduct.shrink) {
                        packaging.push(selectedProduct.shrink === 'evet' || selectedProduct.shrink === 'Yes' ? 'Shrink' : 'Shrink Yok');
                      }
                      return packaging.length > 0 ? packaging.join(', ') : '-';
                    })()}
                  </div>
                </div>
                {selectedProduct.shrink && (
                  <div style={{display: 'none'}}>
                    <p className="text-sm font-medium text-gray-500">Shrink (Legacy)</p>
                    <p className="text-base text-gray-900">{selectedProduct.shrink}</p>
                  </div>
                )}
                
                {selectedProduct.unwinding && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Unwinding</p>
                    <p className="text-base text-gray-900">{selectedProduct.unwinding}</p>
                  </div>
                )}
                
                {selectedProduct.cast_kont && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Bağ Miktarı</p>
                    <p className="text-base text-gray-900">{selectedProduct.cast_kont}</p>
                  </div>
                )}
              </div>
              
              <div className="mt-6 bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Not:</strong> Bu ürünü talep etmek için stok kodunu kopyalayıp üretim ekibine WhatsApp veya e-posta ile iletebilirsiniz.
                </p>
              </div>
            </div>
            
            <div className="border-t border-gray-200 px-2 py-4 flex justify-end">
              <button
                onClick={() => setShowProductDetailsModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Duplicate Product Warning Modal */}
      {showDuplicateWarning && duplicateProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-center text-yellow-600 mb-4">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-center text-gray-900 mb-4">
                {duplicateProduct.source === 'product_database' ? 'Bu Ürün Zaten Mevcut!' : 'Bu Ürün İçin Talep Var!'}
              </h3>
              <p className="text-center text-gray-700 mb-6">
                {duplicateProduct.message}
              </p>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  {duplicateProduct.source === 'product_database' ? 'Mevcut Ürün Bilgileri:' : 'Mevcut Talep Bilgileri:'}
                </p>
                <div className="space-y-2">
                  {duplicateProduct.source === 'product_database' && (
                    <p className="text-sm">
                      <span className="font-medium">Stok Kodu:</span> {duplicateProduct.stok_kodu}
                    </p>
                  )}
                  <p className="text-sm">
                    <span className="font-medium">Stok Adı:</span> {duplicateProduct.stok_adi}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Özellikler:</span> {duplicateProduct.cap}mm, {duplicateProduct.product_type} {duplicateProduct.yaglama_tipi && `(${duplicateProduct.yaglama_tipi})`}, {duplicateProduct.min_mukavemet}-{duplicateProduct.max_mukavemet} MPa, {duplicateProduct.kg}kg
                  </p>
                  {duplicateProduct.source === 'pending_request' && (
                    <>
                      <p className="text-sm">
                        <span className="font-medium">Talep Durumu:</span> {getStatusText(duplicateProduct.request_status)}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Talep Tarihi:</span> {new Date(duplicateProduct.created_at).toLocaleString('tr-TR')}
                      </p>
                    </>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col space-y-3">
                {duplicateProduct.source === 'product_database' && (
                  <button
                    onClick={() => {
                      copyStokKodu(duplicateProduct.stok_kodu);
                      setShowDuplicateWarning(false);
                    }}
                    className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Stok Kodunu Kopyala ve Kapat
                  </button>
                )}
                
                {duplicateProduct.source === 'pending_request' && duplicateProduct.request_status === 'silinmis' && (
                  <button
                    onClick={async () => {
                      if (window.confirm('Bu silinmiş talebi yeniden açmak istediğinizden emin misiniz?\n\nTalep "Beklemede" durumuna geçecek ve tekrar işlenebilir hale gelecektir.')) {
                        try {
                          setIsLoading(true);
                          await fetchWithAuth(`${API_URLS.tavliBalyaSalRequests}/${duplicateProduct.request_id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ status: 'pending' })
                          });
                          
                          // Update the duplicate product status
                          setDuplicateProduct(prev => ({ ...prev, request_status: 'pending' }));
                          
                          // Refresh requests list
                          fetchRequests();
                          
                          toast.success('Talep başarıyla yeniden açıldı');
                          setShowDuplicateWarning(false);
                        } catch (error) {
                          console.error('Error reopening request:', error);
                          toast.error('Talep yeniden açılırken hata oluştu');
                        } finally {
                          setIsLoading(false);
                        }
                      }
                    }}
                    disabled={isLoading}
                    className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <svg className="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    )}
                    Talebi Yeniden Aç
                  </button>
                )}
                
                <button
                  onClick={() => setShowDuplicateWarning(false)}
                  className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                >
                  İptal
                </button>
              </div>
              
              <p className="mt-4 text-xs text-center text-gray-500">
                {duplicateProduct.source === 'product_database' 
                  ? 'Bu ürünü talep etmek için stok kodunu kopyalayıp üretim ekibine WhatsApp veya e-posta ile iletebilirsiniz.'
                  : 'Bu ürün için zaten bir talep bulunmaktadır. Lütfen mevcut talebin durumunu kontrol ediniz.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SatisTavliBalyaRequest;