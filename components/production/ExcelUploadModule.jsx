import React, { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader,
  X,
  Download,
  Eye,
  RefreshCw,
  Info,
  Settings
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'react-toastify';
import { API_URLS, fetchWithAuth } from '@/api-config';

const ExcelUploadModule = ({
  onUploadComplete,
  uploadProgress,
  isProcessing,
  sessionId
}) => {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [validationResults, setValidationResults] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [parseProgress, setParseProgress] = useState(null);
  const [headerRowIndex, setHeaderRowIndex] = useState(0);
  const [allSheetData, setAllSheetData] = useState(null);
  const [showColumnMapping, setShowColumnMapping] = useState(false);
  const [columnMappings, setColumnMappings] = useState({});
  const [showSheetSelection, setShowSheetSelection] = useState(false);
  const [availableSheets, setAvailableSheets] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState(null);
  const [workbookData, setWorkbookData] = useState(null);
  const fileInputRef = useRef(null);

  // Expected CSV column mapping based on actual production data
  const EXPECTED_COLUMNS = {
    'S. Tarihi': 'order_date',
    'Firma': 'customer',
    'Stok Kartı': 'stock_code',
    'Hasır cinsi': 'mesh_type',
    'Boy': 'length',
    'En': 'width',
    'Boy çap': 'length_diameter',
    'En çap': 'width_diameter',
    'Boy ara': 'length_spacing',
    'En ara': 'width_spacing',
    'Filiz Ön': 'front_edge',
    'Filiz Arka': 'back_edge',
    'Filiz Sağ': 'right_edge',
    'Filiz Sol': 'left_edge',
    'Birim ağırlık': 'unit_weight',
    'Sipariş miktarı adet': 'order_quantity',
    'stok(adet)': 'stock_quantity',
    'stok(kg)': 'stock_weight',
    'Ü. Kalan': 'remaining_production',
    'Kalan Kg': 'remaining_weight',
    'Boy adet': 'length_pieces',
    'En adet': 'width_pieces'
  };

  // File validation rules
  const FILE_VALIDATION = {
    maxSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ],
    allowedExtensions: ['.xlsx', '.xls', '.csv']
  };


  const handleFileSelect = useCallback((e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      handleFileSelection(files[0]);
    }
  }, []);

  const validateFile = (file) => {
    const errors = [];

    // Check file size
    if (file.size > FILE_VALIDATION.maxSize) {
      errors.push(`Dosya boyutu çok büyük (maksimum ${FILE_VALIDATION.maxSize / 1024 / 1024}MB)`);
    }

    // Check file type
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    if (!FILE_VALIDATION.allowedExtensions.includes(fileExtension)) {
      errors.push(`Desteklenmeyen dosya türü. İzin verilen: ${FILE_VALIDATION.allowedExtensions.join(', ')}`);
    }

    return errors;
  };

  const handleFileSelection = async (file) => {
    const validationErrors = validateFile(file);

    if (validationErrors.length > 0) {
      setValidationResults({
        isValid: false,
        errors: validationErrors,
        warnings: []
      });
      return;
    }

    setUploadedFile(file);
    setValidationResults(null);
    setPreviewData(null);

    // Start parsing preview
    try {
      setParseProgress({ stage: 'reading', message: 'Dosya okunuyor...' });
      const previewData = await parseFilePreview(file);
      setPreviewData(previewData);
      setParseProgress(null);
    } catch (error) {
      console.error('Preview parsing error:', error);
      setValidationResults({
        isValid: false,
        errors: [`Dosya okunamadı: ${error.message}`],
        warnings: []
      });
      setParseProgress(null);
    }
  };

  const parseFilePreview = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          let jsonData;
          let firstSheetName = 'Sheet1';
          let workbook = null;

          // Check if it's a CSV file
          if (file.name.toLowerCase().endsWith('.csv')) {
            // For CSV files, parse with semicolon delimiter
            const text = new TextDecoder('utf-8').decode(e.target.result);
            const lines = text.split('\n').filter(line => line.trim());

            // Parse CSV with semicolon delimiter (common in Turkish/European CSVs)
            jsonData = lines.map(line => {
              // Handle semicolon-delimited CSV
              return line.split(';').map(cell => (cell || '').trim());
            });

            firstSheetName = 'CSV Data';
          } else {
            // For Excel files, use XLSX
            const data = new Uint8Array(e.target.result);
            workbook = XLSX.read(data, { type: 'array', codepage: 65001 }); // UTF-8 support

            // Store workbook for potential sheet selection
            setWorkbookData(workbook);

            // Check if multiple sheets exist
            if (workbook.SheetNames.length > 1) {
              // Show sheet selection dialog
              setAvailableSheets(workbook.SheetNames.map(name => ({
                name,
                rowCount: XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1 }).length
              })));
              setShowSheetSelection(true);
              return; // Don't resolve yet, wait for sheet selection
            }

            firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];

            // Convert to JSON with header row
            jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });
          }

          if (jsonData.length < 2) {
            reject(new Error('Dosya boş veya yeterli veri içermiyor'));
            return;
          }

          // Filter out empty rows and rows with only empty cells
          jsonData = jsonData.filter(row =>
            row && row.some(cell => cell !== '' && cell !== null && cell !== undefined)
          );

          // Store all sheet data for header detection
          setAllSheetData(jsonData);

          // Auto-detect header row (could be row 0 or 1)
          const detectedHeaderRow = detectHeaderRow(jsonData);
          setHeaderRowIndex(detectedHeaderRow);

          const headers = jsonData[detectedHeaderRow];
          const dataRows = jsonData.slice(detectedHeaderRow + 1, detectedHeaderRow + 11); // First 10 rows for preview

          // Clean up headers - remove empty strings
          const cleanHeaders = headers.map(h => (h || '').toString().trim()).filter(h => h !== '');

          // Validate headers
          const validation = validateHeaders(cleanHeaders);

          // Convert preview rows to objects
          const previewRows = dataRows.map(row => {
            const obj = {};
            cleanHeaders.forEach((header, index) => {
              obj[header] = row[index] || '';
            });
            return obj;
          });

          resolve({
            headers: cleanHeaders,
            totalRows: jsonData.length - detectedHeaderRow - 1,
            previewRows,
            validation,
            sheetName: firstSheetName,
            headerRowIndex: detectedHeaderRow,
            allRows: jsonData
          });
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Dosya okuma hatası'));
      reader.readAsArrayBuffer(file);
    });
  };

  // Auto-detect header row by looking for expected column patterns
  const detectHeaderRow = (jsonData) => {
    const expectedPatterns = ['Firma', 'Stok', 'Hasır', 'Boy', 'En', 'Çap', 'S. Tarihi', 'Miktar'];

    for (let rowIndex = 0; rowIndex < Math.min(3, jsonData.length); rowIndex++) {
      const row = jsonData[rowIndex] || [];
      const rowText = row.join(' ').toLowerCase();

      let patternMatches = 0;
      expectedPatterns.forEach(pattern => {
        if (rowText.includes(pattern.toLowerCase())) {
          patternMatches++;
        }
      });

      // If we find at least 3 pattern matches, this is likely the header row
      if (patternMatches >= 3) {
        return rowIndex;
      }
    }

    // Default to first row if no clear header detected
    return 0;
  };

  // Handle header row change
  const handleHeaderRowChange = (newRowIndex) => {
    if (!allSheetData) return;

    setHeaderRowIndex(newRowIndex);

    const headers = allSheetData[newRowIndex];
    const dataRows = allSheetData.slice(newRowIndex + 1, newRowIndex + 11);

    // Clean up headers - remove empty strings
    const cleanHeaders = headers.map(h => (h || '').toString().trim()).filter(h => h !== '');

    const validation = validateHeaders(cleanHeaders);

    const previewRows = dataRows.map(row => {
      const obj = {};
      cleanHeaders.forEach((header, index) => {
        obj[header] = row[index] || '';
      });
      return obj;
    });

    setPreviewData({
      headers: cleanHeaders,
      totalRows: allSheetData.length - newRowIndex - 1,
      previewRows,
      validation,
      sheetName: previewData?.sheetName,
      headerRowIndex: newRowIndex,
      allRows: allSheetData
    });
  };

  // Handle column mapping
  const handleColumnMapping = (excelColumn, systemColumn) => {
    setColumnMappings(prev => {
      const newMappings = { ...prev };
      if (systemColumn === 'none' || systemColumn === '') {
        // Remove mapping if "none" is selected
        delete newMappings[excelColumn];
      } else {
        newMappings[excelColumn] = systemColumn;
      }
      return newMappings;
    });
  };



  const validateHeaders = (headers) => {
    // Updated required columns based on actual CSV structure
    const requiredColumns = ['Firma', 'Stok Kartı', 'Hasır cinsi', 'Sipariş miktarı adet'];
    const recommendedColumns = ['Boy', 'En', 'Boy çap', 'En çap', 'Birim ağırlık', 'Ü. Kalan'];

    const missingRequired = requiredColumns.filter(col => !headers.includes(col));
    const missingRecommended = recommendedColumns.filter(col => !headers.includes(col));
    const extraColumns = headers.filter(col => !Object.keys(EXPECTED_COLUMNS).includes(col));

    const warnings = [];
    const errors = [];

    if (missingRequired.length > 0) {
      errors.push(`Gerekli sütunlar eksik: ${missingRequired.join(', ')}`);
    }

    if (missingRecommended.length > 0) {
      warnings.push(`Önerilen sütunlar eksik: ${missingRecommended.join(', ')}`);
    }

    if (extraColumns.length > 0) {
      warnings.push(`Bilinmeyen sütunlar (göz ardı edilecek): ${extraColumns.join(', ')}`);
    }

    // Check for weight calculation capability
    const hasWeightCalculation = headers.includes('Birim ağırlık') && headers.includes('Sipariş miktarı adet');
    if (!hasWeightCalculation) {
      warnings.push('Ağırlık hesaplaması için Birim ağırlık ve Sipariş miktarı gerekli');
    }

    // Check for filler products detection capability
    const hasFillerDetection = headers.includes('Firma') && headers.includes('Ü. Kalan');
    if (!hasFillerDetection) {
      warnings.push('Dolgu ürünü algılama için Firma ve Ü. Kalan sütunları gerekli');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      requiredColumns,
      foundColumns: headers.filter(col => Object.keys(EXPECTED_COLUMNS).includes(col)),
      missingColumns: missingRequired,
      extraColumns
    };
  };

  const handleProcessFile = async () => {
    if (!uploadedFile || !sessionId) {
      toast.error('Dosya veya oturum seçilmedi');
      return;
    }

    const formData = new FormData();
    formData.append('file', uploadedFile);
    formData.append('session_id', sessionId);
    formData.append('header_row_index', headerRowIndex.toString());
    if (Object.keys(columnMappings).length > 0) {
      formData.append('column_mappings', JSON.stringify(columnMappings));
    }

    try {
      const response = await fetchWithAuth(API_URLS.production.uploadExcel, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        onUploadComplete(result);
        toast.success(`${result.total_products} ürün başarıyla yüklendi`);

        // Reset state
        setUploadedFile(null);
        setPreviewData(null);
        setValidationResults(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(`Yükleme hatası: ${error.message}`);
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setPreviewData(null);
    setValidationResults(null);
    setParseProgress(null);
    setShowColumnMapping(false);
    setColumnMappings({});
    setShowSheetSelection(false);
    setAvailableSheets([]);
    setSelectedSheet(null);
    setWorkbookData(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle sheet selection
  const handleSheetSelection = (sheetName) => {
    if (!workbookData) return;

    try {
      const worksheet = workbookData.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });

      if (jsonData.length < 2) {
        toast.error('Seçilen sayfa boş veya yeterli veri içermiyor');
        return;
      }

      // Filter out empty rows and rows with only empty cells
      const filteredData = jsonData.filter(row =>
        row && row.some(cell => cell !== '' && cell !== null && cell !== undefined)
      );

      // Store all sheet data for header detection
      setAllSheetData(filteredData);

      // Auto-detect header row
      const detectedHeaderRow = detectHeaderRow(filteredData);
      setHeaderRowIndex(detectedHeaderRow);

      const headers = filteredData[detectedHeaderRow];
      const dataRows = filteredData.slice(detectedHeaderRow + 1, detectedHeaderRow + 11);

      // Clean up headers - remove empty strings
      const cleanHeaders = headers.map(h => (h || '').toString().trim()).filter(h => h !== '');

      // Validate headers
      const validation = validateHeaders(cleanHeaders);

      // Convert preview rows to objects
      const previewRows = dataRows.map(row => {
        const obj = {};
        cleanHeaders.forEach((header, index) => {
          obj[header] = row[index] || '';
        });
        return obj;
      });

      setPreviewData({
        headers: cleanHeaders,
        totalRows: filteredData.length - detectedHeaderRow - 1,
        previewRows,
        validation,
        sheetName: sheetName,
        headerRowIndex: detectedHeaderRow,
        allRows: filteredData
      });

      setSelectedSheet(sheetName);
      setShowSheetSelection(false);
      setParseProgress(null);

      toast.success(`"${sheetName}" sayfası seçildi`);

    } catch (error) {
      console.error('Sheet processing error:', error);
      toast.error(`Sayfa işlenirken hata oluştu: ${error.message}`);
    }
  };

  // Auto-detect columns - simplified for essential fields only
  const autoDetectColumns = (headers) => {
    const detected = {};

    console.log('🔍 Auto-detecting columns from headers:', headers);

    headers.forEach((header, index) => {
      const headerClean = String(header || '').trim();
      const headerLower = headerClean.toLowerCase();

      console.log(`Column ${index}: "${headerClean}"`);

      // Essential field detection
      if (headerLower === 'firma') {
        detected.customer = index;
        console.log(`✓ FIRMA detected at column ${index}`);
      } else if (headerLower === 'stok kartı') {
        detected.stock_code = index;
        console.log(`✓ STOK KARTI detected at column ${index}`);
      } else if (headerLower === 'sipariş miktarı adet' || headerLower.includes('sipariş') && headerLower.includes('miktar')) {
        detected.order_quantity = index;
        console.log(`✓ SIPARIŞ MIKTARI detected at column ${index}`);
      } else if (headerLower === 'boy') {
        detected.length = index;
        console.log(`✓ BOY detected at column ${index} (should be E)`);
      } else if (headerLower === 'en') {
        detected.width = index;
        console.log(`✓ EN detected at column ${index} (should be F)`);
      } else if (headerLower === 'birim ağırlık') {
        detected.unit_weight = index;
        console.log(`✓ BIRIM AĞIRLIK detected at column ${index}`);
      } else if (headerLower === 'ü. kalan' || headerLower === 'ü.kalan' || headerLower.includes('kalan') && !headerLower.includes('kg')) {
        detected.remaining_production = index;
        console.log(`✓ Ü. KALAN detected at column ${index} - CRITICAL for production tracking!`);
      }
    });

    // Essential fields for production planning
    const result = {
      customer: detected.customer !== undefined ? detected.customer : -1,
      stock_code: detected.stock_code !== undefined ? detected.stock_code : -1,
      order_quantity: detected.order_quantity !== undefined ? detected.order_quantity : -1,
      length: detected.length !== undefined ? detected.length : -1,
      width: detected.width !== undefined ? detected.width : -1,
      remaining_production: detected.remaining_production !== undefined ? detected.remaining_production : -1,
      unit_weight: detected.unit_weight !== undefined ? detected.unit_weight : -1
    };

    console.log('🎯 Final detected mappings:', result);
    return result;
  };

  const handleShowColumnMapping = () => {
    if (previewData && previewData.headers) {
      const autoDetected = autoDetectColumns(previewData.headers);
      setColumnMappings(autoDetected);
      setShowColumnMapping(true);
    }
  };

  const handleMappingChange = (field, columnIndex) => {
    setColumnMappings({
      ...columnMappings,
      [field]: parseInt(columnIndex)
    });
  };

  const handleConfirmMapping = () => {
    // Check essential required fields including Ü. Kalan for production tracking
    const requiredFields = ['customer', 'stock_code', 'order_quantity', 'length', 'width', 'remaining_production'];
    const missingFields = requiredFields.filter(field => columnMappings[field] === -1);

    if (missingFields.length > 0) {
      const fieldNames = {
        customer: 'Firma',
        stock_code: 'Stok Kartı',
        order_quantity: 'Sipariş Miktarı',
        length: 'Boy',
        width: 'En',
        remaining_production: 'Ü. Kalan'
      };
      const missingNames = missingFields.map(f => fieldNames[f]).join(', ');
      alert(`Lütfen şu gerekli alanları seçin: ${missingNames}`);
      return;
    }

    setShowColumnMapping(false);
    // Process with confirmed mapping
    // onUploadComplete would handle the actual processing
  };

  const downloadTemplate = () => {
    // Create template Excel file based on actual CSV structure
    const templateData = [
      Object.keys(EXPECTED_COLUMNS),
      [
        '2024-01-15', // S. Tarihi
        'ÖRNEK FİRMA', // Firma
        'STOK001', // Stok Kartı
        'Q188 15x15 Ø4.5', // Hasır cinsi
        '300', // Boy
        '200', // En
        '4.5', // Boy çap
        '4.5', // En çap
        '15', // Boy ara
        '15', // En ara
        '10', // Filiz Ön
        '10', // Filiz Arka
        '10', // Filiz Sağ
        '10', // Filiz Sol
        '12.5', // Birim ağırlık
        '10', // Sipariş miktarı adet
        '10', // stok(adet)
        '125.0', // stok(kg)
        '5', // Ü. Kalan
        '62.5', // Kalan Kg
        '20', // Boy adet
        '15' // En adet
      ]
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(templateData);
    XLSX.utils.book_append_sheet(wb, ws, 'Üretim Verileri');
    XLSX.writeFile(wb, 'uretim_verileri_template.xlsx');
  };

  return (
    <div className="excel-upload-wrapper">
    <Card className="excel-upload-module">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Excel Dosyası Yükle
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={downloadTemplate}
            className="text-xs"
          >
            <Download className="h-3 w-3 mr-1" />
            Şablon İndir
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Upload Button */}
        <div className="flex flex-wrap gap-3 mb-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-2 rounded-md flex items-center gap-2 transition-colors bg-gray-600 text-white hover:bg-gray-700"
            disabled={isProcessing}
          >
            <Upload size={16} />
            Excel/CSV Yükle
          </button>

          {uploadedFile && (
            <button
              onClick={handleRemoveFile}
              className="px-3 py-2 rounded-md flex items-center gap-2 transition-colors bg-red-500 text-white hover:bg-red-600"
            >
              <X size={16} />
              Dosyayı Kaldır
            </button>
          )}
        </div>

        {uploadedFile && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <FileSpreadsheet className="h-8 w-8 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-green-900 truncate" title={uploadedFile.name}>
                  📄 {uploadedFile.name}
                </p>
                <div className="flex items-center gap-4 text-sm text-green-700 mt-1">
                  <span>💾 {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                  <span>📋 {uploadedFile.type ? uploadedFile.type.split('/').pop().toUpperCase() : 'Excel/CSV'}</span>
                  <span>📅 {new Date(uploadedFile.lastModified).toLocaleDateString('tr-TR')}</span>
                </div>
              </div>
              <div className="flex-shrink-0">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        {/* Parse Progress */}
        {parseProgress && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Loader className="h-4 w-4 animate-spin" />
              <span className="text-sm">{parseProgress.message}</span>
            </div>
          </div>
        )}

        {/* Upload Progress */}
        {uploadProgress && (
          <div className="space-y-2">
            <Progress value={uploadProgress.percentage} />
            <p className="text-sm text-gray-600">{uploadProgress.message}</p>
          </div>
        )}

        {/* Validation Results */}
        {validationResults && (
          <div className="space-y-2">
            {validationResults.errors.length > 0 && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc list-inside">
                    {validationResults.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            {validationResults.warnings.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc list-inside">
                    {validationResults.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Preview Data */}
        {previewData && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Dosya Önizlemesi</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                <Eye className="h-3 w-3 mr-1" />
                {showPreview ? 'Gizle' : 'Göster'}
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Badge variant="outline">
                  Toplam Satır: {previewData.totalRows}
                </Badge>
              </div>
              <div>
                <Badge variant="outline">
                  Sayfa: {previewData.sheetName}
                </Badge>
              </div>
            </div>

            {/* Validation Summary */}
            {previewData.validation && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3 text-xs">
                  <div className="p-3 bg-green-50 rounded-lg">
                    <span className="font-medium text-green-700 block mb-1">
                      ✓ Bulunan Sütunlar ({previewData.validation.foundColumns.length}):
                    </span>
                    <div className="text-green-600 flex flex-wrap gap-1">
                      {previewData.validation.foundColumns.map((col, idx) => (
                        <span key={idx} className="bg-green-100 px-2 py-1 rounded text-xs">
                          {col}
                        </span>
                      ))}
                    </div>
                  </div>
                  {previewData.validation.missingColumns.length > 0 && (
                    <div className="p-3 bg-red-50 rounded-lg">
                      <span className="font-medium text-red-700 block mb-1">
                        ⚠ Eksik Gerekli Sütunlar ({previewData.validation.missingColumns.length}):
                      </span>
                      <div className="text-red-600 flex flex-wrap gap-1">
                        {previewData.validation.missingColumns.map((col, idx) => (
                          <span key={idx} className="bg-red-100 px-2 py-1 rounded text-xs">
                            {col}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Header Row Selector */}
            {allSheetData && allSheetData.length > 1 && (
              <div className="space-y-2 p-3 bg-blue-50 rounded-lg">
                <Label htmlFor="header-row-select" className="text-sm font-medium text-blue-800">
                  📋 Başlık Satırı Seçimi:
                </Label>
                <p className="text-xs text-blue-600 mb-2">
                  Sütun başlıklarının bulunduğu satırı seçin
                </p>
                <Select value={headerRowIndex.toString()} onValueChange={(value) => handleHeaderRowChange(parseInt(value))}>
                  <SelectTrigger className="w-full border-blue-200">
                    <SelectValue placeholder="Başlık satırını seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {allSheetData.slice(0, 5).map((row, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        <div className="flex items-center">
                          <span className="font-medium mr-2">Satır {index + 1}:</span>
                          <span className="text-gray-600 truncate max-w-[300px]">
                            {row.slice(0, 4).map(cell => String(cell || '').substring(0, 15)).join(' | ')}
                            {row.length > 4 && '...'}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Column Mapping Controls */}
            {previewData && previewData.headers && (
              <div className="space-y-3 p-3 bg-gray-50 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-700">🔗 Sütun Eşleştirme</span>
                    <p className="text-xs text-gray-500 mt-1">Sistem alanları ile Excel sütunlarını eşleştirin</p>
                  </div>
                  <button
                    onClick={handleShowColumnMapping}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    Sütunları Eşleştir
                  </button>
                </div>
                {Object.keys(columnMappings).length > 0 && (
                  <div className="flex items-center gap-2 p-2 bg-green-50 rounded border border-green-200">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-700 font-medium">
                      Sütun eşleştirmesi yapıldı ({Object.keys(columnMappings).length} alan)
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Preview Table */}
            {showPreview && previewData.previewRows && (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-3 py-2 border-b">
                  <h4 className="text-sm font-medium text-gray-700">Veri Önizlemesi</h4>
                  <p className="text-xs text-gray-500">İlk {previewData.previewRows.length} satır gösteriliyor</p>
                </div>
                <div className="overflow-x-auto max-h-64">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        {previewData.headers.slice(0, 10).map((header, index) => (
                          <th key={index} className="px-3 py-2 text-left border-r font-medium text-gray-700 min-w-[100px]">
                            <div className="truncate" title={header || `Sütun ${index + 1}`}>
                              {header || `Sütun ${index + 1}`}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.previewRows.slice(0, 10).map((row, rowIndex) => (
                        <tr key={rowIndex} className="hover:bg-gray-50 border-b">
                          {previewData.headers.slice(0, 10).map((header, colIndex) => (
                            <td key={colIndex} className="px-3 py-2 border-r text-gray-600 min-w-[100px]">
                              <div className="truncate" title={String(row[header] || '')}>
                                {String(row[header] || '').substring(0, 15)}
                                {String(row[header] || '').length > 15 && '...'}
                              </div>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {previewData.headers.length > 10 && (
                  <div className="p-3 text-center text-gray-500 text-xs bg-gray-50 border-t">
                    +{previewData.headers.length - 10} sütun daha var (toplam {previewData.headers.length} sütun)
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleProcessFile}
            disabled={!uploadedFile || isProcessing || !sessionId}
            className="flex-1"
          >
            {isProcessing ? (
              <>
                <Loader className="h-4 w-4 animate-spin mr-2" />
                İşleniyor...
              </>
            ) : (
              'Dosyayı İşle ve Yükle'
            )}
          </Button>

          {uploadedFile && (
            <Button
              variant="outline"
              onClick={() => setShowPreview(!showPreview)}
              disabled={!previewData}
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Help Text */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>• Excel dosyası Üretim Takip formatında olmalıdır</p>
          <p>• Dolgu ürünleri: Firma sütunu boş VEYA ALBAYRAK MÜŞTERİ + Ü.Kalan = 0</p>
          <p>• Gerekli sütunlar: Firma, Stok Kartı, Hasır cinsi, Sipariş miktarı adet</p>
          <p>• Ağırlık hesaplaması için: Birim ağırlık × Sipariş miktarı kullanılır</p>
          <p>• Önerilen sütunlar: Boy, En, Boy çap, En çap, Birim ağırlık, Ü. Kalan</p>
        </div>
      </CardContent>
    </Card>

    {/* Column Mapping Modal - Exact CelikHasir Design */}
    {showColumnMapping && previewData && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-5xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Sütunları Eşleştir</h2>
            <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-md font-medium">
              {previewData.previewRows?.length || 0} satır tespit edildi
            </span>
          </div>

          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-2">
              Sütunlar otomatik olarak tespit edilmeye çalışıldı. Lütfen kontrol edin ve gerekirse düzeltin:
            </p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* Essential Fields Only */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Firma <span className="text-red-500">*</span>
                  {columnMappings.customer !== -1 && <span className="text-green-600 text-xs ml-2">✓ Tespit edildi</span>}
                </label>
                <select
                  className={`w-full border rounded-md p-2 ${columnMappings.customer !== -1 ? 'border-green-300 bg-green-50' : 'border-gray-300'}`}
                  value={columnMappings.customer || -1}
                  onChange={(e) => handleMappingChange('customer', e.target.value)}
                >
                  <option value="-1">Seçiniz</option>
                  {previewData.headers.map((header, index) => (
                    <option key={index} value={index}>
                      {header || `Sütun ${index + 1}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stok Kartı <span className="text-red-500">*</span>
                  {columnMappings.stock_code !== -1 && <span className="text-green-600 text-xs ml-2">✓ Tespit edildi</span>}
                </label>
                <select
                  className={`w-full border rounded-md p-2 ${columnMappings.stock_code !== -1 ? 'border-green-300 bg-green-50' : 'border-gray-300'}`}
                  value={columnMappings.stock_code || -1}
                  onChange={(e) => handleMappingChange('stock_code', e.target.value)}
                >
                  <option value="-1">Seçiniz</option>
                  {previewData.headers.map((header, index) => (
                    <option key={index} value={index}>
                      {header || `Sütun ${index + 1}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sipariş Miktarı <span className="text-red-500">*</span>
                  {columnMappings.order_quantity !== -1 && <span className="text-green-600 text-xs ml-2">✓ Tespit edildi</span>}
                </label>
                <select
                  className={`w-full border rounded-md p-2 ${columnMappings.order_quantity !== -1 ? 'border-green-300 bg-green-50' : 'border-gray-300'}`}
                  value={columnMappings.order_quantity || -1}
                  onChange={(e) => handleMappingChange('order_quantity', e.target.value)}
                >
                  <option value="-1">Seçiniz</option>
                  {previewData.headers.map((header, index) => (
                    <option key={index} value={index}>
                      {header || `Sütun ${index + 1}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Boy <span className="text-red-500">*</span>
                  {columnMappings.length !== -1 && <span className="text-green-600 text-xs ml-2">✓ Tespit edildi</span>}
                </label>
                <select
                  className={`w-full border rounded-md p-2 ${columnMappings.length !== -1 ? 'border-green-300 bg-green-50' : 'border-gray-300'}`}
                  value={columnMappings.length || -1}
                  onChange={(e) => handleMappingChange('length', e.target.value)}
                >
                  <option value="-1">Seçiniz</option>
                  {previewData.headers.map((header, index) => (
                    <option key={index} value={index}>
                      {header || `Sütun ${index + 1}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  En <span className="text-red-500">*</span>
                  {columnMappings.width !== -1 && <span className="text-green-600 text-xs ml-2">✓ Tespit edildi</span>}
                </label>
                <select
                  className={`w-full border rounded-md p-2 ${columnMappings.width !== -1 ? 'border-green-300 bg-green-50' : 'border-gray-300'}`}
                  value={columnMappings.width || -1}
                  onChange={(e) => handleMappingChange('width', e.target.value)}
                >
                  <option value="-1">Seçiniz</option>
                  {previewData.headers.map((header, index) => (
                    <option key={index} value={index}>
                      {header || `Sütun ${index + 1}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ü. Kalan <span className="text-red-500">*</span>
                  {columnMappings.remaining_production !== -1 && <span className="text-green-600 text-xs ml-2">✓ Tespit edildi</span>}
                </label>
                <select
                  className={`w-full border rounded-md p-2 ${columnMappings.remaining_production !== -1 ? 'border-green-300 bg-green-50' : 'border-gray-300'}`}
                  value={columnMappings.remaining_production || -1}
                  onChange={(e) => handleMappingChange('remaining_production', e.target.value)}
                >
                  <option value="-1">Seçiniz</option>
                  {previewData.headers.map((header, index) => (
                    <option key={index} value={index}>
                      {header || `Sütun ${index + 1}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Birim Ağırlık
                  {columnMappings.unit_weight !== -1 && <span className="text-green-600 text-xs ml-2">✓ Tespit edildi</span>}
                </label>
                <select
                  className={`w-full border rounded-md p-2 ${columnMappings.unit_weight !== -1 ? 'border-green-300 bg-green-50' : 'border-gray-300'}`}
                  value={columnMappings.unit_weight || -1}
                  onChange={(e) => handleMappingChange('unit_weight', e.target.value)}
                >
                  <option value="-1">Seçiniz</option>
                  {previewData.headers.map((header, index) => (
                    <option key={index} value={index}>
                      {header || `Sütun ${index + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Preview Table with Column Indicators */}
          <div className="border rounded-lg overflow-x-auto mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  {previewData.headers.map((header, index) => (
                    <th key={index} className="py-1 px-2 border-b text-left font-medium text-gray-500 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="truncate max-w-[120px]" title={header || `Sütun ${index + 1}`}>
                          {header || `Sütun ${index + 1}`}
                        </span>
                        {columnMappings.customer === index && (
                          <span className="text-green-600 text-[10px] font-bold">(Firma *)</span>
                        )}
                        {columnMappings.stock_code === index && (
                          <span className="text-green-600 text-[10px] font-bold">(Stok Kartı *)</span>
                        )}
                        {columnMappings.order_quantity === index && (
                          <span className="text-green-600 text-[10px] font-bold">(Sipariş Miktarı *)</span>
                        )}
                        {columnMappings.length === index && (
                          <span className="text-green-600 text-[10px] font-bold">(Boy *)</span>
                        )}
                        {columnMappings.width === index && (
                          <span className="text-green-600 text-[10px] font-bold">(En *)</span>
                        )}
                        {columnMappings.remaining_production === index && (
                          <span className="text-green-600 text-[10px] font-bold">(Ü. Kalan *)</span>
                        )}
                        {columnMappings.unit_weight === index && (
                          <span className="text-blue-600 text-[10px]">(Birim Ağırlık)</span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.previewRows.slice(0, 5).map((row, rowIndex) => (
                  <tr key={rowIndex} className="hover:bg-gray-50">
                    {previewData.headers.map((header, colIndex) => (
                      <td key={colIndex} className="px-2 py-1 border-b">
                        {String(row[header] || '').substring(0, 20)}
                        {String(row[header] || '').length > 20 && '...'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between">
            <button
              onClick={() => setShowColumnMapping(false)}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
            >
              İptal
            </button>
            <button
              onClick={handleConfirmMapping}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Eşleştirmeyi Onayla
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Sheet Selection Modal */}
    {showSheetSelection && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">📋 Sayfa Seçimi</h2>
            <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-md font-medium">
              {availableSheets.length} sayfa bulundu
            </span>
          </div>

          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-4">
              Excel dosyanızda birden fazla sayfa bulundu. Üretim verilerini içeren sayfayı seçin:
            </p>

            <div className="grid grid-cols-1 gap-3">
              {availableSheets.map((sheet, index) => (
                <div
                  key={index}
                  onClick={() => handleSheetSelection(sheet.name)}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        <FileSpreadsheet className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{sheet.name}</h3>
                        <p className="text-sm text-gray-500">
                          {sheet.rowCount} satır veri
                        </p>
                      </div>
                    </div>
                    <div className="text-blue-600 text-sm font-medium">
                      Seç →
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between">
            <button
              onClick={() => {
                setShowSheetSelection(false);
                handleRemoveFile();
              }}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
            >
              ✕ İptal
            </button>
            <div className="text-xs text-gray-500">
              Lütfen bir sayfa seçin
            </div>
          </div>
        </div>
      </div>
    )}

    </div>
  );
};

export default ExcelUploadModule;