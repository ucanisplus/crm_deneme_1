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
  RefreshCw
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
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [validationResults, setValidationResults] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [parseProgress, setParseProgress] = useState(null);
  const [headerRowIndex, setHeaderRowIndex] = useState(0);
  const [showColumnMapping, setShowColumnMapping] = useState(false);
  const [columnMappings, setColumnMappings] = useState({});
  const [allSheetData, setAllSheetData] = useState(null);
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

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelection(files[0]);
    }
  }, []);

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
    setColumnMappings(prev => ({
      ...prev,
      [excelColumn]: systemColumn
    }));
  };

  // Apply column mappings and proceed with upload
  const handleConfirmMapping = () => {
    setShowColumnMapping(false);
    // The mappings will be sent with the file upload
    handleProcessFile();
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
        {/* File Drop Zone */}
        <div
          className={`upload-dropzone border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragActive
              ? 'border-blue-500 bg-blue-50'
              : uploadedFile
                ? 'border-green-500 bg-green-50'
                : 'border-gray-300 hover:border-gray-400'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !uploadedFile && fileInputRef.current?.click()}
        >
          {!uploadedFile ? (
            <div className="space-y-2">
              <FileSpreadsheet className="h-12 w-12 text-gray-400 mx-auto" />
              <p className="text-gray-600">
                Excel dosyasını sürükleyip bırakın veya tıklayın
              </p>
              <p className="text-xs text-gray-500">
                (.xlsx, .xls, .csv - Maksimum 50MB)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <CheckCircle className="h-8 w-8 text-green-500 mx-auto" />
              <p className="font-medium">{uploadedFile.name}</p>
              <p className="text-sm text-gray-600">
                {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
              <Button
                onClick={handleRemoveFile}
                variant="outline"
                size="sm"
                className="mt-2"
              >
                <X className="h-3 w-3 mr-1" />
                Kaldır
              </Button>
            </div>
          )}
        </div>

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
            {previewData.validation && !previewData.validation.isValid && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Sütun Eşleştirme:</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleShowColumnMapping}
                  >
                    Sütunları Eşleştir
                  </Button>
                </div>
                {Object.keys(columnMappings).length > 0 && (
                  <div className="text-xs text-green-600">
                    {Object.keys(columnMappings).length} sütun eşleştirildi
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
            disabled={!uploadedFile || isProcessing || !sessionId ||
              (previewData?.validation && !previewData.validation.isValid)}
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

      {/* Column Mapping Dialog */}
      <Dialog open={showColumnMapping} onOpenChange={setShowColumnMapping}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sütun Eşleştirme</DialogTitle>
          </DialogHeader>

          {previewData && (
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                Excel dosyanızdaki sütunları sistem sütunlarıyla eşleştirin. Otomatik eşleştirme yapılmıştır, gerekirse düzenleyebilirsiniz.
              </div>

              <div className="grid gap-3">
                <div className="grid grid-cols-3 gap-2 text-xs font-medium bg-gray-50 p-2 rounded">
                  <div>Excel Sütunu</div>
                  <div>Sistem Sütunu</div>
                  <div>Örnek Veri</div>
                </div>

                {previewData.headers.map((excelColumn, index) => {
                  const sampleData = previewData.previewRows[0]?.[excelColumn] || '';
                  return (
                    <div key={index} className="grid grid-cols-3 gap-2 items-center p-2 border rounded">
                      <div className="text-sm font-medium">{excelColumn}</div>
                      <div>
                        <Select
                          value={columnMappings[excelColumn] || ''}
                          onValueChange={(value) => handleColumnMapping(excelColumn, value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Sütun seçin..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">-- Eşleştirme --</SelectItem>
                            {Object.keys(EXPECTED_COLUMNS).map(expectedCol => (
                              <SelectItem key={expectedCol} value={expectedCol}>
                                {expectedCol}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="text-xs text-gray-600 truncate" title={String(sampleData)}>
                        {String(sampleData).substring(0, 30)}
                        {String(sampleData).length > 30 && '...'}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between pt-4 border-t">
                <Button variant="outline" onClick={() => setShowColumnMapping(false)}>
                  İptal
                </Button>
                <div className="space-x-2">
                  <Button variant="outline" onClick={() => setColumnMappings({})}>
                    Sıfırla
                  </Button>
                  <Button onClick={handleConfirmMapping}>
                    Eşleştirmeyi Onayla ve Devam Et
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ExcelUploadModule;