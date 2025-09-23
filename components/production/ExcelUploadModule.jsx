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
  Info
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
  const fileInputRef = useRef(null);

  // Expected CSV column mapping based on analysis
  const EXPECTED_COLUMNS = {
    'S. Tarihi': 'scheduled_date',
    'Firma': 'customer',
    'Stok Kartı': 'stock_code',
    'Stok Adı': 'stock_name',
    'Hasır Tipi': 'hasir_tipi',
    'Boy': 'boy',
    'En': 'en',
    'Çap': 'cap',
    'Ağırlık (KG)': 'weight_kg',
    'Miktar': 'quantity',
    'Birim': 'unit',
    'Kalan': 'remaining',
    'Ü. Kalan': 'uretim_kalan',
    'Kalan KG': 'kalan_kg',
    'Teslim Tarihi': 'delivery_date',
    'Sipariş No': 'order_number',
    'Müşteri Siparişi': 'customer_order'
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
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });

          // Get first sheet
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];

          // Convert to JSON with header row
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          if (jsonData.length < 2) {
            reject(new Error('Dosya boş veya yeterli veri içermiyor'));
            return;
          }

          // Store all sheet data for header detection
          setAllSheetData(jsonData);

          // Auto-detect header row (could be row 0 or 1)
          const detectedHeaderRow = detectHeaderRow(jsonData);
          setHeaderRowIndex(detectedHeaderRow);

          const headers = jsonData[detectedHeaderRow];
          const dataRows = jsonData.slice(detectedHeaderRow + 1, detectedHeaderRow + 6); // First 5 rows for preview

          // Validate headers
          const validation = validateHeaders(headers);

          // Convert preview rows to objects
          const previewRows = dataRows.map(row => {
            const obj = {};
            headers.forEach((header, index) => {
              obj[header] = row[index] || '';
            });
            return obj;
          });

          resolve({
            headers,
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
    const dataRows = allSheetData.slice(newRowIndex + 1, newRowIndex + 6);

    const validation = validateHeaders(headers);

    const previewRows = dataRows.map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || '';
      });
      return obj;
    });

    setPreviewData({
      headers,
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


  // Show column mapping interface if validation fails
  const handleShowColumnMapping = () => {
    if (!previewData) return;

    // Initialize mappings with automatic matches
    const autoMappings = {};
    previewData.headers.forEach(header => {
      const lowerHeader = header.toLowerCase();
      Object.entries(EXPECTED_COLUMNS).forEach(([expectedKey, systemKey]) => {
        if (lowerHeader.includes(expectedKey.toLowerCase()) ||
            expectedKey.toLowerCase().includes(lowerHeader)) {
          autoMappings[header] = expectedKey;
        }
      });
    });

    setColumnMappings(autoMappings);
    setShowColumnMapping(true);
  };

  const validateHeaders = (headers) => {
    const requiredColumns = ['Firma', 'Stok Kartı', 'Hasır Tipi', 'Boy', 'En', 'Çap'];
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));
    const extraColumns = headers.filter(col => !Object.keys(EXPECTED_COLUMNS).includes(col));

    const warnings = [];
    const errors = [];

    if (missingColumns.length > 0) {
      errors.push(`Eksik sütunlar: ${missingColumns.join(', ')}`);
    }

    if (extraColumns.length > 0) {
      warnings.push(`Bilinmeyen sütunlar (göz ardı edilecek): ${extraColumns.join(', ')}`);
    }

    // Check for filler products detection capability
    const hasFillerDetection = headers.includes('Firma') && headers.includes('Ü. Kalan');
    if (!hasFillerDetection) {
      warnings.push('Dolgu ürünü algılama için gerekli sütunlar eksik olabilir');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      requiredColumns,
      foundColumns: headers.filter(col => Object.keys(EXPECTED_COLUMNS).includes(col)),
      missingColumns,
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Auto-detect columns (like CelikHasirHesaplama)
  const autoDetectColumns = (headers) => {
    const detected = {};

    headers.forEach((header, index) => {
      const headerLower = String(header || '').toLowerCase();

      // Auto-detect based on header text
      if (headerLower.includes('tarih') || headerLower.includes('date')) {
        detected.scheduled_date = index;
      } else if (headerLower.includes('firma') || headerLower.includes('customer')) {
        detected.customer = index;
      } else if (headerLower.includes('stok') && headerLower.includes('kod')) {
        detected.stock_code = index;
      } else if (headerLower.includes('stok') && headerLower.includes('ad')) {
        detected.stock_name = index;
      } else if (headerLower.includes('hasır') && headerLower.includes('tip')) {
        detected.mesh_type = index;
      } else if (headerLower.includes('boy') && !headerLower.includes('çap')) {
        detected.length = index;
      } else if (headerLower.includes('en') && !headerLower.includes('çap')) {
        detected.width = index;
      } else if (headerLower.includes('çap') || headerLower.includes('diameter')) {
        detected.diameter = index;
      } else if (headerLower.includes('miktar') || headerLower.includes('quantity')) {
        detected.quantity = index;
      } else if (headerLower.includes('birim') || headerLower.includes('unit')) {
        detected.unit = index;
      }
    });

    // Convert undefined to -1 for undetected columns
    return {
      scheduled_date: detected.scheduled_date !== undefined ? detected.scheduled_date : -1,
      customer: detected.customer !== undefined ? detected.customer : -1,
      stock_code: detected.stock_code !== undefined ? detected.stock_code : -1,
      stock_name: detected.stock_name !== undefined ? detected.stock_name : -1,
      mesh_type: detected.mesh_type !== undefined ? detected.mesh_type : -1,
      length: detected.length !== undefined ? detected.length : -1,
      width: detected.width !== undefined ? detected.width : -1,
      diameter: detected.diameter !== undefined ? detected.diameter : -1,
      quantity: detected.quantity !== undefined ? detected.quantity : -1,
      unit: detected.unit !== undefined ? detected.unit : -1
    };
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
    // Check required fields
    if (columnMappings.customer === -1 || columnMappings.stock_code === -1 || columnMappings.quantity === -1) {
      alert('Lütfen en az Firma, Stok Kodu ve Miktar sütunlarını seçin.');
      return;
    }

    setShowColumnMapping(false);
    // Process with confirmed mapping
    // onUploadComplete would handle the actual processing
  };

  const downloadTemplate = () => {
    // Create template Excel file
    const templateData = [
      Object.keys(EXPECTED_COLUMNS),
      [
        '2024-01-15',
        'ÖRNEK FİRMA',
        'STOK001',
        'Q188 15x15 Ø4.5 200x300',
        'Q',
        '300',
        '200',
        '4.5',
        '125.5',
        '10',
        'adet',
        '10',
        '10',
        '125.5',
        '2024-01-20',
        'SIP001',
        'MSP001'
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
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div className="flex-1">
                <p className="font-medium text-green-900">{uploadedFile.name}</p>
                <p className="text-sm text-green-700">
                  {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB • {uploadedFile.type || 'Bilinmeyen format'}
                </p>
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
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="font-medium text-green-600">
                      Bulunan Sütunlar ({previewData.validation.foundColumns.length}):
                    </span>
                    <div className="text-gray-600">
                      {previewData.validation.foundColumns.join(', ')}
                    </div>
                  </div>
                  {previewData.validation.missingColumns.length > 0 && (
                    <div>
                      <span className="font-medium text-red-600">
                        Eksik Sütunlar ({previewData.validation.missingColumns.length}):
                      </span>
                      <div className="text-gray-600">
                        {previewData.validation.missingColumns.join(', ')}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Header Row Selector */}
            {allSheetData && allSheetData.length > 1 && (
              <div className="space-y-2">
                <Label htmlFor="header-row-select" className="text-sm font-medium">
                  Başlık Satırı (Header Row):
                </Label>
                <Select value={headerRowIndex.toString()} onValueChange={(value) => handleHeaderRowChange(parseInt(value))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Başlık satırını seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {allSheetData.slice(0, 5).map((row, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        Satır {index + 1}: {row.slice(0, 4).join(' | ')}...
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Column Mapping Controls */}
            {previewData && previewData.headers && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Sütun Eşleştirme:</span>
                  <button
                    onClick={handleShowColumnMapping}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Sütunları Eşleştir
                  </button>
                </div>
                {Object.keys(columnMappings).length > 0 && (
                  <div className="text-xs text-green-600">
                    ✓ Sütun eşleştirmesi yapıldı
                  </div>
                )}
              </div>
            )}

            {/* Preview Table */}
            {showPreview && previewData.previewRows && (
              <div className="border rounded-lg overflow-x-auto max-h-64">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      {previewData.headers.slice(0, 8).map((header, index) => (
                        <th key={index} className="px-2 py-1 text-left border-b font-medium">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.previewRows.map((row, rowIndex) => (
                      <tr key={rowIndex} className="hover:bg-gray-50">
                        {previewData.headers.slice(0, 8).map((header, colIndex) => (
                          <td key={colIndex} className="px-2 py-1 border-b">
                            {String(row[header] || '').substring(0, 20)}
                            {String(row[header] || '').length > 20 && '...'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewData.headers.length > 8 && (
                  <div className="p-2 text-center text-gray-500 text-xs">
                    +{previewData.headers.length - 8} sütun daha...
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
          <p>• Gerekli sütunlar: Firma, Stok Kartı, Hasır Tipi, Boy, En, Çap</p>
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
              {/* Required Fields */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Firma <span className="text-red-500">*</span>
                  {columnMappings.customer !== -1 && <span className="text-green-600 text-xs ml-2">✓ Otomatik tespit edildi</span>}
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
                  Stok Kodu <span className="text-red-500">*</span>
                  {columnMappings.stock_code !== -1 && <span className="text-green-600 text-xs ml-2">✓ Otomatik tespit edildi</span>}
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
                  Stok Adı
                  {columnMappings.stock_name !== -1 && <span className="text-green-600 text-xs ml-2">✓ Otomatik tespit edildi</span>}
                </label>
                <select
                  className={`w-full border rounded-md p-2 ${columnMappings.stock_name !== -1 ? 'border-green-300 bg-green-50' : 'border-gray-300'}`}
                  value={columnMappings.stock_name || -1}
                  onChange={(e) => handleMappingChange('stock_name', e.target.value)}
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
                  Miktar <span className="text-red-500">*</span>
                  {columnMappings.quantity !== -1 && <span className="text-green-600 text-xs ml-2">✓ Otomatik tespit edildi</span>}
                </label>
                <select
                  className={`w-full border rounded-md p-2 ${columnMappings.quantity !== -1 ? 'border-green-300 bg-green-50' : 'border-gray-300'}`}
                  value={columnMappings.quantity || -1}
                  onChange={(e) => handleMappingChange('quantity', e.target.value)}
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
                  Birim
                  {columnMappings.unit !== -1 && <span className="text-green-600 text-xs ml-2">✓ Otomatik tespit edildi</span>}
                </label>
                <select
                  className={`w-full border rounded-md p-2 ${columnMappings.unit !== -1 ? 'border-green-300 bg-green-50' : 'border-gray-300'}`}
                  value={columnMappings.unit || -1}
                  onChange={(e) => handleMappingChange('unit', e.target.value)}
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
                  Teslim Tarihi
                  {columnMappings.scheduled_date !== -1 && <span className="text-green-600 text-xs ml-2">✓ Otomatik tespit edildi</span>}
                </label>
                <select
                  className={`w-full border rounded-md p-2 ${columnMappings.scheduled_date !== -1 ? 'border-green-300 bg-green-50' : 'border-gray-300'}`}
                  value={columnMappings.scheduled_date || -1}
                  onChange={(e) => handleMappingChange('scheduled_date', e.target.value)}
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
                          <span className="text-green-600 text-[10px]">(Firma)</span>
                        )}
                        {columnMappings.stock_code === index && (
                          <span className="text-green-600 text-[10px]">(Stok Kodu)</span>
                        )}
                        {columnMappings.stock_name === index && (
                          <span className="text-blue-600 text-[10px]">(Stok Adı)</span>
                        )}
                        {columnMappings.quantity === index && (
                          <span className="text-green-600 text-[10px]">(Miktar)</span>
                        )}
                        {columnMappings.unit === index && (
                          <span className="text-blue-600 text-[10px]">(Birim)</span>
                        )}
                        {columnMappings.scheduled_date === index && (
                          <span className="text-blue-600 text-[10px]">(Tarih)</span>
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

    </div>
  );
};

export default ExcelUploadModule;