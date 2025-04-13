"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Table, 
  Calculator, 
  Upload, 
  Download, 
  FileSpreadsheet, 
  AlertCircle, 
  Check, 
  Info, 
  Trash2, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  Loader,
  Edit3,
  Save,
  Database,
  FileText,
  Plus,
  FileImage,
  CircleX,
  ArrowLeft,
  ArrowUpToLine,
  ArrowDownToLine,
  StickyNote
} from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import axios from 'axios';

// FuzzySearch for better column matching
import Fuse from 'fuse.js';

const CelikHasirHesaplama = () => {
  // Hasır tiplerinin referans verileri
  const hasirReferenceData = {
    // Q Tipi Hasırlar
    "Q106/106": { boyCap: 4.5, enCap: 4.5, boyAralik: 15, enAralik: 15, type: "Q" },
    "Q131/131": { boyCap: 5, enCap: 5, boyAralik: 15, enAralik: 15, type: "Q" },
    "Q158/158": { boyCap: 5.5, enCap: 5.5, boyAralik: 15, enAralik: 15, type: "Q" },
    "Q188/188": { boyCap: 6, enCap: 6, boyAralik: 15, enAralik: 15, type: "Q" },
    "Q221/221": { boyCap: 6.5, enCap: 6.5, boyAralik: 15, enAralik: 15, type: "Q" },
    "Q257/257": { boyCap: 7, enCap: 7, boyAralik: 15, enAralik: 15, type: "Q" },
    "Q295/295": { boyCap: 7.5, enCap: 7.5, boyAralik: 15, enAralik: 15, type: "Q" },
    "Q317/317": { boyCap: 7.8, enCap: 7.8, boyAralik: 15, enAralik: 15, type: "Q" },
    "Q335/335": { boyCap: 8, enCap: 8, boyAralik: 15, enAralik: 15, type: "Q" },
    "Q377/377": { boyCap: 8.5, enCap: 8.5, boyAralik: 15, enAralik: 15, type: "Q" },
    "Q378/378": { boyCap: 8.5, enCap: 8.5, boyAralik: 15, enAralik: 15, type: "Q" },
    "Q389/389": { boyCap: 8.6, enCap: 8.6, boyAralik: 15, enAralik: 15, type: "Q" },
    "Q423/423": { boyCap: 9, enCap: 9, boyAralik: 15, enAralik: 15, type: "Q" },
    "Q424/424": { boyCap: 9, enCap: 9, boyAralik: 15, enAralik: 15, type: "Q" },
    "Q442/442": { boyCap: 9.2, enCap: 9.2, boyAralik: 15, enAralik: 15, type: "Q" },
    "Q443/443": { boyCap: 9.2, enCap: 9.2, boyAralik: 15, enAralik: 15, type: "Q" },
    "Q473/473": { boyCap: 9.5, enCap: 9.5, boyAralik: 15, enAralik: 15, type: "Q" },
    "Q513/513": { boyCap: 9.9, enCap: 9.9, boyAralik: 15, enAralik: 15, type: "Q" },
    "Q524/524": { boyCap: 10, enCap: 10, boyAralik: 15, enAralik: 15, type: "Q" },
    "Q577/577": { boyCap: 10.5, enCap: 10.5, boyAralik: 15, enAralik: 15, type: "Q" },
    "Q588/588": { boyCap: 10.6, enCap: 10.6, boyAralik: 15, enAralik: 15, type: "Q" },
    "Q589/589": { boyCap: 10.6, enCap: 10.6, boyAralik: 15, enAralik: 15, type: "Q" },
    "Q634/634": { boyCap: 11, enCap: 11, boyAralik: 15, enAralik: 15, type: "Q" },
    "Q754/754": { boyCap: 12, enCap: 12, boyAralik: 15, enAralik: 15, type: "Q" },
    
    
    // R Tipi Hasırlar
    "R106": { boyCap: 4.5, enCap: 4.5, boyAralik: 15, enAralik: 25, type: "R" },
    "R131": { boyCap: 5, enCap: 5, boyAralik: 15, enAralik: 25, type: "R" },
    "R158": { boyCap: 5.5, enCap: 5, boyAralik: 15, enAralik: 25, type: "R" },
    "R188": { boyCap: 6, enCap: 5, boyAralik: 15, enAralik: 25, type: "R" },
    "R221": { boyCap: 6.5, enCap: 5, boyAralik: 15, enAralik: 25, type: "R" },
    "R257": { boyCap: 7, enCap: 5, boyAralik: 15, enAralik: 25, type: "R" },
    "R295": { boyCap: 7.5, enCap: 5, boyAralik: 15, enAralik: 25, type: "R" },
    "R317": { boyCap: 7.8, enCap: 5, boyAralik: 15, enAralik: 25, type: "R" },
    "R335": { boyCap: 8, enCap: 5, boyAralik: 15, enAralik: 25, type: "R" },
    "R377": { boyCap: 8.5, enCap: 5, boyAralik: 15, enAralik: 25, type: "R" },
    "R378": { boyCap: 8.5, enCap: 5, boyAralik: 15, enAralik: 25, type: "R" },
    "R389": { boyCap: 8.6, enCap: 5, boyAralik: 15, enAralik: 25, type: "R" },
    "R423": { boyCap: 9, enCap: 6, boyAralik: 15, enAralik: 25, type: "R" },
    "R424": { boyCap: 9, enCap: 6, boyAralik: 15, enAralik: 25, type: "R" },
    "R442": { boyCap: 9.2, enCap: 6, boyAralik: 15, enAralik: 25, type: "R" },
    "R443": { boyCap: 9.2, enCap: 6, boyAralik: 15, enAralik: 25, type: "R" },
    "R473": { boyCap: 9.5, enCap: 6, boyAralik: 15, enAralik: 25, type: "R" },
    "R513": { boyCap: 9.9, enCap: 6, boyAralik: 15, enAralik: 25, type: "R" },
    "R524": { boyCap: 10, enCap: 6, boyAralik: 15, enAralik: 25, type: "R" },
    "R577": { boyCap: 10.5, enCap: 6, boyAralik: 15, enAralik: 25, type: "R" },
    "R588": { boyCap: 10.6, enCap: 6, boyAralik: 15, enAralik: 25, type: "R" },
    "R589": { boyCap: 10.6, enCap: 6, boyAralik: 15, enAralik: 25, type: "R" },
    "R634": { boyCap: 11, enCap: 6.5, boyAralik: 15, enAralik: 25, type: "R" },
    "R754": { boyCap: 12, enCap: 6.5, boyAralik: 15, enAralik: 25, type: "R" },
    
    // TR Tipi Hasırlar
    "TR106": { boyCap: 4.5, enCap: 4.5, boyAralik: 30, enAralik: 15, type: "TR" },
    "TR131": { boyCap: 5, enCap: 5, boyAralik: 30, enAralik: 15, type: "TR" },
    "TR158": { boyCap: 5, enCap: 5.5, boyAralik: 30, enAralik: 15, type: "TR" },
    "TR188": { boyCap: 5, enCap: 6, boyAralik: 30, enAralik: 15, type: "TR" },
    "TR221": { boyCap: 5, enCap: 6.5, boyAralik: 30, enAralik: 15, type: "TR" },
    "TR257": { boyCap: 5, enCap: 7, boyAralik: 30, enAralik: 15, type: "TR" },
    "TR295": { boyCap: 5, enCap: 7.5, boyAralik: 30, enAralik: 15, type: "TR" },
    "TR317": { boyCap: 5, enCap: 7.8, boyAralik: 30, enAralik: 15, type: "TR" },
    "TR335": { boyCap: 5, enCap: 8, boyAralik: 30, enAralik: 15, type: "TR" },
    "TR377": { boyCap: 5, enCap: 8.5, boyAralik: 30, enAralik: 15, type: "TR" },
    "TR378": { boyCap: 5, enCap: 8.5, boyAralik: 30, enAralik: 15, type: "TR" },
    "TR389": { boyCap: 5, enCap: 8.6, boyAralik: 30, enAralik: 15, type: "TR" },
    "TR423": { boyCap: 6, enCap: 9, boyAralik: 30, enAralik: 15, type: "TR" },
    "TR424": { boyCap: 6, enCap: 9, boyAralik: 30, enAralik: 15, type: "TR" },
    "TR442": { boyCap: 6, enCap: 9.2, boyAralik: 30, enAralik: 15, type: "TR" },
    "TR443": { boyCap: 6, enCap: 9.2, boyAralik: 30, enAralik: 15, type: "TR" },
    "TR473": { boyCap: 6, enCap: 9.2, boyAralik: 30, enAralik: 15, type: "TR" },
    "TR513": { boyCap: 6, enCap: 9.9, boyAralik: 30, enAralik: 15, type: "TR" },
    "TR524": { boyCap: 6, enCap: 10, boyAralik: 30, enAralik: 15, type: "TR" },
    "TR577": { boyCap: 6, enCap: 10.5, boyAralik: 30, enAralik: 15, type: "TR" },
    "TR588": { boyCap: 6, enCap: 10.6, boyAralik: 30, enAralik: 15, type: "TR" },
    "TR589": { boyCap: 6, enCap: 10.6, boyAralik: 30, enAralik: 15, type: "TR" },
    "TR634": { boyCap: 6.5, enCap: 11, boyAralik: 30, enAralik: 15, type: "TR" },
    "TR754": { boyCap: 6.5, enCap: 12, boyAralik: 30, enAralik: 15, type: "TR" }
  };

  // Özel Q tiplerini işleme için hasır tipi çapları
  const qTypeReferenceMap = {
    "Q106": 4.5,
    "Q131": 5,
    "Q158": 5.5,
    "Q188": 6,
    "Q221": 6.5,
    "Q257": 7,
    "Q295": 7.5,
    "Q317": 7.8,
    "Q335": 8,
    "Q377": 8.5,
    "Q378": 8.5,
    "Q389": 8.6,
    "Q423": 9,
    "Q424": 9,
    "Q442": 9.2,
    "Q443": 9.2,
    "Q473": 9.5,
    "Q513": 9.9,
    "Q524": 10,
    "Q577": 10.5,
    "Q588": 10.6,
    "Q589": 10.6,
    "Q634": 11,
    "Q754": 12
  };

  // Satırlar için durum
  const [rows, setRows] = useState([
    createEmptyRow(0)
  ]);
  
  // Genel uygulama yedekleme sistemi - Deep copy için güncellendi
  const [tableBackup, setTableBackup] = useState(null);
  const [backupDate, setBackupDate] = useState(null); // Backup tarihi için durum
  
  // Satır yedekleri için durum (iyileştirme işlemi için)
  const [rowBackups, setRowBackups] = useState({});
  
  // Toplu veri girişi için durum
  const [previewData, setPreviewData] = useState([]);
  const [bulkInputVisible, setBulkInputVisible] = useState(false);
  const [file, setFile] = useState(null);
  
  // OCR işlemi için durum
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrProvider, setOcrProvider] = useState('ocr.space');
  

  // İyileştirme işlemi durumu
  const [processingRowIndex, setProcessingRowIndex] = useState(null);
  const [batchProcessing, setBatchProcessing] = useState(false);

  // Veritabanı işlemleri için durum
  const [savingToDatabase, setSavingToDatabase] = useState(false);
  const [creatingRecipe, setCreatingRecipe] = useState(false);


  // Sticky header için durum - Geliştirildi
  const [stickyHeaderOffset, setStickyHeaderOffset] = useState(0);

  // Referanslar
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const previewTableRef = useRef(null);
  const mainTableRef = useRef(null);
  const tableHeaderRef = useRef(null);
  
  // Kolon genişlikleri için referans
  const resizingColumnRef = useRef(null);
  const initialResizeXRef = useRef(null);
  const initialWidthRef = useRef(null);

  // Makine limitleri için sabitler
  const MACHINE_LIMITS = {
    MIN_BOY: 275, // Minimum boy limiti (cm)
    MAX_BOY: 800, // Maksimum boy limiti (cm)
    MIN_EN: 150,  // Minimum en limiti (cm)
    MAX_EN: 250,  // Maksimum en limiti (cm)
    MIN_EN_ADJUSTABLE: 126 // En için otomatik ayarlanabilir minimum değer
  };

  // Filiz limitleri için sabitler
  const FILIZ_LIMITS = {
    Q_DOSEME: {
      ON_ARKA_MIN: 15,
      ON_ARKA_MAX: 22,
      SAG_SOL_MIN: 1.5,
      SAG_SOL_MAX: 9
    },
    Q_PERDE: {
      ON_MIN: 2.5,
      ARKA_MIN: 65,
      SAG_SOL_MIN: 1.5,
      SAG_SOL_MAX: 9
    },
    R_TYPE: {
      ON_ARKA_MIN: 15,
      ON_ARKA_MAX: 27,
      SAG_SOL_MIN: 1.5,
      SAG_SOL_MAX: 9
    },
    TR_TYPE: {
      ON_ARKA_MIN: 10,
      ON_ARKA_MAX: 17,
      SAG_SOL_MIN: 1.5,
      SAG_SOL_MAX: 16
    }
  };

  // OCR.space API Key
  const OCR_SPACE_API_KEY = 'K89924351888957';
  
  // Boş satır oluşturma fonksiyonu
  function createEmptyRow(id) {
    return {
      id,
      hasirTipi: '',
      uzunlukBoy: '',
      uzunlukEn: '',
      hasirSayisi: '',
      hasirTuru: '',  // Perde, DK Perde, Döşeme veya Standart
      boyCap: '',
      enCap: '',
      boyAraligi: '',
      enAraligi: '',
      cubukSayisiBoy: '',
      cubukSayisiEn: '',
      solFiliz: '',
      sagFiliz: '',
      onFiliz: '',
      arkaFiliz: '',
      adetKg: '',
      toplamKg: '',
      stokKodu: '', // Veritabanı entegrasyonu için stok kodu
      aciklama: '',
      modified: {
        uzunlukBoy: false,
        uzunlukEn: false,
        hasirSayisi: false,
        cubukSayisiBoy: false,
        cubukSayisiEn: false,
        solFiliz: false,
        sagFiliz: false,
        onFiliz: false,
        arkaFiliz: false,
        hasirTuru: false
      },
      uretilemez: false // Üretilemez durumu için alan
    };
  }

  // Ön izleme tablosu için boş satır oluşturma
  function createEmptyPreviewRow(id) {
    return {
      id,
      hasirTipi: '',
      uzunlukBoy: '',
      uzunlukEn: '',
      hasirSayisi: ''
    };
  }

  // Bir satırın gerekli alanları doldurulmuş mu kontrol et
  const isRowFilled = (row) => {
    return (
      row.uzunlukBoy && 
      row.uzunlukEn && 
      row.hasirSayisi &&
      row.hasirTipi
    );
  };

  // Sayıları ondalık nokta formatına çevirme - Türkçe formatı desteği geliştirildi
  const formatNumber = (value) => {
      if (value === undefined || value === null || value === '') return '';
      
      // Sayı formatını belirle (Türkçe veya İngilizce)
      const stringValue = String(value);
      
      // Türkçe formatı: 1.234,56 -> 1234.56
      if (stringValue.includes(',') && (stringValue.includes('.') || /\d{1,3}(\.\d{3})+/.test(stringValue))) {
          return stringValue
              .replace(/\./g, '') // Noktaları kaldır (binlik ayırıcı)
              .replace(',', '.'); // Virgülü noktaya çevir (ondalık ayırıcı)
      }
      
      // İngilizce formatı: 1,234.56 -> 1234.56
      if (stringValue.includes('.') && stringValue.includes(',')) {
          return stringValue.replace(/,/g, ''); // Virgülleri kaldır (binlik ayırıcı)
      }
      
      // Sadece virgül varsa ve ondalık ayırıcı olarak kullanılmışsa
      if (stringValue.includes(',') && !stringValue.includes('.')) {
          return stringValue.replace(',', '.'); // Virgülü noktaya çevir
      }
      
      return stringValue;
  };

  // Hasır tipini standartlaştırma
  const standardizeHasirTipi = (value) => {
    if (!value) return '';
    
    // Boşlukları kaldır ve büyük harfe çevir
    let standardized = value.toUpperCase().replace(/\s+/g, '');
    
    // Q, R veya TR ile başladığını kontrol et
    if (!/^(Q|R|TR)/.test(standardized)) return value;
    
    return standardized;
  };
  
  // Çelik hasır türünü belirleme
  const determineHasirTuru = (hasirTipi, uzunlukBoy) => {
    if (!hasirTipi) return '';
    
    // Sadece Q tipi hasırlar için türü belirliyoruz
    if (hasirTipi.startsWith('Q')) {
      const boyValue = parseFloat(uzunlukBoy);
      
      if (boyValue >= 335 && boyValue <= 345) {
        return 'Perde';
      } else if (boyValue >= 395 && boyValue <= 405) {
        return 'DK Perde';  // Dükkan Kat Perde
      } else {
        return 'Döşeme';
      }
    } else {
      // R ve TR tipleri için "Standart"
      return 'Standart';
    }
  };

  

  // Ana tablo yedeklemesi - Deep copy için güncellendi
  const backupTable = () => {
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Deep copy oluştur
    const deepCopy = JSON.parse(JSON.stringify(rows));
    setTableBackup(deepCopy);
    setBackupDate(formattedDate);
  };

  // Ana tablo yedeğini geri yükleme - Deep copy ile düzeltildi
  const restoreTable = () => {
    if (!tableBackup) {
      alert('Geri yüklenecek tablo yedeği bulunamadı.');
      return;
    }
    
    // Deep copy geri yükle
    const deepCopy = JSON.parse(JSON.stringify(tableBackup));
    setRows(deepCopy);
  };

  // Satır yedeklemesi (iyileştirme işlemi için) - Deep copy güncellendi
  const backupRow = (rowIndex) => {
    const row = rows[rowIndex];
    const backupId = `row_${row.id}_${Date.now()}`;
    
    // Deep copy oluştur
    const rowCopy = JSON.parse(JSON.stringify(row));
    
    setRowBackups(prevBackups => ({
      ...prevBackups,
      [row.id]: { ...rowCopy, backupId }
    }));
  };

  // Tüm satırları yedekle - Deep copy güncellendi
  const backupAllRows = () => {
    const backups = {};
    rows.forEach(row => {
      // Deep copy oluştur
      const rowCopy = JSON.parse(JSON.stringify(row));
      backups[row.id] = { ...rowCopy, backupId: `row_${row.id}_${Date.now()}` };
    });
    setRowBackups(backups);
  };

  // Yedeklenen satırı geri yükle - Deep copy güncellendi
  const restoreRow = (rowId) => {
    if (!rowBackups[rowId]) return false;
    
    const updatedRows = rows.map(row => {
      if (row.id === rowId) {
        // Deep copy oluştur
        return JSON.parse(JSON.stringify(rowBackups[rowId]));
      }
      return row;
    });
    
    setRows(updatedRows);
    return true;
  };

  // Tüm satırları geri yükle - Deep copy güncellendi
  const restoreAllRows = () => {
    if (Object.keys(rowBackups).length === 0) {
      alert('Geri yüklenecek yedek bulunamadı.');
      return;
    }
    
    const updatedRows = rows.map(row => {
      if (rowBackups[row.id]) {
        // Deep copy oluştur
        return JSON.parse(JSON.stringify(rowBackups[row.id]));
      }
      return row;
    });
    
    setRows(updatedRows);
  };

  // Eşleşen sütunları bulmak için geliştirilmiş algoritma - Hasır Sayısı için iyileştirildi
  const findRelevantColumns = (data, headers) => {
    const columnMap = {
      hasirTipi: undefined,
      uzunlukBoy: undefined,
      uzunlukEn: undefined,
      hasirSayisi: undefined
    };
    
    if (!data || data.length === 0) return columnMap;
    
    // Örnek satırları al - Daha güvenilir analiz için
    const sampleRows = headers ? data.slice(1, Math.min(data.length, 10)) : data.slice(0, Math.min(data.length, 9));
    if (sampleRows.length === 0) return columnMap;
    
    // Belge formatını tespit et (Türkçe/İngilizce sayı formatı)
    const numberFormat = detectNumberFormat(sampleRows);
    
    // 1. Adım: Başlıklar varsa, fuzzy matching ile başlıkları eşleştir
    if (headers) {
      // Tüm başlıkları normalize et (küçük harf, Türkçe karakterleri değiştir)
      const normalizedHeaders = headers.map(header => 
        String(header).toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Aksanları kaldır
          .replace(/ı/g, 'i')
          .replace(/ğ/g, 'g')
          .replace(/ü/g, 'u')
          .replace(/ş/g, 's')
          .replace(/ö/g, 'o')
          .replace(/ç/g, 'c')
      );
      
      // Fuzzy arama yapılandırması
      const fuseOptions = {
        includeScore: true,
        threshold: 0.6,
        keys: ['value']
      };
      
      // Hasır Tipi için olası başlıklar
      const hasirTipiKeywords = [
        'hasir tipi', 'hasirtipi', 'hasir cinsi', 'hasircinsi', 'celik hasir', 'celik tip',
        'hasir türü', 'hasir kodu', 'hasir', 'cins', 'tip', 'tür', 'kod', 'q tipi', 'r tipi',
        'hasır tipi', 'hasırtipi', 'hasır cinsi', 'çelik hasır', 'hasır türü'
      ];
      
      // Boy için olası başlıklar
      const boyKeywords = [
        'uzunluk boy', 'boy', 'boy uzunluk', 'uzunluk', 'boy olcu', 'boy cm', 'boy ölçüsü',
        'uzun kenar', 'buyuk kenar', 'uzun', 'yükseklik', 'height', 'length', 'boyut'
      ];
      
      // En için olası başlıklar
      const enKeywords = [
        'uzunluk en', 'en', 'en uzunluk', 'genislik', 'en olcu', 'en cm', 'en ölçüsü',
        'kisa kenar', 'kucuk kenar', 'genişlik', 'width', 'kısa', 'geniş'
      ];
      
      // Hasır Sayısı için olası başlıklar
      const sayisiKeywords = [
        'hasir sayisi', 'sayi', 'adet', 'miktar', 'quantity', 'count', 'hasir adedi', 
        'toplam adet', 'sipariş miktarı', 'siparis adedi', 'toplam', 'tane',
        'hasır sayısı', 'sayı', 'adet', 'miktar', 'hasır adedi'
      ];
      
      // Arama için veri hazırla
      const headerData = normalizedHeaders.map((header, index) => ({ value: header, index }));
      
      // Fuse nesnesi oluştur
      const fuse = new Fuse(headerData, fuseOptions);
      
      // Hasır Tipi için fuzzy arama
      for (const keyword of hasirTipiKeywords) {
        const result = fuse.search(keyword);
        if (result.length > 0 && result[0].score < 0.4) {
          columnMap.hasirTipi = result[0].item.index;
          break;
        }
      }
      
      // Boy için fuzzy arama
      for (const keyword of boyKeywords) {
        const result = fuse.search(keyword);
        if (result.length > 0 && result[0].score < 0.4) {
          columnMap.uzunlukBoy = result[0].item.index;
          break;
        }
      }
      
      // En için fuzzy arama
      for (const keyword of enKeywords) {
        const result = fuse.search(keyword);
        if (result.length > 0 && result[0].score < 0.4) {
          columnMap.uzunlukEn = result[0].item.index;
          break;
        }
      }
      
      // Hasır Sayısı için fuzzy arama
      for (const keyword of sayisiKeywords) {
        const result = fuse.search(keyword);
        if (result.length > 0 && result[0].score < 0.4) {
          columnMap.hasirSayisi = result[0].item.index;
          break;
        }
      }
    }
    
    // 2. Adım: Geliştirilmiş veri analizi - Hasır tipleri ve makine limitlerini kullanarak eşleştirme
    
    // Hasır tipi için Q, R veya TR ile başlayan değerleri ara
    if (columnMap.hasirTipi === undefined) {
      // Sütunlardaki Q/R/TR formatına uyan değerleri say
      const hasirTipiCounts = {};
      
      for (let colIndex = 0; colIndex < sampleRows[0].length; colIndex++) {
        hasirTipiCounts[colIndex] = 0;
        
        for (const row of sampleRows) {
          if (colIndex < row.length) {
            const value = String(row[colIndex]).toUpperCase().trim();
            if (/^(Q|R|TR)\d+/.test(value)) {
              hasirTipiCounts[colIndex]++;
            }
          }
        }
      }
      
      // En çok eşleşen sütunu seç
      let maxCount = 0;
      let bestColIndex = undefined;
      
      for (const colIndex in hasirTipiCounts) {
        const count = hasirTipiCounts[colIndex];
        if (count > maxCount) {
          maxCount = count;
          bestColIndex = parseInt(colIndex);
        }
      }
      
      if (maxCount > 0) {
        columnMap.hasirTipi = bestColIndex;
      }
    }
    
    // 3. Adım: Sayısal değerler için analiz ve sınıflandırma
    // Belge formatına göre sayıları normalleştir
    const columnStats = {};
    
    // Her sütun için istatistikler hesapla
    for (let colIndex = 0; colIndex < sampleRows[0].length; colIndex++) {
      if (colIndex === columnMap.hasirTipi) continue; // Hasır tipi sütununu atla
      
      const values = [];
      let limitMatchCount = 0;
      
      for (const row of sampleRows) {
        if (colIndex < row.length) {
          // Belge formatına göre sayıyı normalleştir
          const normalizedValue = normalizeNumber(String(row[colIndex]), numberFormat);
          const numValue = parseFloat(normalizedValue);
          
          if (!isNaN(numValue)) {
            values.push(numValue);
            
            // Makine limitlerine uyup uymadığını kontrol et
            if ((numValue >= MACHINE_LIMITS.MIN_BOY * 0.8 && numValue <= MACHINE_LIMITS.MAX_BOY * 1.2) || 
                (numValue >= MACHINE_LIMITS.MIN_EN_ADJUSTABLE * 0.8 && numValue <= MACHINE_LIMITS.MAX_EN * 1.2)) {
              limitMatchCount++;
            }
          }
        }
      }
      
      if (values.length > 0) {
        columnStats[colIndex] = {
          min: Math.min(...values),
          max: Math.max(...values),
          avg: values.reduce((sum, val) => sum + val, 0) / values.length,
          count: values.length,
          limitMatchCount: limitMatchCount,
          limitMatchRatio: limitMatchCount / values.length,
          values: values,
          isInteger: values.every(v => Number.isInteger(v) || Math.abs(v - Math.round(v)) < 0.001)
        };
      }
    }
    
    // 4. Boy ve En sütunlarını belirle
    
    // Boy aralığına uygun sütunları bul (275-800 cm)
    const boyCandidates = [];
    
    for (const [colIndex, stats] of Object.entries(columnStats)) {
      // Boy aralığına uyan değerler var mı?
      const matchingBoyValues = stats.values.filter(
        v => v >= MACHINE_LIMITS.MIN_BOY * 0.8 && v <= MACHINE_LIMITS.MAX_BOY * 1.2
      );
      
      // En az %85 uyum şartı
      const matchRatio = matchingBoyValues.length / stats.values.length;
      
      if (matchingBoyValues.length > 0 && matchRatio >= 0.85) {
        boyCandidates.push({
          colIndex: parseInt(colIndex),
          matchCount: matchingBoyValues.length,
          matchRatio: matchRatio,
          avgValue: matchingBoyValues.reduce((sum, val) => sum + val, 0) / matchingBoyValues.length
        });
      }
    }
    
    // En aralığına uygun sütunları bul (126-250 cm)
    const enCandidates = [];
    
    for (const [colIndex, stats] of Object.entries(columnStats)) {
      // En aralığına uyan değerler var mı?
      const matchingEnValues = stats.values.filter(
        v => v >= MACHINE_LIMITS.MIN_EN_ADJUSTABLE * 0.8 && v <= MACHINE_LIMITS.MAX_EN * 1.2
      );
      
      // En az %85 uyum şartı
      const matchRatio = matchingEnValues.length / stats.values.length;
      
      if (matchingEnValues.length > 0 && matchRatio >= 0.85) {
        enCandidates.push({
          colIndex: parseInt(colIndex),
          matchCount: matchingEnValues.length,
          matchRatio: matchRatio,
          avgValue: matchingEnValues.reduce((sum, val) => sum + val, 0) / matchingEnValues.length
        });
      }
    }
    
    // Uzunluk Boy için en iyi adayı seç
    if (boyCandidates.length > 0 && columnMap.uzunlukBoy === undefined) {
      // Eşleşme oranına göre sırala
      boyCandidates.sort((a, b) => b.matchRatio - a.matchRatio);
      columnMap.uzunlukBoy = boyCandidates[0].colIndex;
    }
    
    // Uzunluk En için en iyi adayı seç
    if (enCandidates.length > 0 && columnMap.uzunlukEn === undefined) {
      // Eşleşme oranına göre sırala ve Boy sütunundan farklı olduğundan emin ol
      enCandidates.sort((a, b) => b.matchRatio - a.matchRatio);
      
      for (const candidate of enCandidates) {
        if (candidate.colIndex !== columnMap.uzunlukBoy) {
          columnMap.uzunlukEn = candidate.colIndex;
          break;
        }
      }
    }
    
    // 5. Kapsamlı analiz: Eğer hala bulunamadıysa, genel yaklaşımı kullan (Boy > En)
    if (columnMap.uzunlukBoy === undefined && columnMap.uzunlukEn === undefined) {
      // Tüm sayısal sütunları değerlerine göre sırala
      const numericColumns = Object.entries(columnStats)
        .filter(([colIndex]) => colIndex !== columnMap.hasirTipi?.toString())
        .map(([colIndex, stats]) => ({
          colIndex: parseInt(colIndex),
          avgValue: stats.avg
        }))
        .sort((a, b) => b.avgValue - a.avgValue);
      
      if (numericColumns.length >= 2) {
        columnMap.uzunlukBoy = numericColumns[0].colIndex;
        columnMap.uzunlukEn = numericColumns[1].colIndex;
      }
    }
    
    // 6. Hasır Sayısı için geliştirilmiş analiz - Tam sayılar ve eliminasyon yöntemi
    if (columnMap.hasirSayisi === undefined) {
      // Potansiyel tam sayı sütunlarını bul
      const integerColumns = Object.entries(columnStats)
        .filter(([colIndex, stats]) => 
          colIndex !== columnMap.hasirTipi?.toString() && 
          colIndex !== columnMap.uzunlukBoy?.toString() && 
          colIndex !== columnMap.uzunlukEn?.toString() &&
          stats.isInteger // Tam sayı kontrolü
        )
        .map(([colIndex, stats]) => ({
          colIndex: parseInt(colIndex),
          stats: stats
        }));
      
      if (integerColumns.length > 0) {
        // Boy ve En sütunlarının dışındaki sütunları seç
        const nonDimensionIntColumns = integerColumns.filter(col => {
          // Makine limitlerini kullanarak boyut sütunlarını elimine et
          const values = col.stats.values;
          const hasDimensionPattern = values.some(v => 
            (v >= MACHINE_LIMITS.MIN_BOY * 0.7 && v <= MACHINE_LIMITS.MAX_BOY * 1.3) || 
            (v >= MACHINE_LIMITS.MIN_EN_ADJUSTABLE * 0.7 && v <= MACHINE_LIMITS.MAX_EN * 1.3)
          );
          
          // Çap değerleri genellikle 4-12 arasındadır, bunları elimine et
          const hasCapPattern = values.every(v => v >= 4 && v <= 12);
          
          // Aralık değerleri genellikle 15, 25, 30 gibi değerlerdir, bunları elimine et
          const hasAralikPattern = values.every(v => (v === 15 || v === 25 || v === 30));
          
          return !hasDimensionPattern && !hasCapPattern && !hasAralikPattern;
        });
        
        if (nonDimensionIntColumns.length > 0) {
          // Hasır sayısı adaylarını bul
          columnMap.hasirSayisi = nonDimensionIntColumns[0].colIndex;
        } else if (integerColumns.length > 0) {
          // Eğer tüm tam sayı sütunları elendi ise, ilk tam sayı sütununu kullan
          columnMap.hasirSayisi = integerColumns[0].colIndex;
        }
      }
      
      // Hala bulunamadıysa, kalan sayısal sütunları değerlendir
      if (columnMap.hasirSayisi === undefined) {
        const remainingCols = Object.entries(columnStats)
          .filter(([colIndex]) => 
            colIndex !== columnMap.hasirTipi?.toString() && 
            colIndex !== columnMap.uzunlukBoy?.toString() && 
            colIndex !== columnMap.uzunlukEn?.toString()
          )
          .map(([colIndex, stats]) => ({
            colIndex: parseInt(colIndex),
            avgValue: stats.avg
          }));
        
        if (remainingCols.length > 0) {
          // Ortalama değerine göre sırala ve en küçük değere sahip olanı seç
          remainingCols.sort((a, b) => a.avgValue - b.avgValue);
          columnMap.hasirSayisi = remainingCols[0].colIndex;
        }
      }
    }
    
    return columnMap;
  };
  
  // Belge sayı formatını tespit et (Türkçe/İngilizce)
  const detectNumberFormat = (rows) => {
    // Varsayılan format "english" (nokta ondalık, virgül binlik ayırıcı)
    let format = "english";
    let commaDecimalCount = 0;
    let dotDecimalCount = 0;
    
    // Örnek değerleri kontrol et
    for (const row of rows) {
      for (const cell of row) {
        const value = String(cell);
        
        // Virgül ve nokta içeren değerleri analiz et
        if (value.includes(',') && /\d,\d/.test(value)) {
          commaDecimalCount++;
        }
        
        if (value.includes('.') && /\d\.\d/.test(value)) {
          dotDecimalCount++;
        }
      }
    }
    
    // Eğer virgül kullanımı daha yaygınsa, Türkçe format olarak belirle
    if (commaDecimalCount > dotDecimalCount) {
      format = "turkish"; // Virgül ondalık, nokta binlik ayırıcı
    }
    
    return format;
  };
  
  // Belge formatına göre sayı değerini normalleştir
  const normalizeNumber = (value, format) => {
    if (!value) return '';
    
    // Türkçe formatı: 1.234,56 -> 1234.56
    if (format === "turkish") {
      return value
        .replace(/\./g, '') // Noktaları kaldır (binlik ayırıcı)
        .replace(',', '.'); // Virgülü noktaya çevir (ondalık ayırıcı)
    }
    
    // İngilizce formatı: 1,234.56 -> 1234.56
    return value.replace(/,/g, ''); // Virgülleri kaldır (binlik ayırıcı)
  };

  // Bireysel hücre değişikliklerini işleme - Filiz değerleri için güçlü işaretleme eklendi
  const handleCellChange = (rowIndex, field, value) => {
    const updatedRows = [...rows];
    const row = updatedRows[rowIndex];
    
    // Gerekiyorsa sayıyı formatla
    if (typeof value === 'string' && field !== 'hasirTipi' && field !== 'aciklama') {
        value = formatNumber(value);
    }
    
    if (field === 'hasirTipi') {
      value = standardizeHasirTipi(value);
    }
    
    // Önceki değeri sakla
    const previousValue = row[field];
    
    // Değeri güncelle
    row[field] = value;
    
     if (field === 'cubukSayisiBoy' || field === 'cubukSayisiEn') {
    // bosluga izin ver
    if (value === '') {
        row[field] = '';
        // DÜZELTME: Early return kaldırıldı, işlem devam etmeli
    }
}
    // Kırmızı işaretleri kaldır - Filiz alanları hariç
    if (row.modified && row.modified[field] && 
        field !== 'solFiliz' && field !== 'sagFiliz' && 
        field !== 'onFiliz' && field !== 'arkaFiliz') {
      row.modified[field] = false;
    }
    
    // Filiz değerlerinin değişimi için özel kontrol - Güçlü işaretleme
    if (field === 'solFiliz' || field === 'sagFiliz' || field === 'onFiliz' || field === 'arkaFiliz') {
      if (previousValue !== value) {
        row.modified[field] = true;
        
        // Açıklamaya filiz değişikliği notu ekle - Eğer zaten yoksa
        if (!row.aciklama.includes('!Dikkat: Filiz Değerleri Elle Değiştirildi')) {
          row.aciklama += '!Dikkat: Filiz Değerleri Elle Değiştirildi. ';
        }
      }
    }
    
    // Eğer hasirTipi değiştiyse, cap ve aralik değerlerini güncelle
    if (field === 'hasirTipi') {
      updateRowFromHasirTipi(updatedRows, rowIndex);
    }
    
    // En değerini otomatik düzelt (126-149 cm aralığındakileri 150 cm'e tamamla)
    if (field === 'uzunlukEn') {
      const enValue = parseFloat(value);
      if (!isNaN(enValue) && enValue >= MACHINE_LIMITS.MIN_EN_ADJUSTABLE && enValue < MACHINE_LIMITS.MIN_EN) {
        row.uzunlukEn = MACHINE_LIMITS.MIN_EN.toString();
        row.modified.uzunlukEn = true;
        
        if (row.aciklama && !row.aciklama.includes('En ölçüsü otomatik olarak 150 cm\'e ayarlandı')) {
          row.aciklama += 'En ölçüsü otomatik olarak 150 cm\'e ayarlandı. ';
        } else if (!row.aciklama) {
          row.aciklama = 'En ölçüsü otomatik olarak 150 cm\'e ayarlandı. ';
        }
      }
    }
    
    // Uzunluk Boy değiştiğinde hasır türünü güncelle
    if ((field === 'hasirTipi' || field === 'uzunlukBoy') && row.hasirTipi) {
      const hasirTuru = determineHasirTuru(row.hasirTipi, row.uzunlukBoy);
      row.hasirTuru = hasirTuru;
    }
    
    // Herhangi bir alan değiştiyse, eğer temel alanlar doluysa yeniden hesaplama yap
    if (isRowFilled(row) && 
        field !== 'solFiliz' && field !== 'sagFiliz' && field !== 'onFiliz' && field !== 'arkaFiliz') {
      // Hesaplama fonksiyonlarını çağır (filiz değerleri hariç)
      calculateBasicValues(updatedRows, rowIndex);
    } else if (isRowFilled(row) && 
               (field === 'uzunlukBoy' || field === 'uzunlukEn' || 
                field === 'cubukSayisiBoy' || field === 'cubukSayisiEn' || 
                field === 'boyAraligi' || field === 'enAraligi')) {
      // Temel değerler değiştiyse filiz değerlerini yeniden hesapla - Manuel değiştirilenler hariç

        calculateFilizValues(row);
      
      // Ağırlık hesapla
      calculateWeight(row);
    }
    
    setRows(updatedRows);
  };

  // Ön izleme tablosundaki hücreleri değiştirme
  const handlePreviewCellChange = (rowIndex, field, value) => {
    const updatedPreviewData = [...previewData];
    
    // Sayısal alanlar için formatlama yap
    if (field !== 'hasirTipi') {
      value = formatNumber(value);
    } else {
      value = standardizeHasirTipi(value);
    }
    
    updatedPreviewData[rowIndex][field] = value;
    setPreviewData(updatedPreviewData);
  };

  // Satırı Hasır Tipi'ne göre güncelleme
  const updateRowFromHasirTipi = (rows, rowIndex) => {
    const row = rows[rowIndex];
    const hasirTipi = row.hasirTipi;
    
    // Yeni bir hasir tipi için modified bayraklarını sıfırla
    row.modified = {
      uzunlukBoy: false,
      uzunlukEn: false,
      hasirSayisi: false,
      cubukSayisiBoy: false,
      cubukSayisiEn: false,
      solFiliz: false,
      sagFiliz: false,
      onFiliz: false,
      arkaFiliz: false,
      hasirTuru: false
    };
    
    // Üretilemez durumunu sıfırla
    row.uretilemez = false;
    row.aciklama = '';
    
    // Hasır Türünü belirle
    row.hasirTuru = determineHasirTuru(hasirTipi, row.uzunlukBoy);

    // Boy ve en çap değerlerini ayarla - Karmaşık hasır tipleri için yeni işleme
    if (hasirTipi.includes('/')) {
      // Q257/131 gibi kombinasyonları işleme
      processComplexHasirType(row, hasirTipi);
    } else if (hasirReferenceData[hasirTipi]) {
      // Referans veride hasir tipi var mı kontrol et
      const refData = hasirReferenceData[hasirTipi];
      row.boyCap = refData.boyCap;
      row.enCap = refData.enCap;
      row.boyAraligi = refData.boyAralik;
      row.enAraligi = refData.enAralik;
    }
    
    // Gerekli alanlar doluysa hesaplama yap
    if (isRowFilled(row)) {
      calculateBasicValues(rows, rowIndex);
    }
  };

  // Karmaşık hasır tiplerini işleme (örn: Q257/131)
  const processComplexHasirType = (row, hasirTipi) => {
    // Boşlukları temizle
    const cleanHasirTipi = hasirTipi.replace(/\s+/g, '');
    
    // Bölümleri ayır
    const parts = cleanHasirTipi.split('/');
    
    if (parts.length !== 2) return;
    
    // Prefix (Q, R, TR) belirle
    let prefix = '';
    if (cleanHasirTipi.startsWith('Q')) prefix = 'Q';
    else if (cleanHasirTipi.startsWith('R')) prefix = 'R';
    else if (cleanHasirTipi.startsWith('TR')) prefix = 'TR';
    else return;
    
    // Sayıları çıkar
    const firstNumStr = parts[0].replace(/\D/g, '');
    const secondNumStr = parts[1].replace(/\D/g, '');
    
    if (!firstNumStr || !secondNumStr) return;
    
    // Boy ve en tiplerini oluştur
    const firstType = prefix + firstNumStr;
    const secondType = prefix + secondNumStr;
    
    // Kendisi / Kendisi formatını kontrol et (örn: Q257/257)
    if (firstNumStr === secondNumStr) {
      const selfReferenceFormat = firstType + "/" + firstType;
      if (hasirReferenceData[selfReferenceFormat] || hasirReferenceData[firstType]) {
        const refData = hasirReferenceData[selfReferenceFormat] || hasirReferenceData[firstType];
        row.boyCap = refData.boyCap;
        row.enCap = refData.enCap;
        row.boyAraligi = refData.boyAralik;
        row.enAraligi = refData.enAralik;
        return;
      }
    }
    
    // Q tipleri için doğrudan çap eşleştirme
    if (prefix === 'Q') {
      if (qTypeReferenceMap[firstType] && qTypeReferenceMap[secondType]) {
        row.boyCap = qTypeReferenceMap[firstType];
        row.enCap = qTypeReferenceMap[secondType];
        
        // Aralık değerlerini tipik Q tipi değerlerinden al
        row.boyAraligi = 15;
        row.enAraligi = 15;
        return;
      }
    }
    
    // Boy ve En değerleri için referans tablosundaki en yakın eşleşmeleri bul
    const firstMatch = findClosestMatch(firstType, prefix);
    const secondMatch = findClosestMatch(secondType, prefix);
    
    if (firstMatch && secondMatch) {
      if (hasirReferenceData[firstMatch] && hasirReferenceData[secondMatch]) {
        // Boy ve en cap değerlerini ayarla
        row.boyCap = hasirReferenceData[firstMatch].boyCap;
        row.enCap = hasirReferenceData[secondMatch].enCap;
        
        // Aralık değerlerini birinci eşleşmeden al
        row.boyAraligi = hasirReferenceData[firstMatch].boyAralik;
        row.enAraligi = hasirReferenceData[firstMatch].enAralik;
      }
    }
  };

  // En yakın hasır tipi eşleşmesini bulma
  const findClosestMatch = (type, prefix) => {
    // Tam eşleşme varsa onu döndür
    if (hasirReferenceData[type]) return type;
    
    // Prefix + numaraları çıkar
    const typeNum = parseInt(type.replace(/\D/g, ''));
    
    // Tüm tipleri kontrol et
    let closestMatch = null;
    let closestDiff = Number.MAX_VALUE;
    
    Object.keys(hasirReferenceData).forEach(key => {
      if (key.startsWith(prefix) && !key.includes('/')) {
        const keyNum = parseInt(key.replace(/\D/g, ''));
        const diff = Math.abs(keyNum - typeNum);
        
        if (diff < closestDiff) {
          closestDiff = diff;
          closestMatch = key;
        }
      }
    });
    
    return closestMatch;
  };

  // Temel değerleri hesaplama (Çubuk sayıları, boyutlar vb.)
  const calculateBasicValues = (rows, rowIndex) => {
    const row = rows[rowIndex];
    
    // Makine limitlerini kontrol et
    checkMachineLimits(row);
    
    // Başlangıçta hasır türünü belirle
    row.hasirTuru = determineHasirTuru(row.hasirTipi, row.uzunlukBoy);
    
    // Üretilemez durumundaysa hesaplama yapma
    if (row.uretilemez) return;
    
    // Cubuk sayısı belirlenmemişse varsayılan değerleri hesapla
    initializeCubukSayisi(row);
    
    // Filiz değerlerini hesapla - Eğer elle değiştirilmediyse
      calculateFilizValues(row);
      
    // Ağırlık hesapla
    calculateWeight(row);
  };

  // Makine limitlerine göre kontrol
  const checkMachineLimits = (row) => {
    const uzunlukBoy = parseFloat(row.uzunlukBoy);
    const uzunlukEn = parseFloat(row.uzunlukEn);
    
    // En ve Boy için makine limitlerini kontrol et
    if (uzunlukBoy < MACHINE_LIMITS.MIN_BOY || uzunlukBoy > MACHINE_LIMITS.MAX_BOY ||
        uzunlukEn < MACHINE_LIMITS.MIN_EN || uzunlukEn > MACHINE_LIMITS.MAX_EN) {
      
      // En değerini otomatik ayarla (126-149 cm aralığındaysa)
      if (uzunlukEn >= MACHINE_LIMITS.MIN_EN_ADJUSTABLE && uzunlukEn < MACHINE_LIMITS.MIN_EN) {
        row.uzunlukEn = MACHINE_LIMITS.MIN_EN.toString();
        row.modified.uzunlukEn = true;
        
        if (!row.aciklama || !row.aciklama.includes('En ölçüsü otomatik olarak 150 cm\'e ayarlandı')) {
          row.aciklama = (row.aciklama || '') + 'En ölçüsü otomatik olarak 150 cm\'e ayarlandı. ';
        }
      }
      // Bu aşamada diğer durumlar için iyileştir butonu kullanılacak
    }
  };

  // Boyutlar ve hasır tipine göre çubuk sayısı başlatma
  const initializeCubukSayisi = (row) => {
    if (row.cubukSayisiBoy !== '' && row.cubukSayisiEn !== '' && 
        parseFloat(row.cubukSayisiBoy) > 0 && parseFloat(row.cubukSayisiEn) > 0) {
      return; // Değerler zaten girilmişse bir şey yapma
    }
    
    const uzunlukBoy = parseFloat(row.uzunlukBoy);
    const uzunlukEn = parseFloat(row.uzunlukEn);
    const boyAraligi = parseFloat(row.boyAraligi) || 15; // Varsayılan değerler
    const enAraligi = parseFloat(row.enAraligi) || 15;   // Varsayılan değerler
    
    // Başlangıç değerlerini hesapla
    let cubukSayisiBoy = Math.floor((uzunlukEn / boyAraligi) + 1);
    let cubukSayisiEn = Math.floor((uzunlukBoy / enAraligi) + 1);
    
    // Hasır tipine göre standart değerleri ayarla
    if (row.hasirTipi.startsWith('R')) {
      // R tipi standart değerler
      if (uzunlukBoy >= 490 && uzunlukBoy <= 510 && uzunlukEn >= 210 && uzunlukEn <= 220) {
        cubukSayisiBoy = 15;
        cubukSayisiEn = 20;
      }
    } else if (row.hasirTipi.startsWith('TR')) {
      // TR tipi standart değerler
      if (uzunlukBoy >= 490 && uzunlukBoy <= 510 && uzunlukEn >= 210 && uzunlukEn <= 220) {
        cubukSayisiBoy = 8;
        cubukSayisiEn = 33;
      }
    } else if (row.hasirTipi.startsWith('Q')) {
      // Q tipi standart değerler, kategoriye bağlı
      const hasirTuru = row.hasirTuru;
      
      if (hasirTuru === 'Perde') {
        // Perde tipi için En çubuk sayısı 18
        cubukSayisiEn = 18;
      } else if (hasirTuru === 'DK Perde') {
        // Dükkan kat perde tipi için En çubuk sayısı 21
        cubukSayisiEn = 21;
      } else if (uzunlukBoy >= 490 && uzunlukBoy <= 510 && uzunlukEn >= 210 && uzunlukEn <= 220) {
        // Q tipi döşeme standart değerler
        cubukSayisiBoy = 15;
        cubukSayisiEn = 32;
      }
    }
    
    // Negatif veya 0 değerleri engelle
    cubukSayisiBoy = cubukSayisiBoy > 0 ? cubukSayisiBoy : 2;
    cubukSayisiEn = cubukSayisiEn > 0 ? cubukSayisiEn : 2;
    
    row.cubukSayisiBoy = cubukSayisiBoy;
    row.cubukSayisiEn = cubukSayisiEn;
  };
        
        // Filiz değerlerini hesaplama
        const calculateFilizValues = (row) => {
          // Eğer filiz değerleri elle değiştirildiyse hesaplama yapma
         // if (row.modified.solFiliz && row.modified.sagFiliz && 
         //     row.modified.onFiliz && row.modified.arkaFiliz) {
         //   return;
        //  }
          
          const uzunlukBoy = parseFloat(row.uzunlukBoy) || 0;
          const uzunlukEn = parseFloat(row.uzunlukEn) || 0;
          const cubukSayisiBoy = parseInt(row.cubukSayisiBoy) || 0;
          const cubukSayisiEn = parseInt(row.cubukSayisiEn) || 0;
          const boyAraligi = parseFloat(row.boyAraligi) || 0;
          const enAraligi = parseFloat(row.enAraligi) || 0;
          
         // Filiz değerlerini doğru formüllerle hesapla
      // Sol/Sag Filiz: (UZUNLUK EN - ((ÇUBUK SAYISI BOY - 1) * ARA BOY)) / 2
      if (!isNaN(uzunlukEn) && !isNaN(cubukSayisiBoy) && !isNaN(boyAraligi) && cubukSayisiBoy > 1) {
        const solFiliz = (uzunlukEn - ((cubukSayisiBoy - 1) * boyAraligi)) / 2;
        
        // Elle değiştirilmediyse değerleri güncelle
        row.solFiliz = parseFloat(solFiliz.toFixed(5));
        row.sagFiliz = parseFloat(solFiliz.toFixed(5));
      }
      
      // On/Arka Filiz: (UZUNLUK BOY - ((ÇUBUK SAYISI EN - 1) * ARA EN)) / 2
      if (!isNaN(uzunlukBoy) && !isNaN(cubukSayisiEn) && !isNaN(enAraligi) && cubukSayisiEn > 1) {
        const baseFiliz = (uzunlukBoy - ((cubukSayisiEn - 1) * enAraligi)) / 2;
      
        // Başlangıçta her iki filizi eşit olarak ata
        row.onFiliz = parseFloat(baseFiliz.toFixed(5));
        row.arkaFiliz = parseFloat(baseFiliz.toFixed(5));
        row.modified.onFiliz = true;
        row.modified.arkaFiliz = true;
      
        // Q tipi Döşeme hasırları için özel optimizasyon
        if (row.hasirTipi.startsWith('Q') && row.hasirTuru === 'Döşeme') {
          // Döşeme tipi için hedef filiz değeri 22.5cm
          const targetFiliz = 22.5;
          
          // Hedef filiz değerine ulaşmak için gerekli çubuk sayısını hesapla
          const optimalCubukSayisiEn = Math.round((uzunlukBoy - (2 * targetFiliz)) / enAraligi) + 1;
          
          // Hesaplanan çubuk sayısı geçerli mi kontrol et
          if (optimalCubukSayisiEn > 1) {
            // Yeni çubuk sayısı ile filiz değerlerini hesapla
            const adjustedFiliz = (uzunlukBoy - ((optimalCubukSayisiEn - 1) * enAraligi)) / 2;
            
            // Sonuç mantıklı bir aralıkta mı kontrol et
            if (adjustedFiliz >= 15 && adjustedFiliz <= 30) {
              row.cubukSayisiEn = optimalCubukSayisiEn;
              row.onFiliz = parseFloat(adjustedFiliz.toFixed(5));
              row.arkaFiliz = parseFloat(adjustedFiliz.toFixed(5));
              row.modified.cubukSayisiEn = true;
              
              // Açıklamaya bilgi ekle
              if (!row.aciklama.includes('Döşeme tipi filiz değerleri optimize edildi')) {
                row.aciklama += `Döşeme tipi filiz değerleri optimize edildi (Ön/Arka: ${adjustedFiliz.toFixed(2)}cm). `;
              }
            }
          }
        }
        // Perde ve DK Perde için özel filiz ayarlaması
        else if ((row.hasirTuru === 'Perde' || row.hasirTuru === 'DK Perde') &&
          row.hasirTipi.startsWith('Q') &&
          typeof row.onFiliz === 'number' &&
          typeof row.arkaFiliz === 'number') {
          
          const filizToplam = row.onFiliz + row.arkaFiliz;
      
          // Perde tipleri için arka filiz hedef değeri 75cm (5'in katı)
          let arkaFiliz = 75; // Öncelikli hedef 75cm
          
          // Toplam filiz değeri yeterli değilse, azalt
          if (filizToplam < 77.5) { // 2.5 (min ön) + 75 (hedef arka)
            if (filizToplam >= 72.5) {
            arkaFiliz = 70;
          } else if (filizToplam >= 67.5) {
            arkaFiliz = 65;
          } else {
            // Toplam yetersizse, minimum ön filiz için ayarla
            arkaFiliz = Math.max(65, filizToplam - 2.5);
          }
        }
        
        // Arka filizi 5'in katına yuvarla
        arkaFiliz = Math.round(arkaFiliz / 5) * 5;
        const onFiliz = filizToplam - arkaFiliz;
    
        // Ön filiz minimum 2.5cm olmalı
        if (onFiliz >= 2.5) {
          row.onFiliz = parseFloat(onFiliz.toFixed(5));
          row.arkaFiliz = parseFloat(arkaFiliz.toFixed(5));
          row.modified.onFiliz = true;
          row.modified.arkaFiliz = true;
    
          // Açıklamaya bilgi ekle
          if (!row.aciklama.includes('Perde tipi filiz değerleri optimize edildi')) {
            row.aciklama += `Perde tipi filiz değerleri optimize edildi (Ön: ${onFiliz.toFixed(2)}cm, Arka: ${arkaFiliz.toFixed(2)}cm). `;
          }
        }
      }
    }
  };

  // Ağırlık değerlerini hesaplama
  const calculateWeight = (row) => {
    const boyCap = parseFloat(row.boyCap);
    const enCap = parseFloat(row.enCap);
    const uzunlukBoy = parseFloat(row.uzunlukBoy);
    const uzunlukEn = parseFloat(row.uzunlukEn);
    const cubukSayisiBoy = parseInt(row.cubukSayisiBoy);
    const cubukSayisiEn = parseInt(row.cubukSayisiEn);
    const hasirSayisi = parseFloat(row.hasirSayisi);
    
    if (!isNaN(boyCap) && !isNaN(enCap) && !isNaN(uzunlukBoy) && !isNaN(uzunlukEn) &&
        !isNaN(cubukSayisiBoy) && !isNaN(cubukSayisiEn) && !isNaN(hasirSayisi)) {
      
      // Adet Kg hesaplama
      const PI = Math.PI;
      const density = 0.007847;
      
      // Boy bileşeni: Boy çaplı cubuklar (uzunlukBoy boyunca cubukSayisiBoy adet)
      const boyComponent = parseFloat(((((boyCap * boyCap * PI) / 4) * density) * uzunlukBoy * cubukSayisiBoy / 100).toFixed(5));
      
      // En bileşeni: En çaplı cubuklar (uzunlukEn boyunca cubukSayisiEn adet)
      const enComponent = parseFloat(((((enCap * enCap * PI) / 4) * density) * uzunlukEn * cubukSayisiEn / 100).toFixed(5));
      
      const adetKg = boyComponent + enComponent;
      row.adetKg = parseFloat(adetKg.toFixed(5));
      
      // Toplam Kg hesaplama
      row.toplamKg = parseFloat((adetKg * hasirSayisi).toFixed(5));
    }
  };

// İyileştirme işlemlerini gerçekleştirme - Deep copy için güncellendi
const iyilestir = async (rowIndex) => {
  // Başlangıçta satırı yedekle
  backupRow(rowIndex);
  
  // İyileştirme işleminin başladığını göster
  setProcessingRowIndex(rowIndex);
  
  // İşlemin asenkron çalışması için setTimeout kullan (animasyon görünmesi için)
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const updatedRows = [...rows];
  const row = updatedRows[rowIndex];
  
  // Mevcut açıklamayı sakla
  const previousAciklama = row.aciklama || '';
  
  // Temel değerler
  const hasirTipi = row.hasirTipi;
  const uzunlukBoy = parseFloat(row.uzunlukBoy);
  const uzunlukEn = parseFloat(row.uzunlukEn);
  const hasirSayisi = parseFloat(row.hasirSayisi);
  
  // Başlangıç değerlerini hatırla (İkinci kez çalıştırılırsa bozulmasın diye)
  const originalValues = {
    uzunlukBoy: uzunlukBoy,
    uzunlukEn: uzunlukEn,
    hasirSayisi: hasirSayisi
  };
  
  // Eksik bilgi varsa işlem yapma
  if (!hasirTipi || isNaN(uzunlukBoy) || isNaN(uzunlukEn) || isNaN(hasirSayisi)) {
    alert('İyileştirme yapabilmek için tüm temel bilgileri (Hasır Tipi, Uzunluk Boy, Uzunluk En, Hasır Sayısı) girmelisiniz.');
    setProcessingRowIndex(null);
    return;
  }
  
  // Yeni açıklama için değişken
  let newAciklama = '';
  
  // İyileştirme sırası:
  // 0. Başlangıçta tüm değerleri hesapla (hiç hesaplanmamışsa)
  // 1. En > MAX_EN kontrolü
  // 2. Q tipi için Boy/En değiştirmeyi dene
  // 3. Limitin altındaki değerler için çarpma dene
  // 4. Çubuk sayılarını ayarlayarak filiz değerlerini optimize et
  // 5. Hiçbiri işe yaramazsa "Üretilemez" olarak işaretle
  
  let isImproved = false;
  
  // Başlangıçta modified durumlarını temizle - Tüm filiz değerleri için sıfırlama
  row.modified = {
    uzunlukBoy: false,
    uzunlukEn: false,
    hasirSayisi: false,
    cubukSayisiBoy: false,
    cubukSayisiEn: false,
    solFiliz: false,
    sagFiliz: false,
    onFiliz: false,
    arkaFiliz: false,
    hasirTuru: false
  };
  
  // Üretilemez durumunu sıfırla
  row.uretilemez = false;
  
  // 0. Tüm değerleri başlangıçta hesapla veya yeniden hesapla
  if (!row.boyCap || !row.enCap || !row.boyAraligi || !row.enAraligi) {
    updateRowFromHasirTipi(updatedRows, rowIndex);
  }
  
  // Cubuk sayılarının hesaplanmasını sağla
  initializeCubukSayisi(row);
  
  // Başlangıç filiz değerlerini hesapla ve sakla
  const oldFilizValues = {
    solFiliz: row.solFiliz,
    sagFiliz: row.sagFiliz,
    onFiliz: row.onFiliz,
    arkaFiliz: row.arkaFiliz
  };
  
  calculateFilizValues(row);
  
  // Başlangıç filiz değerlerini kaydet (karşılaştırma için)
  const initialFiliz = {
    on: row.onFiliz,
    arka: row.arkaFiliz
  };
  
  // Ağırlık hesapla
  calculateWeight(row);
  
  // 1. Öncelikle En > MAX_EN kontrolü - İyilestirAll ile uyumlu
  const initialLimitsOk = isMachineLimitsOk(row);
  if (!initialLimitsOk && uzunlukEn > MACHINE_LIMITS.MAX_EN) {
    isImproved = trySwapBoyEn(row);
    if (isImproved) {
      newAciklama += `En değeri (${uzunlukEn}cm) makine limitini aştığı için Boy/En değerleri değiştirildi. `;
    }
  }
  // 2. Q tipi için Boy/En değiştirmeyi dene - Adım 1'de başarılı olunmadıysa
  else if (!isImproved && hasirTipi.startsWith('Q')) {
    isImproved = trySwapBoyEn(row);
    if (isImproved) {
      newAciklama += 'Boy ve en değerleri değiştirildi. ';
    }
  }
  
  // 3. Limitin altındaki değerler için çarpma dene
  if (!isImproved && !isMachineLimitsOk(row)) {
    isImproved = tryMultiplyDimensions(row, originalValues);
    // tryMultiplyDimensions içinde açıklama güncellenir
  }
  
  // 4. Çubuk sayılarını ayarlayarak filiz değerlerini optimize et
  if (!row.uretilemez) {
    // Filiz değerlerini optimize et - Bu kısım özellikle döşeme için geliştirildi
    optimizeFilizValues(row);
    
    // Optimizasyon sonrası filiz değerlerini kaydet
    const optimizedFiliz = {
      on: row.onFiliz,
      arka: row.arkaFiliz
    };
    
    // İyilestirAll'daki filiz skorlama mantığını uygula
    const scoreFiliz = (row, filiz) => {
      const { on, arka } = filiz;
      
      // Reject invalid values
      if (on < 2.5 || arka < 0) return -Infinity;
      
      // Rule 1: Q type, Döşeme → strongly prefer önFiliz = 22.5
      if (row.hasirTipi.startsWith('Q') && row.hasirTuru === 'Döşeme') {
        // Use a tighter threshold (0.5 instead of 1) and higher score (1000 instead of 500)
        return Math.abs(on - 22.5) < 0.5 ? 1000 : 
               (Math.abs(on - 22.5) < 1 ? 500 : 
               (on > 15.5 ? 100 + on : on));
      }
      
      // Rule 2: Perde → prefer ön = 15, arka = 75
      if (row.hasirTipi.startsWith('Q') && (row.hasirTuru === 'Perde' || row.hasirTuru === 'DK Perde')) {
        // Use a tighter threshold for more precision and higher scores
        const onScore = Math.abs(on - 15) < 0.5 ? 1000 : 
                       (Math.abs(on - 15) < 1 ? 500 : 0);
        const arkaScore = Math.abs(arka - 75) < 0.5 ? 1000 : 
                         (Math.abs(arka - 75) < 1 ? 500 : 0);
        
        // Special case: If arka is a multiple of 5, add bonus
        const arkaBonus = Math.abs(arka % 5) < 0.1 ? 200 : 0;
        
        return onScore + arkaScore + arkaBonus;
      }
      
      // Rule 3: Other Q types (not Perde/DK Perde and not Döşeme)
      if (row.hasirTipi.startsWith('Q')) {
        // Still prefer önFiliz > 15.5 for other Q types
        return on > 15.5 ? 100 + on : on;
      }
      
      // Rule 4: Non-Q types
      // For other hasır types, use a basic score based on reasonable ranges
      let score = 0;
      
      // Reasonable filiz ranges for other types
      if (on >= 10 && on <= 25) score += 50;
      if (arka >= 10 && arka <= 25) score += 50;
      
      return score;
    };
    
    const initialScore = scoreFiliz(row, initialFiliz);
    const optimizedScore = scoreFiliz(row, optimizedFiliz);
    
    // Keep better one - Use initial filiz values if they score better
    if (initialScore > optimizedScore) {
      row.onFiliz = initialFiliz.on;
      row.arkaFiliz = initialFiliz.arka;
      row.modified.onFiliz = true;
      row.modified.arkaFiliz = true;
    }
    
    // Ağırlık hesapla
    calculateWeight(row);
    
    // Filiz değişiklikleri için açıklama ekle - en iyi değerler artık kaydedilmiş durumda
    if (oldFilizValues.solFiliz !== row.solFiliz || 
        oldFilizValues.sagFiliz !== row.sagFiliz ||
        oldFilizValues.onFiliz !== row.onFiliz ||
        oldFilizValues.arkaFiliz !== row.arkaFiliz) {
      newAciklama += `Filiz değerleri optimize edildi: Ön: ${row.onFiliz.toFixed(2)}cm, Arka: ${row.arkaFiliz.toFixed(2)}cm, Sol/Sağ: ${row.solFiliz.toFixed(2)}cm. `;
    }
  }
  
  // Eğer ürün üretilemez durumdaysa
  if (row.uretilemez) {
    newAciklama = 'ÜRETİLEMEZ! ' + newAciklama;
  } else if (newAciklama === '') {
    newAciklama = 'İyileştirme işlemi tamamlandı.';
  }
  
  // Önceki açıklama ile yeni açıklamayı birleştir
  if (previousAciklama) {
    // Eğer önceki açıklama zaten "ÜRETİLEMEZ!" içeriyorsa ve şimdi de üretilemezse tekrar ekleme
    if (row.uretilemez && previousAciklama.includes('ÜRETİLEMEZ!')) {
      row.aciklama = previousAciklama + ' ' + newAciklama.replace('ÜRETİLEMEZ! ', '');
    } else {
      row.aciklama = previousAciklama + ' ' + newAciklama;
    }
  } else {
    row.aciklama = newAciklama;
  }
  
  // İşlem bittiğinde durumu güncelle ve görsel işareti kaldır
  await new Promise(resolve => setTimeout(resolve, 500));
  setProcessingRowIndex(null);
  setRows(updatedRows);
};

// Tüm satırları iyileştir
const iyilestirAll = async () => {
  // İşlemden önce tüm satırları yedekle
  backupAllRows();
  
  // Toplu işleme durumunu başlat
  setBatchProcessing(true);
  
  try {
    const updatedRows = [...rows];
    
    // İyileştirilebilecek satırları bul (temel alanları dolu olanlar)
    const eligibleRowIndexes = updatedRows
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => isRowFilled(row))
      .map(({ index }) => index);
    
    if (eligibleRowIndexes.length === 0) {
      alert('İyileştirilebilecek satır bulunamadı. Lütfen en az bir satırda temel bilgileri doldurun.');
      setBatchProcessing(false);
      return;
    }
    
    // Her uygun satır için iyileştirme işlemini yap
    for (const rowIndex of eligibleRowIndexes) {
      setProcessingRowIndex(rowIndex);
      
      // İşlem için kısa bir bekletme
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // İyileştirme işlemini gerçekleştir
      const row = updatedRows[rowIndex];
      
      // Mevcut açıklamayı sakla
      const previousAciklama = row.aciklama || '';
      
      // Yeni bir sürece başladığımızı belirtmek için timestamp ekle
      const timestamp = new Date().toLocaleTimeString('tr-TR', {hour: '2-digit', minute: '2-digit'});
      let newAciklama = `[${timestamp} Toplu İyileştirme] `;
      let changesCount = 0; // Yapılan değişiklikleri sayan değişken
      
      // Temel değerler
      const hasirTipi = row.hasirTipi;
      const uzunlukBoy = parseFloat(row.uzunlukBoy);
      const uzunlukEn = parseFloat(row.uzunlukEn);
      const hasirSayisi = parseFloat(row.hasirSayisi);
      
      // Başlangıç değerlerini hatırla
      const originalValues = {
        uzunlukBoy: uzunlukBoy,
        uzunlukEn: uzunlukEn,
        hasirSayisi: hasirSayisi
      };
      
      let isImproved = false;
      
      // Modified durumlarını temizle - Tüm filiz değerleri için sıfırlama
      row.modified = {
        uzunlukBoy: false,
        uzunlukEn: false,
        hasirSayisi: false,
        cubukSayisiBoy: false,
        cubukSayisiEn: false,
        solFiliz: false,
        sagFiliz: false,
        onFiliz: false,
        arkaFiliz: false,
        hasirTuru: false
      };
      
      // Üretilemez durumunu sıfırla
      row.uretilemez = false;
      
      // 0. Tüm değerleri başlangıçta hesapla veya yeniden hesapla
      if (!row.boyCap || !row.enCap || !row.boyAraligi || !row.enAraligi) {
        updateRowFromHasirTipi(updatedRows, rowIndex);
        changesCount++;
        newAciklama += "1. Hasır tipi özellikleri güncellendi. ";
      }
      
      // Çubuk sayılarının hesaplanmasını sağla
      const oldCubukSayisiBoy = row.cubukSayisiBoy;
      const oldCubukSayisiEn = row.cubukSayisiEn;
      initializeCubukSayisi(row);
      if (oldCubukSayisiBoy !== row.cubukSayisiBoy || oldCubukSayisiEn !== row.cubukSayisiEn) {
        changesCount++;
        newAciklama += `2. Çubuk sayıları hesaplandı (Boy: ${row.cubukSayisiBoy}, En: ${row.cubukSayisiEn}). `;
      }
      
      // Filiz değerlerini hesapla
      const oldFilizValues = {
        solFiliz: row.solFiliz,
        sagFiliz: row.sagFiliz,
        onFiliz: row.onFiliz,
        arkaFiliz: row.arkaFiliz
      };
      
      calculateFilizValues(row);
      
      const initialFiliz = {
        on: row.onFiliz,
        arka: row.arkaFiliz
      };
    

  
      if (oldFilizValues.solFiliz !== row.solFiliz || 
          oldFilizValues.sagFiliz !== row.sagFiliz ||
          oldFilizValues.onFiliz !== row.onFiliz ||
          oldFilizValues.arkaFiliz !== row.arkaFiliz) {
        changesCount++;
        newAciklama += `3. Filiz değerleri hesaplandı (Sol: ${row.solFiliz.toFixed(2)}, Sağ: ${row.sagFiliz.toFixed(2)}, Ön: ${row.onFiliz.toFixed(2)}, Arka: ${row.arkaFiliz.toFixed(2)}). `;
      }
      
      // Ağırlık hesapla
      calculateWeight(row);
      
      // 1. Q tipi için Boy/En değiştirmeyi dene
      if (hasirTipi.startsWith('Q')) {
        const oldUzunlukBoy = row.uzunlukBoy;
        const oldUzunlukEn = row.uzunlukEn;
        
        isImproved = trySwapBoyEn(row);
        
        if (isImproved) {
          changesCount++;
          newAciklama += `4. Boy ve En değerleri değiştirildi (${oldUzunlukBoy} × ${oldUzunlukEn} ➝ ${row.uzunlukBoy} × ${row.uzunlukEn}). `;
        }
      }
      
      // 2. Limitin altındaki değerler için çarpma dene
      if (!isImproved && !isMachineLimitsOk(row)) {
        const oldUzunlukBoy = row.uzunlukBoy;
        const oldUzunlukEn = row.uzunlukEn;
        const oldHasirSayisi = row.hasirSayisi;
        
        isImproved = tryMultiplyDimensions(row, originalValues);
        
        if (isImproved) {
          changesCount++;
          if (oldUzunlukBoy !== row.uzunlukBoy) {
            newAciklama += `5. Boy ölçüsü değiştirildi (${oldUzunlukBoy} ➝ ${row.uzunlukBoy}). `;
          }
          if (oldUzunlukEn !== row.uzunlukEn) {
            newAciklama += `6. En ölçüsü değiştirildi (${oldUzunlukEn} ➝ ${row.uzunlukEn}). `;
          }
          if (oldHasirSayisi !== row.hasirSayisi) {
            newAciklama += `7. Hasır sayısı güncellendi (${oldHasirSayisi} ➝ ${row.hasirSayisi}). `;
          }
        }
      }
      
      // 3. Çubuk sayılarını ayarlayarak filiz değerlerini optimize et
      if (!row.uretilemez) {
        // Çubuk sayılarını ve filiz değerlerini kaydet
        const oldCubukSayisiBoy = row.cubukSayisiBoy;
        const oldCubukSayisiEn = row.cubukSayisiEn;
        const oldFilizValues = {
          solFiliz: row.solFiliz,
          sagFiliz: row.sagFiliz,
          onFiliz: row.onFiliz,
          arkaFiliz: row.arkaFiliz
        };
        
        // Filiz değerlerini optimize et
        optimizeFilizValues(row);
        
        const optimizedFiliz = {
          on: row.onFiliz,
          arka: row.arkaFiliz
        };
        
        const scoreFiliz = (row, filiz) => {
            const { on, arka } = filiz;
          
            // Reject invalid values
            if (on < 2.5 || arka < 0) return -Infinity;
          
            // Rule 1: Q type, Döşeme → strongly prefer önFiliz = 22.5
            if (row.hasirTipi.startsWith('Q') && row.hasirTuru === 'Döşeme') {
                // Use a tighter threshold (0.5 instead of 1) and higher score (1000 instead of 500)
                return Math.abs(on - 22.5) < 0.5 ? 1000 : 
                       (Math.abs(on - 22.5) < 1 ? 500 : 
                       (on > 15.5 ? 100 + on : on));
            }
          
            // Rule 2: Perde → prefer ön = 15, arka = 75
            if (row.hasirTipi.startsWith('Q') && (row.hasirTuru === 'Perde' || row.hasirTuru === 'DK Perde')) {
                // Use a tighter threshold for more precision and higher scores
                const onScore = Math.abs(on - 15) < 0.5 ? 1000 : 
                               (Math.abs(on - 15) < 1 ? 500 : 0);
                const arkaScore = Math.abs(arka - 75) < 0.5 ? 1000 : 
                                 (Math.abs(arka - 75) < 1 ? 500 : 0);
                
                // Special case: If arka is a multiple of 5, add bonus
                const arkaBonus = Math.abs(arka % 5) < 0.1 ? 200 : 0;
                
                return onScore + arkaScore + arkaBonus;
            }
            
            // Rule 3: Other Q types (not Perde/DK Perde and not Döşeme)
            if (row.hasirTipi.startsWith('Q')) {
                // Still prefer önFiliz > 15.5 for other Q types
                return on > 15.5 ? 100 + on : on;
            }
          
            // Rule 4: Non-Q types
            // For other hasır types, use a basic score based on reasonable ranges
            let score = 0;
            
            // Reasonable filiz ranges for other types
            if (on >= 10 && on <= 25) score += 50;
            if (arka >= 10 && arka <= 25) score += 50;
            
            return score;
        };
                
        const initialScore = scoreFiliz(row, initialFiliz);
        const optimizedScore = scoreFiliz(row, optimizedFiliz);
        
        
        // Keep better one
        if (initialScore > optimizedScore) {
            row.onFiliz = initialFiliz.on;
            row.arkaFiliz = initialFiliz.arka;
            row.modified.onFiliz = true;
            row.modified.arkaFiliz = true;
        }
          
        // Değişiklik olmuşsa rapor et
        if (oldCubukSayisiBoy !== row.cubukSayisiBoy || oldCubukSayisiEn !== row.cubukSayisiEn) {
          changesCount++;
          newAciklama += `8. Çubuk sayıları optimize edildi (Boy: ${oldCubukSayisiBoy} ➝ ${row.cubukSayisiBoy}, En: ${oldCubukSayisiEn} ➝ ${row.cubukSayisiEn}). `;
        }
        
        if (oldFilizValues.solFiliz !== row.solFiliz || 
            oldFilizValues.sagFiliz !== row.sagFiliz ||
            oldFilizValues.onFiliz !== row.onFiliz ||
            oldFilizValues.arkaFiliz !== row.arkaFiliz) {
          changesCount++;
          newAciklama += `9. Filiz değerleri optimize edildi (Sol/Sağ: ${row.solFiliz.toFixed(2)}cm, Ön/Arka: ${row.onFiliz.toFixed(2)}cm). `;
          
          // Q tipi için Döşeme hasır türü için özel mesaj
          if (row.hasirTipi.startsWith('Q') && row.hasirTuru === 'Döşeme' && 
              (row.onFiliz >= 15 && row.onFiliz <= 23)) {
            newAciklama += `Döşeme tipi Q hasır için filiz değerleri standart aralığa (15-23cm) getirildi. `;
          }
          
          // Perde tipi için özel mesaj
          if ((row.hasirTuru === 'Perde' || row.hasirTuru === 'DK Perde') && 
              Math.abs(row.arkaFiliz % 5) < 0.1) {
            newAciklama += `Arka filiz değeri ${row.arkaFiliz.toFixed(0)}cm (5'in katı) olarak ayarlandı. `;
          }
        }
        
        // Ağırlık hesapla
        calculateWeight(row);
      }
      
      // Eğer ürün üretilemez durumdaysa
      if (row.uretilemez) {
        newAciklama = 'ÜRETİLEMEZ! ' + newAciklama;
      } else if (changesCount === 0) {
        newAciklama += 'Herhangi bir değişiklik yapılmadı, ürün zaten optimum durumda.';
      }
      
      // Önceki açıklama ile yeni açıklamayı akıllıca birleştir
      if (previousAciklama) {
        // Eğer önceki açıklama zaten "ÜRETİLEMEZ!" içeriyorsa ve şimdi de üretilemezse tekrar ekleme
        if (row.uretilemez && previousAciklama.includes('ÜRETİLEMEZ!')) {
          row.aciklama = previousAciklama + '\n' + newAciklama.replace('ÜRETİLEMEZ! ', '');
        } else {
          // Uzun açıklamaları birden fazla satıra böl
          row.aciklama = previousAciklama + '\n' + newAciklama;
        }
      } else {
        row.aciklama = newAciklama;
      }
    }
    
    // İşlemi tamamla
    setRows(updatedRows);
    setProcessingRowIndex(null);
    
    // Kısa bekletme
    await new Promise(resolve => setTimeout(resolve, 500));
    
  } catch (error) {
    console.error('Toplu iyileştirme hatası:', error);
    alert('Toplu iyileştirme sırasında bir hata oluştu: ' + error.message);
  }
  
  setBatchProcessing(false);
};

  // Makine limitlerine uygun mu kontrol et
  const isMachineLimitsOk = (row) => {
    const uzunlukBoy = parseFloat(row.uzunlukBoy);
    const uzunlukEn = parseFloat(row.uzunlukEn);
    
    return (
      uzunlukBoy >= MACHINE_LIMITS.MIN_BOY && 
      uzunlukBoy <= MACHINE_LIMITS.MAX_BOY &&
      uzunlukEn >= MACHINE_LIMITS.MIN_EN && 
      uzunlukEn <= MACHINE_LIMITS.MAX_EN
    );
  };

// Boy/En değerlerini değiştirmeyi dene (Sadece Q tipi için)
const trySwapBoyEn = (row) => {
   const uzunlukBoy = parseFloat(row.uzunlukBoy);
   const uzunlukEn = parseFloat(row.uzunlukEn);
   
   // CRITICAL: İlk önce En > MAX_EN (250cm) durumunu kontrol et
   if (uzunlukEn > MACHINE_LIMITS.MAX_EN) {
       console.log("En değeri MAX_EN'i aşıyor, takas deneniyor...", uzunlukEn, MACHINE_LIMITS.MAX_EN);
       
       // Durum 1: En > 250 fakat < 275 (doğrudan Boy olamaz)
       if (uzunlukEn < MACHINE_LIMITS.MIN_BOY) {
           // Takas + çarpma işlemini dene
           const tempBoy = uzunlukEn;
           const tempEn = uzunlukBoy;
           
           // Yeni En için çarpma işlemi yardımcı olacak mı kontrol et
           for (let multiplier of [2, 3]) {
               if (tempEn * multiplier >= MACHINE_LIMITS.MIN_EN && tempEn * multiplier <= MACHINE_LIMITS.MAX_EN) {
                   // Takas ve çarpma işlemi uygulanabilir
                   row.uzunlukBoy = tempBoy.toString();
                   row.uzunlukEn = (tempEn * multiplier).toString();
                   row.hasirSayisi = (parseFloat(row.hasirSayisi) / multiplier).toString();
                   
                   row.modified.uzunlukBoy = true;
                   row.modified.uzunlukEn = true;
                   row.modified.hasirSayisi = true;
                   
                   row.aciklama += `En değeri (${uzunlukEn}cm) makine limitini aştığı için En/Boy değiştirildi, yeni En değeri ${multiplier} ile çarpılarak ${(tempEn * multiplier).toFixed(2)}cm yapıldı. `;
                   
                   // Hasır türünü ve diğer değerleri güncelle
                   row.hasirTuru = determineHasirTuru(row.hasirTipi, row.uzunlukBoy);
                   initializeCubukSayisi(row);
                   calculateFilizValues(row);
                   
                   return true;
               }
           }
       }
       // Durum 2: En >= 275 (doğrudan Boy olabilir)
       else if (uzunlukEn >= MACHINE_LIMITS.MIN_BOY && uzunlukEn <= MACHINE_LIMITS.MAX_BOY) {
           // Boy and En değerlerini değiştir
           [row.uzunlukBoy, row.uzunlukEn] = [row.uzunlukEn, row.uzunlukBoy];
           row.modified.uzunlukBoy = true;
           row.modified.uzunlukEn = true;
           
           row.aciklama += `En değeri (${uzunlukEn}cm) makine limitini (${MACHINE_LIMITS.MAX_EN}cm) aştığı için Boy/En değerleri değiştirildi. `;
           
           // Hasır türünü güncelle
           row.hasirTuru = determineHasirTuru(row.hasirTipi, row.uzunlukBoy);
           
           // Çubuk ve filiz değerlerini yeniden hesapla
           initializeCubukSayisi(row);
           calculateFilizValues(row);
           
           return true;
       }
   }
   
   // Q tipi için orijinal kod
   if (row.hasirTipi.startsWith('Q')) {
       // Değiştirince makine limitlerini karşılıyor mu?
       if (uzunlukEn >= MACHINE_LIMITS.MIN_BOY && uzunlukEn <= MACHINE_LIMITS.MAX_BOY &&
           uzunlukBoy >= MACHINE_LIMITS.MIN_EN && uzunlukBoy <= MACHINE_LIMITS.MAX_EN) {
           
           // Boy ve En değerlerini değiştir
           [row.uzunlukBoy, row.uzunlukEn] = [row.uzunlukEn, row.uzunlukBoy];
           row.modified.uzunlukBoy = true;
           row.modified.uzunlukEn = true;
           
           row.aciklama += 'Boy ve en değerleri değiştirildi. ';
           
           // Hasır türünü güncelle
           row.hasirTuru = determineHasirTuru(row.hasirTipi, row.uzunlukBoy);
           
           // Çubuk ve filiz değerlerini yeniden hesapla
           initializeCubukSayisi(row);
           calculateFilizValues(row);
           
           return true;
       }
   }
 
   return false;
};

// Replace the entire tryMultiplyDimensions function
const tryMultiplyDimensions = (row, originalValues) => {
  const uzunlukBoy = parseFloat(originalValues.uzunlukBoy);
  const uzunlukEn = parseFloat(originalValues.uzunlukEn);
  const hasirSayisi = parseFloat(originalValues.hasirSayisi);
  
  // STEP 1: First check if En exceeds maximum limit (250cm)
  if (uzunlukEn > MACHINE_LIMITS.MAX_EN) {
    // Try swapping dimensions
    if (uzunlukEn >= MACHINE_LIMITS.MIN_BOY && uzunlukEn <= MACHINE_LIMITS.MAX_BOY) {
      // Swap the dimensions
      row.uzunlukBoy = uzunlukEn.toString();
      row.uzunlukEn = uzunlukBoy.toString();
      row.modified.uzunlukBoy = true;
      row.modified.uzunlukEn = true;
      
      row.aciklama += `En değeri (${uzunlukEn}cm) makine limitini aştığı için En/Boy değerleri değiştirildi. `;
      
      // Update hasır türü after swap
      row.hasirTuru = determineHasirTuru(row.hasirTipi, row.uzunlukBoy);
      
      // After swap, check if new En value needs adjustment
      const newUzunlukEn = parseFloat(row.uzunlukEn);
      
      // If new En value is below minimum, try multiplication
      if (newUzunlukEn < MACHINE_LIMITS.MIN_EN) {
        for (let multiplier of [2, 3]) {
          const multipliedEn = newUzunlukEn * multiplier;
          
          if (multipliedEn >= MACHINE_LIMITS.MIN_EN && multipliedEn <= MACHINE_LIMITS.MAX_EN) {
            row.uzunlukEn = multipliedEn.toString();
            row.hasirSayisi = (hasirSayisi / multiplier).toString();
            row.modified.uzunlukEn = true;
            row.modified.hasirSayisi = true;
            
            row.aciklama += `Değiştirme sonrası En ölçüsü ${multiplier} ile çarpılarak ${multipliedEn.toFixed(2)}cm yapıldı, hasır sayısı ${(hasirSayisi / multiplier).toFixed(2)} olarak güncellendi. `;
            
            // Recalculate values after both swap and multiplication
            initializeCubukSayisi(row);
            calculateFilizValues(row);
            
            return true;
          }
        }
      } else {
        // Just the swap was sufficient
        initializeCubukSayisi(row);
        calculateFilizValues(row);
        return true;
      }
    }
  }
  
  // Boy için çarpma işlemi
  if (uzunlukBoy < MACHINE_LIMITS.MIN_BOY) {
    // 2 veya 3 ile çarparak minimum limitin üstüne çıkabilir mi?
    for (let multiplier of [2, 3]) {
      const newUzunlukBoy = uzunlukBoy * multiplier;
      
      if (newUzunlukBoy >= MACHINE_LIMITS.MIN_BOY && newUzunlukBoy <= MACHINE_LIMITS.MAX_BOY) {
        row.uzunlukBoy = newUzunlukBoy.toString();
        row.hasirSayisi = (hasirSayisi / multiplier).toString();
        row.modified.uzunlukBoy = true;
        row.modified.hasirSayisi = true;
        
        row.aciklama += `Boy ölçüsü ${multiplier} ile çarpılarak ${newUzunlukBoy.toFixed(2)} cm yapıldı, hasır sayısı ${(hasirSayisi / multiplier).toFixed(2)} olarak güncellendi. `;
        
        // Hasır türünü güncelle
        row.hasirTuru = determineHasirTuru(row.hasirTipi, row.uzunlukBoy);
        
        // Değerler değiştiğinde diğer hesaplamaları yeniden yap
        initializeCubukSayisi(row);
        calculateFilizValues(row);
        
        return true;
      }
    }
  }
    
  // En için çarpma işlemi
  if (uzunlukEn < MACHINE_LIMITS.MIN_EN) {
    // Önce 126-149 arası ise otomatik düzeltme yap
    if (uzunlukEn >= MACHINE_LIMITS.MIN_EN_ADJUSTABLE && uzunlukEn < MACHINE_LIMITS.MIN_EN) {
      row.uzunlukEn = MACHINE_LIMITS.MIN_EN.toString();
      row.modified.uzunlukEn = true;
      
      row.aciklama += `En ölçüsü otomatik olarak ${MACHINE_LIMITS.MIN_EN} cm'e ayarlandı. `;
      
      // Değerler değiştiğinde diğer hesaplamaları yeniden yap
      initializeCubukSayisi(row);
      calculateFilizValues(row);
      
      return true;
    }
    
    // Değilse 2 veya 3 ile çarparak minimum limitin üstüne çıkabilir mi?
    for (let multiplier of [2, 3]) {
      const newUzunlukEn = uzunlukEn * multiplier;
      
      if (newUzunlukEn >= MACHINE_LIMITS.MIN_EN && newUzunlukEn <= MACHINE_LIMITS.MAX_EN) {
        row.uzunlukEn = newUzunlukEn.toString();
        row.hasirSayisi = (hasirSayisi / multiplier).toString();
        row.modified.uzunlukEn = true;
        row.modified.hasirSayisi = true;
        
        row.aciklama += `En ölçüsü ${multiplier} ile çarpılarak ${newUzunlukEn.toFixed(2)} cm yapıldı, hasır sayısı ${(hasirSayisi / multiplier).toFixed(2)} olarak güncellendi. `;
        
        // Değerler değiştiğinde diğer hesaplamaları yeniden yap
        initializeCubukSayisi(row);
        calculateFilizValues(row);
        
        return true;
      }
    }
  }
  
  // Hiçbir iyileştirme yapılamazsa
  if (!isMachineLimitsOk(row)) {
    row.uretilemez = true;
    row.aciklama += 'Makine limitlerine uygun boyutlara getirilemedi. ';
    return false;
  }
  
  return false;
};

// Filiz değerlerini optimize etme - Döşeme tipi için iyileştirildi
const optimizeFilizValues = (row) => {
  // Hasır türüne göre filiz limitleri al
  const filizLimits = getFilizLimits(row.hasirTipi, row.hasirTuru);
  
  // Mevcut filiz değerlerini kontrol et
  const currentFilizValues = {
    onFiliz: parseFloat(row.onFiliz),
    arkaFiliz: parseFloat(row.arkaFiliz),
    solFiliz: parseFloat(row.solFiliz),
    sagFiliz: parseFloat(row.sagFiliz)
  };
  
  // Q tipi Döşeme hasırları için özel optimizasyon - İlk kontrolde hemen yap
  if (row.hasirTipi.startsWith('Q') && row.hasirTuru === 'Döşeme') {
    // İdeal filiz değerleri (15-23 cm arasında)
    const targetFilizMin = 15;
    const targetFilizMax = 23;
    const targetFilizOptimal = 22.5;
    
    // Mevcut değerler uygun mu? Değilse optimize et
    if (currentFilizValues.onFiliz < targetFilizMin || 
        currentFilizValues.onFiliz > targetFilizMax || 
        currentFilizValues.arkaFiliz < targetFilizMin || 
        currentFilizValues.arkaFiliz > targetFilizMax) {
      
      // İdeal çubuk sayısını bulmaya çalışalım
      const uzunlukBoy = parseFloat(row.uzunlukBoy);
      const enAraligi = parseFloat(row.enAraligi);
      
      // İdeal aralıkta filiz değeri için gerekli çubuk sayısı
      const targetFiliz = targetFilizOptimal;
      
      // Çubuk sayısı için başlangıç değeri
      let cubukSayisiEn = Math.floor((uzunlukBoy - (2 * targetFiliz)) / enAraligi) + 1;
      
      // Çubuk sayısı mantıklı değilse (çok küçük veya büyük) varsayılan değer kalsın
      if (cubukSayisiEn < 2) {
        cubukSayisiEn = 2;
      }
      
      // Yeni çubuk sayısıyla filiz değeri
      const yeniFiliz = (uzunlukBoy - ((cubukSayisiEn - 1) * enAraligi)) / 2;
      
      // Yeni değerler hedef aralıkta mı kontrol et
      if (yeniFiliz >= targetFilizMin && yeniFiliz <= targetFilizMax) {
        // İdeal değerleri güncelle
        row.cubukSayisiEn = cubukSayisiEn;
        row.onFiliz = yeniFiliz;
        row.arkaFiliz = yeniFiliz;
        row.modified.cubukSayisiEn = true;
        return;
      }
      
      // Eğer ilk deneme başarısız olduysa, daha kapsamlı bir aramaya geç
      const minEnCount = Math.max(2, parseInt(row.cubukSayisiEn) - 10);
      const maxEnCount = parseInt(row.cubukSayisiEn) + 10;
      
      let bestEnCount = parseInt(row.cubukSayisiEn);
      let bestFilizValue = yeniFiliz;
      let minDifference = Math.abs(bestFilizValue - targetFilizOptimal);
      
      // Tüm makul çubuk sayılarını dene
      for (let enCount = minEnCount; enCount <= maxEnCount; enCount++) {
        const testFiliz = (uzunlukBoy - ((enCount - 1) * enAraligi)) / 2;
        
        // Hedef aralıkta mı?
        if (testFiliz >= targetFilizMin && testFiliz <= targetFilizMax) {
          const difference = Math.abs(testFiliz - targetFilizOptimal);
          
          // Daha iyi bir eşleşme bulundu mu?
          if (difference < minDifference) {
            minDifference = difference;
            bestEnCount = enCount;
            bestFilizValue = testFiliz;
          }
        }
      }
      
      // En iyi değeri bulduk mu?
      if (bestFilizValue >= targetFilizMin && bestFilizValue <= targetFilizMax) {
        row.cubukSayisiEn = bestEnCount;
        row.onFiliz = bestFilizValue;
        row.arkaFiliz = bestFilizValue;
        row.modified.cubukSayisiEn = true;
        return;
      }
    }
  }
  
  // Perde ve DK Perde tipleri için özel optimizasyon
  if ((row.hasirTuru === 'Perde' || row.hasirTuru === 'DK Perde') && 
      row.hasirTipi.startsWith('Q')) {
    optimizePerdeFilizValues(row, filizLimits);
    return;
  }
  
  // Diğer hasır tipleri için genel optimizasyon
  // Olası tüm çubuk sayısı kombinasyonlarını dene
  const validCombinations = [];
  
  // Mevcut çubuk sayılarını al
  const currentBoyCount = parseInt(row.cubukSayisiBoy);
  const currentEnCount = parseInt(row.cubukSayisiEn);
  
  // Test edilecek çubuk sayısı aralığını belirle (±10)
  const minBoyCount = Math.max(2, currentBoyCount - 10);
  const maxBoyCount = currentBoyCount + 10;
  const minEnCount = Math.max(2, currentEnCount - 10);
  const maxEnCount = currentEnCount + 10;
  
  const uzunlukBoy = parseFloat(row.uzunlukBoy);
  const uzunlukEn = parseFloat(row.uzunlukEn);
  const boyAraligi = parseFloat(row.boyAraligi);
  const enAraligi = parseFloat(row.enAraligi);
  
  // Tüm olası kombinasyonları dene
  for (let boyCount = minBoyCount; boyCount <= maxBoyCount; boyCount++) {
    for (let enCount = minEnCount; enCount <= maxEnCount; enCount++) {
      // Bu kombinasyon için filiz değerlerini hesapla
      const testFilizValues = calculateTestFilizValues(uzunlukBoy, uzunlukEn, boyCount, enCount, boyAraligi, enAraligi);
      
      // Filiz değerleri geçerli mi kontrol et
      if (isFilizValuesValid(testFilizValues, filizLimits)) {
        // Kombinasyonu puan sistemiyle değerlendir
        const score = calculateFilizScore(testFilizValues, row.hasirTuru, row.hasirTipi);        
        validCombinations.push({
          boyCount,
          enCount,
          filizValues: testFilizValues,
          score
        });
      }
    }
  }
  
  // Geçerli kombinasyon var mı kontrol et
  if (validCombinations.length > 0) {
    // En yüksek puanlı kombinasyonu bul
    validCombinations.sort((a, b) => b.score - a.score);
    const bestCombination = validCombinations[0];
    
    // En iyi kombinasyonu uygula
    row.cubukSayisiBoy = bestCombination.boyCount;
    row.cubukSayisiEn = bestCombination.enCount;
    row.modified.cubukSayisiBoy = true;
    row.modified.cubukSayisiEn = true;
    
    // Filiz değerlerini güncelle
    row.solFiliz = parseFloat(bestCombination.filizValues.solFiliz.toFixed(5));
    row.sagFiliz = parseFloat(bestCombination.filizValues.sagFiliz.toFixed(5));
    row.onFiliz = parseFloat(bestCombination.filizValues.onFiliz.toFixed(5));
    row.arkaFiliz = parseFloat(bestCombination.filizValues.arkaFiliz.toFixed(5));
  } else {
    // Geçerli kombinasyon bulunamadıysa
    findBestApproximateFilizValues(row, filizLimits);
  }
};

// Döşeme tipi Q hasırları için filiz optimizasyonu fonksiyonu - Yeni eklenen fonksiyon
const optimizeDosemeQFilizValues = (row, filizLimits) => {
  const uzunlukBoy = parseFloat(row.uzunlukBoy);
  const uzunlukEn = parseFloat(row.uzunlukEn);
  const boyAraligi = parseFloat(row.boyAraligi);
  const enAraligi = parseFloat(row.enAraligi);
  
 // Hedef filiz aralığı (15-23 cm)
  const targetMin = 15;
  const targetMax = 23; 
  const targetOptimal = 22.5; 
  
  // Mevcut çubuk sayılarını al
  let currentBoyCount = parseInt(row.cubukSayisiBoy);
  let currentEnCount = parseInt(row.cubukSayisiEn);
  
  // Test edilecek çubuk sayısı aralığını belirle (±10)
  const minBoyCount = Math.max(2, currentBoyCount - 10);
  const maxBoyCount = currentBoyCount + 10;
  const minEnCount = Math.max(2, currentEnCount - 10);
  const maxEnCount = currentEnCount + 10;
  
  let bestCombination = null;
  let bestScore = -Infinity;
  
  // Tüm olası kombinasyonları dene
  for (let boyCount = minBoyCount; boyCount <= maxBoyCount; boyCount++) {
    for (let enCount = minEnCount; enCount <= maxEnCount; enCount++) {
      // Bu kombinasyon için filiz değerlerini hesapla
      const testFilizValues = calculateTestFilizValues(uzunlukBoy, uzunlukEn, boyCount, enCount, boyAraligi, enAraligi);
      
      // Filiz değerleri geçerli mi kontrol et - Döşeme için 15-22 aralığına odaklan
      const isValid = testFilizValues.solFiliz >= filizLimits.SAG_SOL_MIN && 
                      testFilizValues.solFiliz <= filizLimits.SAG_SOL_MAX &&
                      testFilizValues.onFiliz >= targetMin && 
                      testFilizValues.onFiliz <= targetMax &&
                      testFilizValues.arkaFiliz >= targetMin && 
                      testFilizValues.arkaFiliz <= targetMax;
      
      if (isValid) {
        // Döşeme tipi için özel puanlama - 15-22 aralığına odaklan
        let score = 0;
        
        // Ön/Arka filiz için puanlama - Optimale yakın olması önemli
        const onFilizDistance = Math.abs(testFilizValues.onFiliz - targetOptimal);
        const arkaFilizDistance = Math.abs(testFilizValues.arkaFiliz - targetOptimal);
        
        score += 100 - (onFilizDistance * 5); // Optimale yakınlığı ödüllendir
        score += 100 - (arkaFilizDistance * 5);
        
        // Sol/Sağ filizler için puanlama - Eşit ve ideal aralıkta olmalı
        const solSagDifference = Math.abs(testFilizValues.solFiliz - testFilizValues.sagFiliz);
        score -= solSagDifference * 10; // Sol/Sağ farkını cezalandır
        
        // Minimum ön/arka değerine yakınsa bonus puan
        if (testFilizValues.onFiliz >= targetMin && testFilizValues.onFiliz <= targetMin + 2) {
          score += 10;
        }
        
        if (testFilizValues.arkaFiliz >= targetMin && testFilizValues.arkaFiliz <= targetMin + 2) {
          score += 10;
        }
        
        // En iyi kombinasyonu güncelle
        if (score > bestScore) {
          bestScore = score;
          bestCombination = {
            boyCount,
            enCount,
            filizValues: testFilizValues
          };
        }
      }
    }
  }
  
  // En iyi kombinasyonu uygula
  if (bestCombination) {
    row.cubukSayisiBoy = bestCombination.boyCount;
    row.cubukSayisiEn = bestCombination.enCount;
    row.modified.cubukSayisiBoy = true;
    row.modified.cubukSayisiEn = true;
    
    // Filiz değerlerini güncelle
    row.solFiliz = parseFloat(bestCombination.filizValues.solFiliz.toFixed(5));
    row.sagFiliz = parseFloat(bestCombination.filizValues.sagFiliz.toFixed(5));
    row.onFiliz = parseFloat(bestCombination.filizValues.onFiliz.toFixed(5));
    row.arkaFiliz = parseFloat(bestCombination.filizValues.arkaFiliz.toFixed(5));
  } else {
    // Optimal bulunamadıysa en yakın yaklaşım
    findBestApproximateFilizValues(row, filizLimits);
  }
};

// Perde tipi hasırlar için filiz değerlerini optimize et
const optimizePerdeFilizValues = (row, filizLimits) => {
    const uzunlukBoy = parseFloat(row.uzunlukBoy);
    const enAraligi = parseFloat(row.enAraligi);
    
    // En çubuk sayısını sabit tut
    const cubukSayisiEn = row.hasirTuru === 'Perde' ? 18 : 21;
    
    // Toplam filiz hesapla
    const totalFiliz = uzunlukBoy - ((cubukSayisiEn - 1) * enAraligi);
    
    // Arka filiz için hedef değer - NEW LOGIC: Prefer 75cm
    let targetArkaFiliz = 75;
    
    // Eğer toplam filiz yeterli değilse, düşürmeye başla
    if (totalFiliz < 77.5) { // 2.5 (min on filiz) + 75 (target arka)
        if (totalFiliz >= 72.5) {
            targetArkaFiliz = 70;
        } else if (totalFiliz >= 67.5) {
            targetArkaFiliz = 65;
        } else {
            // Toplam filiz çok az, minimum değerlere düşür
            targetArkaFiliz = Math.max(65, totalFiliz - 2.5);
        }
    }
    
    // Ön filiz hesapla
    const onFiliz = totalFiliz - targetArkaFiliz;
    
    // Eğer ön filiz yeterli değilse (en az 2.5)
    if (onFiliz < 2.5) {
        // Arka filizi azalt
        targetArkaFiliz = totalFiliz - 2.5;
    }
    
    // Arka filizi 5'in en yakın katına yuvarla
    targetArkaFiliz = Math.round(targetArkaFiliz / 5) * 5;
    
    // Son ön filiz değeri (target 15cm if possible)
    let finalOnFiliz = totalFiliz - targetArkaFiliz;
    
    // Değerleri güncelle
    row.cubukSayisiEn = cubukSayisiEn;
    row.onFiliz = parseFloat(finalOnFiliz.toFixed(5));
    row.arkaFiliz = parseFloat(targetArkaFiliz.toFixed(5));
    
    // Değişiklik yapıldığını işaretle
    row.modified.cubukSayisiEn = true;
    
    // Açıklamaya bilgi ekle
    row.aciklama += `Perde tipi hasır için filiz değerleri optimize edildi: Ön: ${finalOnFiliz.toFixed(2)}cm, Arka: ${targetArkaFiliz}cm. `;
};

  // Test edilecek filiz değerlerini hesapla
  const calculateTestFilizValues = (uzunlukBoy, uzunlukEn, boyCount, enCount, boyAraligi, enAraligi) => {
    // Sol/Sag Filiz hesapla
    const solFiliz = (uzunlukEn - ((boyCount - 1) * boyAraligi)) / 2;
    
    // On/Arka Filiz hesapla
    const onFiliz = (uzunlukBoy - ((enCount - 1) * enAraligi)) / 2;
    
    return {
      solFiliz,
      sagFiliz: solFiliz,
      onFiliz,
      arkaFiliz: onFiliz
    };
  };

  // Filiz değerleri geçerli mi kontrol et
  const isFilizValuesValid = (filizValues, limits) => {
    const { solFiliz, sagFiliz, onFiliz, arkaFiliz } = filizValues;
    
    // Değerlerin sayısal olup olmadığını kontrol et
    if (isNaN(solFiliz) || isNaN(sagFiliz) || isNaN(onFiliz) || isNaN(arkaFiliz)) {
      return false;
    }
    
    // Negatif değerler olup olmadığını kontrol et
    if (solFiliz < 0 || sagFiliz < 0 || onFiliz < 0 || arkaFiliz < 0) {
      return false;
    }
    
    // Limitleri kontrol et
    const isSolValid = solFiliz >= limits.SAG_SOL_MIN && solFiliz <= limits.SAG_SOL_MAX;
    const isSagValid = sagFiliz >= limits.SAG_SOL_MIN && sagFiliz <= limits.SAG_SOL_MAX;
    
    let isOnValid = true;
    let isArkaValid = true;
    
    if (limits.hasOwnProperty('ON_ARKA_MIN')) {
      // Standart ön/arka limit kontrolü
      isOnValid = onFiliz >= limits.ON_ARKA_MIN && (limits.ON_ARKA_MAX ? onFiliz <= limits.ON_ARKA_MAX : true);
      isArkaValid = arkaFiliz >= limits.ON_ARKA_MIN && (limits.ON_ARKA_MAX ? arkaFiliz <= limits.ON_ARKA_MAX : true);
    } else {
      // Perde tipi ön/arka limit kontrolü
      isOnValid = onFiliz >= limits.ON_MIN;
      isArkaValid = arkaFiliz >= limits.ARKA_MIN;
    }
    
    return isSolValid && isSagValid && isOnValid && isArkaValid;
  };

  // Filiz değerleri için puan hesapla
   const calculateFilizScore = (filizValues, hasirTuru, hasirTipi) => {
      let score = 0;
      const { solFiliz, sagFiliz, onFiliz, arkaFiliz } = filizValues;
      
      // İdeal aralıklarda olması için puan ver
      if (solFiliz >= 2 && solFiliz <= 8) score += 5;
      if (sagFiliz >= 2 && sagFiliz <= 8) score += 5;
      
      if (hasirTuru === 'Perde' || hasirTuru === 'DK Perde') {
          // Perde hasırı için ön filiz min 2.5 olmalı
          if (onFiliz >= 2.5) score += 10;
          
          // Perde hasırı için arka filiz min 65 olmalı
          if (arkaFiliz >= 65) score += 15;
          
          // IMPORTANT: Perde hasırı için ideal değerler (15-75)
          if (Math.abs(onFiliz - 15) < 1) score += 100; // Ön filiz ~15 için çok yüksek bonus
          if (Math.abs(arkaFiliz - 75) < 1) score += 100; // Arka filiz ~75 için çok yüksek bonus
          
          // Perde hasırı için arka filiz 5'in katı olması tercih edilir
          const remainder = arkaFiliz % 5;
          if (remainder < 0.1 || remainder > 4.9) {
              score += 20; // 5'in katı için yüksek puan
          }
      } else if (hasirTipi?.startsWith('Q') && hasirTuru === 'Döşeme') {
          // Q tipi Döşeme için ideal değer 22.5
          if (Math.abs(onFiliz - 22.5) < 1) score += 100; // Ön filiz ~22.5 için çok yüksek bonus
          if (Math.abs(arkaFiliz - 22.5) < 1) score += 100; // Arka filiz ~22.5 için çok yüksek bonus
          
          // Genel puan
          if (onFiliz > 15.5) score += 30; // 15.5'den büyük için bonus
          if (arkaFiliz > 15.5) score += 30;
          if (onFiliz >= 15 && onFiliz <= 23) score += 10;
          if (arkaFiliz >= 15 && arkaFiliz <= 23) score += 10;
      } else {
          // Diğer hasır tipleri için ön/arka filiz ideal aralıkları
          if (onFiliz >= 15 && onFiliz <= 22) score += 10;
          if (arkaFiliz >= 15 && arkaFiliz <= 22) score += 10;
      }
      
      return score;
  }

  // En yakın geçerli filiz değerlerini bul
  const findBestApproximateFilizValues = (row, filizLimits) => {
    const currentBoyCount = parseInt(row.cubukSayisiBoy);
    const currentEnCount = parseInt(row.cubukSayisiEn);
    
    let bestBoyCount = currentBoyCount;
    let bestEnCount = currentEnCount;
    let minFilizError = Number.MAX_VALUE;
    
    const uzunlukBoy = parseFloat(row.uzunlukBoy);
    const uzunlukEn = parseFloat(row.uzunlukEn);
    const boyAraligi = parseFloat(row.boyAraligi);
    const enAraligi = parseFloat(row.enAraligi);
    
    // Test edilecek çubuk sayısı aralığını belirle
    const minBoyCount = Math.max(2, currentBoyCount - 10);
    const maxBoyCount = currentBoyCount + 10;
    const minEnCount = Math.max(2, currentEnCount - 10);
    const maxEnCount = currentEnCount + 10;
    
    // Perde ve DK Perde tipleri için En çubuk sayısını sabit tut
    if ((row.hasirTuru === 'Perde' || row.hasirTuru === 'DK Perde') && 
        row.hasirTipi.startsWith('Q')) {
      const fixedEnCount = row.hasirTuru === 'Perde' ? 18 : 21;
      
      // Boy çubuk sayısı için en iyi değeri bul
      for (let boyCount = minBoyCount; boyCount <= maxBoyCount; boyCount++) {
        const testFilizValues = calculateTestFilizValues(uzunlukBoy, uzunlukEn, boyCount, fixedEnCount, boyAraligi, enAraligi);
        const error = calculateFilizError(testFilizValues, filizLimits);
        
        if (error < minFilizError) {
          minFilizError = error;
          bestBoyCount = boyCount;
          bestEnCount = fixedEnCount;
        }
      }
    } else {
      // En az hatalı kombinasyonu bul
      for (let boyCount = minBoyCount; boyCount <= maxBoyCount; boyCount++) {
        for (let enCount = minEnCount; enCount <= maxEnCount; enCount++) {
          // Bu kombinasyon için filiz değerlerini hesapla
          const testFilizValues = calculateTestFilizValues(uzunlukBoy, uzunlukEn, boyCount, enCount, boyAraligi, enAraligi);
          
          // Limitlere göre hata hesapla
          const error = calculateFilizError(testFilizValues, filizLimits);
          
          if (error < minFilizError) {
            minFilizError = error;
            bestBoyCount = boyCount;
            bestEnCount = enCount;
          }
        }
      }
    }
    
    // En iyi yaklaşık değerleri uygula
    if (bestBoyCount !== currentBoyCount || bestEnCount !== currentEnCount) {
      row.cubukSayisiBoy = bestBoyCount;
      row.cubukSayisiEn = bestEnCount;
      row.modified.cubukSayisiBoy = (bestBoyCount !== currentBoyCount);
      row.modified.cubukSayisiEn = (bestEnCount !== currentEnCount);
      
      // Filiz değerlerini hesapla
      const bestFilizValues = calculateTestFilizValues(uzunlukBoy, uzunlukEn, bestBoyCount, bestEnCount, boyAraligi, enAraligi);
      
      row.solFiliz = parseFloat(bestFilizValues.solFiliz.toFixed(5));
      row.sagFiliz = parseFloat(bestFilizValues.sagFiliz.toFixed(5));
      row.onFiliz = parseFloat(bestFilizValues.onFiliz.toFixed(5));
      row.arkaFiliz = parseFloat(bestFilizValues.arkaFiliz.toFixed(5));
      
      // Perde tipi için arka filizi 5'in katına yuvarla
      if ((row.hasirTuru === 'Perde' || row.hasirTuru === 'DK Perde') && 
          row.hasirTipi.startsWith('Q')) {
        const totalFiliz = row.onFiliz + row.arkaFiliz;
        let targetArkaFiliz = Math.round(row.arkaFiliz / 5) * 5;
        
        // Arka filiz en az 65cm olmalı
        targetArkaFiliz = Math.max(65, targetArkaFiliz);
        
        // Ön filiz hesapla ve kontrol et
        const onFiliz = totalFiliz - targetArkaFiliz;
        
        // Eğer ön filiz yeterli ise (en az 2.5)
        if (onFiliz >= 2.5) {
          row.onFiliz = parseFloat(onFiliz.toFixed(5));
          row.arkaFiliz = parseFloat(targetArkaFiliz.toFixed(5));
        }
      }
    }
  };

  // Filiz limitlerine göre hata hesapla
  const calculateFilizError = (filizValues, limits) => {
    const { solFiliz, sagFiliz, onFiliz, arkaFiliz } = filizValues;
    let error = 0;
    
    // Sağ/sol filiz hata hesapla
    if (solFiliz < limits.SAG_SOL_MIN) {
      error += limits.SAG_SOL_MIN - solFiliz;
    } else if (solFiliz > limits.SAG_SOL_MAX) {
      error += solFiliz - limits.SAG_SOL_MAX;
    }
    
    if (sagFiliz < limits.SAG_SOL_MIN) {
      error += limits.SAG_SOL_MIN - sagFiliz;
    } else if (sagFiliz > limits.SAG_SOL_MAX) {
      error += sagFiliz - limits.SAG_SOL_MAX;
    }
    
    // Ön/arka filiz hata hesapla
    if (limits.hasOwnProperty('ON_ARKA_MIN')) {
      // Standart ön/arka filiz kontrolü
      if (onFiliz < limits.ON_ARKA_MIN) {
        error += limits.ON_ARKA_MIN - onFiliz;
      } else if (limits.ON_ARKA_MAX && onFiliz > limits.ON_ARKA_MAX) {
        error += onFiliz - limits.ON_ARKA_MAX;
      }
      
      if (arkaFiliz < limits.ON_ARKA_MIN) {
        error += limits.ON_ARKA_MIN - arkaFiliz;
      } else if (limits.ON_ARKA_MAX && arkaFiliz > limits.ON_ARKA_MAX) {
        error += arkaFiliz - limits.ON_ARKA_MAX;
      }
    } else {
      // Perde tipi ön/arka kontrolü
      if (onFiliz < limits.ON_MIN) {
        error += limits.ON_MIN - onFiliz;
      }
      
      if (arkaFiliz < limits.ARKA_MIN) {
        error += limits.ARKA_MIN - arkaFiliz;
      }
      
      // Perde tipi için arka filiz 5'in katı olması ideal
      const remainder = arkaFiliz % 5;
      if (remainder > 0.1 && remainder < 4.9) {
        error += Math.min(remainder, 5 - remainder) * 0.5; // 5'in katı olmaması için küçük ceza
      }
    }
    
    return error;
  };

  // Hasır tipine göre filiz limitlerini al
  const getFilizLimits = (hasirTipi, hasirTuru) => {
    if (hasirTipi.startsWith('Q')) {
      if (hasirTuru === 'Perde' || hasirTuru === 'DK Perde') {
        return FILIZ_LIMITS.Q_PERDE;
      } else {
        return FILIZ_LIMITS.Q_DOSEME;
      }
    } else if (hasirTipi.startsWith('R')) {
      return FILIZ_LIMITS.R_TYPE;
    } else if (hasirTipi.startsWith('TR')) {
      return FILIZ_LIMITS.TR_TYPE;
    }
    
    // Varsayılan olarak Q Döşeme limitlerini döndür
    return FILIZ_LIMITS.Q_DOSEME;
  };

  // OCR yöntemi seçimi işleme
  const handleOcrMethodSelect = (method) => {
    setOcrProvider(method);
    setOcrMethodSelectionVisible(false);
    
    // OCR yöntemi seçildikten sonra görüntü yükleme işlemini başlat
    if (imageInputRef.current) {
      imageInputRef.current.click();
    }
  };

  // Clipboard'dan yapıştırılan görüntüleri işleme
  const handlePaste = (event) => {
    const items = (event.clipboardData || window.clipboardData).items;
    
    if (!items) return;
    
    // Clipboard içeriğini kontrol et
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          // OCR seçim modalını göster
          setIsProcessingImage(true);
          processImageWithOCRSpace(blob);
          
          // Varsayılan yapıştırma davranışını engelle
          event.preventDefault();
          return;
        }
      }
    }
  };
  // Görüntüyü işleme - PaddleOCR olmadan sadece OCR.space kullanılıyor
const processImageWithSelectedOcr = async (blob) => {
  // İmaj işleme akışını başlat
  setIsProcessingImage(true);
  setOcrProgress(0);
  
  try {
    // Direkt olarak OCR.space ile işle
    const success = await processImageWithOCRSpace(blob);
    
    // Başarısız olursa
    if (!success) {
      alert('Görüntüden veri çıkarma başarısız oldu. Lütfen daha net bir görüntü yükleyin veya verileri manuel olarak girin.');
    }
  } catch (error) {
    console.error('Görüntü işleme hatası:', error);
    alert('Görüntü işleme sırasında bir hata oluştu: ' + error.message);
  } finally {
    setIsProcessingImage(false);
  }
};

  // PaddleOCR ile görüntü işleme - Hata yönetimi geliştirildi
  const processImageWithPaddleOCR = async (imageFile) => {
    try {
      setOcrProgress(10);
      setOcrProvider('paddleocr');
      
      // Load PaddleOCR
      const paddleOcrLoaded = await loadPaddleOCR();
      if (!paddleOcrLoaded) {
        throw new Error('PaddleOCR yüklenemedi.');
      }
      
      setOcrProgress(30);
      
      // Create URL for image
      const imageUrl = URL.createObjectURL(imageFile);
      
      // Load image as HTML element
      const img = new Image();
      const imageLoadPromise = new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrl;
      });
      
      await imageLoadPromise;
      
      setOcrProgress(40);
      
      // Recognize text using PaddleOCR
      const result = await ocr.recognize(img);
      
      setOcrProgress(80);
      
      // Process results
      if (result && result.text) {
        processExtractedTextWithPaddleOCR(result);
        setOcrProgress(100);
        setBulkInputVisible(true);
        // Clean up the URL object
        URL.revokeObjectURL(imageUrl);
        return true;
      } else {
        throw new Error('PaddleOCR görüntüden metin çıkaramadı.');
      }
    } catch (error) {
      console.error('PaddleOCR işleme hatası:', error);
      return false;
    }
  };

  // PaddleOCR sonuçlarını işle
  const processExtractedTextWithPaddleOCR = (results) => {
    try {
      // Sonuçları doğru formatta işle
      let textData = '';
      
      if (results && results.text) {
        textData = results.text;
      } else if (typeof results === 'string') {
        textData = results;
      } else if (results && Array.isArray(results.regions)) {
        // Eski PaddleOCR API yapısı
        textData = results.regions.map(region => 
          region.lines.map(line => line.text).join('\n')
        ).join('\n');
      } else {
        textData = JSON.stringify(results);
      }
      
      // Metni satırlara ayır
      const lines = textData.split('\n');
      
      // Her satırı boşluklara göre ayırarak tablo oluştur
      const tableData = [];
      lines.forEach(line => {
        if (line.trim()) {
          // Tab, virgül veya birden fazla boşlukla ayır
          const rowData = line.split(/\t|,|;|\s{2,}/).map(item => item.trim()).filter(item => item);
          if (rowData.length > 0) {
            tableData.push(rowData);
          }
        }
      });
      
      // Oluşan tabloyu işle
      if (tableData.length > 0) {
        validateAndProcessTabularData(tableData);
      } else {
        // Tablo oluşturulamadıysa düz metin olarak işle
        parseTextData(textData);
      }
    } catch (error) {
      console.error('PaddleOCR veri işleme hatası:', error);
      
      // Hata durumunda düz metin olarak işle
      if (results && results.text) {
        parseTextData(results.text);
      } else if (typeof results === 'string') {
        parseTextData(results);
      } else {
        parseTextData(JSON.stringify(results));
      }
    }
  };

  // OCR.space API ile görüntüden metin çıkarma - Hata yönetimi geliştirildi
  const processImageWithOCRSpace = async (imageFile) => {
    try {
      setOcrProgress(10);
      setOcrProvider('ocr.space');
      
      // FormData oluştur
      const formData = new FormData();
      formData.append('apikey', OCR_SPACE_API_KEY);
      formData.append('file', imageFile);
      formData.append('language', 'tur');
      formData.append('isTable', 'true');
      formData.append('OCREngine', '2'); // Daha doğru motor
      
      setOcrProgress(30);
      
      // API isteği yap
      const response = await fetch('https://api.ocr.space/parse/image', {
        method: 'POST',
        body: formData,
      });
      
      setOcrProgress(70);
      
      if (!response.ok) {
        throw new Error(`OCR.space API hatası: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.ParsedResults && result.ParsedResults.length > 0) {
        const extractedText = result.ParsedResults[0].ParsedText;
        
        // Özelleştirilmiş Q, R, TR hasır tipi ve boyut arama algoritması uygula
        processExtractedTextFromOCR(extractedText);
        
        setOcrProgress(100);
        setBulkInputVisible(true);
        return true;
      } else if (result.ErrorMessage) {
        throw new Error(`OCR.space hata mesajı: ${result.ErrorMessage}`);
      } else {
        throw new Error('OCR sonuçları alınamadı');
      }
    } catch (error) {
      console.error('OCR.space işleme hatası:', error);
      return false;
    }
  };

// OCR.space'den gelen metni özel olarak işleme 
const processExtractedTextFromOCR = (extractedText) => {
  try {
    // İlk olarak satırlara böl
    const lines = extractedText.split('\n').filter(line => line.trim() !== '');
    
    // Potansiyel veri satırlarını belirle
    let dataRows = [];
    
    // Her satırda Hasır Tipi, Uzunluk bilgileri var mı kontrol et
    for (const line of lines) {
      // Hasır Tipi için özel model tanıma (Q, R veya TR ile başlayan)
      const hasirTipiMatch = line.match(/(?:\b|\s)([QRTRqrtr]{1,2}\s*\d{2,3}(?:\/\d{2,3})?)/i);
      let hasirTipi = hasirTipiMatch ? standardizeHasirTipi(hasirTipiMatch[1]) : '';
      
      // Eğer hasir tipi bulunamadıysa, "Q", "R" veya "TR" ile başlayan kelimeyi ara
      if (!hasirTipi) {
        const prefixMatch = line.match(/\b([QRqr]{1}|TR|tr)\s*\d+/i);
        hasirTipi = prefixMatch ? standardizeHasirTipi(prefixMatch[0]) : '';
      }
      
      // Sayısal değerler için arama (potansiyel boy, en ve hasır sayısı)
      // Hem nokta hem virgül ile ayrılmış ondalık sayıları destekle (Türkçe/İngilizce)
      const numericMatches = line.match(/\b\d+[.,]?\d*\b/g) || [];
      
      // En az bir sayısal değer ve hasır tipi varsa, veri satırı olarak değerlendir
      if (hasirTipi && numericMatches.length >= 2) {
        // Sayısal değerlerin analizi
        const formattedNums = numericMatches.map(n => formatNumber(n));
        
        // Boy ve En için makine limitleri kontrolü
        const boyEnCandidates = [];
        for (const num of formattedNums) {
          const val = parseFloat(num);
          if (!isNaN(val)) {
            // Makine limitlerini kontrol et
            if (val >= MACHINE_LIMITS.MIN_BOY * 0.8 && val <= MACHINE_LIMITS.MAX_BOY * 1.2) {
              boyEnCandidates.push({ value: val, isBoy: true });
            } else if (val >= MACHINE_LIMITS.MIN_EN_ADJUSTABLE * 0.8 && val <= MACHINE_LIMITS.MAX_EN * 1.2) {
              boyEnCandidates.push({ value: val, isBoy: false });
            }
          }
        }
        
        // Uygun Boy ve En değerlerini seç
        let uzunlukBoy = '';
        let uzunlukEn = '';
        
        // İlk önce Boy değerini belirle
        const boyCandidates = boyEnCandidates.filter(c => c.isBoy);
        if (boyCandidates.length > 0) {
          // En büyük değeri al
          boyCandidates.sort((a, b) => b.value - a.value);
          uzunlukBoy = boyCandidates[0].value.toString();
        }
        
        // Sonra En değerini belirle
        const enCandidates = boyEnCandidates.filter(c => !c.isBoy);
        if (enCandidates.length > 0) {
          // En büyük değeri al, Boydan küçük olmalı
          enCandidates.sort((a, b) => b.value - a.value);
          uzunlukEn = enCandidates[0].value.toString();
        }
        
        // Eğer limitler bulunamazsa, büyükten küçüğe sırala
        if (!uzunlukBoy && !uzunlukEn && formattedNums.length >= 2) {
          const sortedNums = [...formattedNums].map(n => parseFloat(n)).filter(n => !isNaN(n)).sort((a, b) => b - a);
          if (sortedNums.length >= 2) {
            uzunlukBoy = sortedNums[0].toString();
            uzunlukEn = sortedNums[1].toString();
          }
        }
        
        // Hasır sayısı için kalan değerleri değerlendir
        let hasirSayisi = '';
        const remainingNums = formattedNums
          .map(n => parseFloat(n))
          .filter(n => !isNaN(n) && 
                n.toString() !== uzunlukBoy && 
                n.toString() !== uzunlukEn);
        
        if (remainingNums.length > 0) {
          // Tam sayıları filtrele
          const integerValues = remainingNums.filter(n => 
            Number.isInteger(n) || Math.abs(n - Math.round(n)) < 0.001
          );
          
          if (integerValues.length > 0) {
            // Tam sayı varsa ilk değeri al
            hasirSayisi = integerValues[0].toString();
          } else {
            // En küçük değeri al
            hasirSayisi = remainingNums[0].toString();
          }
        } else if (formattedNums.length > 2) {
          // Eğer hasır sayısı bulunamazsa ve 2'den fazla sayı varsa, en küçüğünü al
          const sortedNums = [...formattedNums].map(n => parseFloat(n)).filter(n => !isNaN(n)).sort((a, b) => a - b);
          if (sortedNums.length > 2) {
            hasirSayisi = sortedNums[0].toString();
          } else {
            hasirSayisi = '1'; // Varsayılan
          }
        } else {
          hasirSayisi = '1'; // Varsayılan
        }
        
        // Veri satırını ekle
        if (hasirTipi && (uzunlukBoy || uzunlukEn)) {
          dataRows.push({
            hasirTipi,
            uzunlukBoy,
            uzunlukEn,
            hasirSayisi
          });
        }
      }
    }
    
    // Bulunan verileri makine limitlerine göre doğrula
    const validatedDataRows = dataRows.filter(row => {
      // Boy ve En değerlerini kontrol et
      const boyValue = parseFloat(row.uzunlukBoy);
      const enValue = parseFloat(row.uzunlukEn);
      
      // Boy ve En için makine limitlerini gevşek kontrol et
      const isBoyValid = isNaN(boyValue) || 
                        (boyValue >= MACHINE_LIMITS.MIN_BOY * 0.7 && 
                         boyValue <= MACHINE_LIMITS.MAX_BOY * 1.3);
      
      const isEnValid = isNaN(enValue) || 
                       (enValue >= MACHINE_LIMITS.MIN_EN_ADJUSTABLE * 0.7 && 
                        enValue <= MACHINE_LIMITS.MAX_EN * 1.3);
      
      return isBoyValid && isEnValid;
    });
    
    // Bulunan verileri ön izleme tablosuna ekle
    if (validatedDataRows.length > 0) {
      const previewItems = validatedDataRows.map((rowData, index) => ({
        id: index,
        hasirTipi: rowData.hasirTipi || '',
        uzunlukBoy: rowData.uzunlukBoy || '',
        uzunlukEn: rowData.uzunlukEn || '',
        hasirSayisi: rowData.hasirSayisi || ''
      }));
      
      setPreviewData(previewItems);
    } else {
      // Veri bulunamadıysa veya tümü geçersizse normal metin işlemeye geri dön
      parseTextData(extractedText);
    }
  } catch (error) {
    console.error('OCR.space veri analiz hatası:', error);
    // Hata durumunda basit metin işlemeye geri dön
    parseTextData(extractedText);
  }
};


  // Veri URL'inden Blob oluştur
  const dataURLtoBlob = (dataURL) => {
    // Base64 veriyi ayıkla
    const byteString = atob(dataURL.split(',')[1]);
    // MIME tipini al
    const mimeString = dataURL.split(',')[0].split(':')[1].split(';')[0];
    
    // Byte dizisi oluştur
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    
    return new Blob([ab], { type: mimeString });
  };

  

  // Görüntü yükleme ve OCR işlemi
  const handleImageUpload = async (event) => {
    const uploadedImage = event.target.files[0];
    if (uploadedImage) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp'];
      
      if (!allowedTypes.includes(uploadedImage.type)) {
        alert('Lütfen desteklenen bir görüntü formatı yükleyin (JPG, PNG, GIF, BMP).');
        return;
      }
      
      setIsProcessingImage(true);
      setOcrProgress(0);
      
      // OCR.space kullan
      try {
        await processImageWithOCRSpace(uploadedImage);
      } catch (error) {
        console.error('OCR işleme hatası:', error);
        alert('Görüntü işleme sırasında bir hata oluştu: ' + error.message);
      } finally {
        setIsProcessingImage(false);
      }
    }
    
    // Sıfırla
    event.target.value = '';
  };

  

  // Dosya yükleme işlemi
  const handleFileUpload = (event) => {
    const uploadedFile = event.target.files[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          if (uploadedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
              uploadedFile.type === 'application/vnd.ms-excel') {
            // Excel dosyalarını işle
            parseExcelData(e.target.result);
          } else if (uploadedFile.type === 'text/csv') {
            // CSV dosyalarını işle
            parseCsvData(e.target.result);
          } else if (uploadedFile.type === 'application/pdf') {
            // PDF dosyaları için uyarı ver - artık PDF yükleme butonu ayrı
            alert('PDF dosyaları için lütfen PDF Yükle butonunu kullanın.');
          } else {
            // Dosyadan metin çıkarmayı dene
            const text = e.target.result;
            parseTextData(text);
          }
        } catch (error) {
          console.error('Dosya işleme hatası:', error);
          alert('Dosya okuma hatası: ' + error.message);
        }
      };
      
      if (uploadedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
          uploadedFile.type === 'application/vnd.ms-excel') {
        reader.readAsArrayBuffer(uploadedFile);
      } else {
        reader.readAsText(uploadedFile);
      }
    }
    
    // Dosya seçimi sıfırla (aynı dosyayı tekrar seçebilmek için)
    event.target.value = '';
  };

  // Metin verilerini işleme
  const parseTextData = (text) => {
    try {
      // Metni satırlara böl
      const lines = text.split(/\r?\n/);
      
      // Boş satırları filtrele
      const nonEmptyLines = lines.filter(line => line.trim() !== '');
      
      // Verileri düzelt ve tablo formatına getir
      const tableData = nonEmptyLines.map(line => {
        // Tab, virgül veya boşluklarla ayrılmış verileri parçala
        const rowData = line.split(/\t|,|;|\s{2,}/g).map(item => item.trim()).filter(item => item);
        return rowData;
      }).filter(row => row.length > 0);
      
      // Verileri işle
      validateAndProcessTabularData(tableData);
    } catch (error) {
      console.error('Metin işleme hatası:', error);
      alert('Metin işleme hatası: ' + error.message);
    }
  };

  // Excel verilerini işleme
  const parseExcelData = (data) => {
    try {
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // XLSX'ten JSON'a dönüştür
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      
      // Başlık satırını tanımla ve verileri işle
      validateAndProcessTabularData(jsonData);
    } catch (error) {
      console.error('Excel işleme hatası:', error);
      alert('Excel dosyası okuma hatası: ' + error.message);
    }
  };

  // CSV verilerini işleme
  const parseCsvData = (data) => {
    try {
      // Sayı formatını belirle
      const numberFormat = detectCsvNumberFormat(data);
      
      Papa.parse(data, {
        header: false,
        skipEmptyLines: true,
        delimiter: '', // Otomatik ayırıcı algılama
        complete: (results) => {
          // Sayı formatı bilgisini sonuçlara ekle
          results.numberFormat = numberFormat;
          validateAndProcessTabularData(results.data, numberFormat);
        },
        error: (error) => {
          console.error('CSV işleme hatası:', error);
          alert('CSV okuma hatası: ' + error.message);
        }
      });
    } catch (error) {
      console.error('CSV işleme hatası:', error);
      alert('CSV okuma hatası: ' + error.message);
    }
  };

  // CSV sayı formatını tespit et
  const detectCsvNumberFormat = (data) => {
    // Varsayılan format "english" (nokta ondalık, virgül binlik ayırıcı)
    let format = "english";
    
    // Örnek satırları kontrol et
    const sampleLines = data.split('\n').slice(0, 10);
    let commaDecimalCount = 0;
    let dotDecimalCount = 0;
    
    for (const line of sampleLines) {
      const cells = line.split(/[,;]/); // Virgül veya noktalı virgül ile ayrılmış alanlar
      
      for (const cell of cells) {
        // Virgül ve nokta içeren sayıları kontrol et
        if (/\d,\d/.test(cell)) {
          commaDecimalCount++;
        }
        
        if (/\d\.\d/.test(cell)) {
          dotDecimalCount++;
        }
      }
    }
    
    // Eğer virgül kullanımı daha yaygınsa, Türkçe format olarak belirle
    if (commaDecimalCount > dotDecimalCount) {
      format = "turkish"; // Virgül ondalık, nokta binlik ayırıcı
    }
    
    return format;
  };

  // Pano yapıştırmasını işle
  const handleTablePaste = (e) => {
    e.preventDefault();
    
    // Panodaki metni al
    const clipboardData = e.clipboardData || window.clipboardData;
    const pastedData = clipboardData.getData('text');
    
    if (!pastedData) return;
    
    try {
      // Sayı formatını belirle
      const numberFormat = detectCsvNumberFormat(pastedData);
      
      // CSV veya tablo formatını algıla ve işle
      Papa.parse(pastedData, {
        delimiter: '', // Otomatik ayırıcı algılama
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
          // İlk satır başlık olabilir, kontrol et
          const data = results.data;
          validateAndProcessTabularData(data, numberFormat);
        },
        error: (error) => {
          console.error('Pano ayrıştırma hatası:', error);
          alert('Veri işleme hatası: ' + error.message);
        }
      });
    } catch (error) {
      console.error('Pano işleme hatası:', error);
      alert('Veri işleme hatası: ' + error.message);
    }
  };

  // Tablo verilerini doğrulama ve işleme - Geliştirilmiş veri kontrolü
  const validateAndProcessTabularData = (data, numberFormat = 'english') => {
    if (!data || data.length === 0) {
      alert('Geçerli veri bulunamadı.');
      return;
    }
    
    try {
      // İlk satırı potansiyel başlık olarak işle
      const hasHeaders = guessIfHasHeaders(data);
      const startRow = hasHeaders ? 1 : 0;
      
      // İlgili sütunları bul - geliştirilmiş sütun eşleştirme
      const columnMap = findRelevantColumns(data, hasHeaders ? data[0] : null);
      
      if (!columnMap.hasirTipi && !columnMap.uzunlukBoy && !columnMap.uzunlukEn && !columnMap.hasirSayisi) {
        alert('Gerekli sütunlar bulunamadı. Verilerinizin Hasır Tipi, Uzunluk Boy, Uzunluk En ve Hasır Sayısı bilgilerini içerdiğinden emin olun.');
        return;
      }
      
      // Satırlardan veri çıkar
      const validRows = [];
      for (let i = startRow; i < data.length; i++) {
        const rowData = data[i];
        
        if (rowData.length === 0 || (rowData.length === 1 && !rowData[0])) {
          continue; // Boş satırları atla
        }
        
        // Her bir kolonu daha esnek şekilde özüt
        let hasirTipi = '';
        let uzunlukBoy = '';
        let uzunlukEn = '';
        let hasirSayisi = '';
        
        // Sütun haritasını kullanarak değerleri al
        if (columnMap.hasirTipi !== undefined && rowData[columnMap.hasirTipi] !== undefined) {
          hasirTipi = String(rowData[columnMap.hasirTipi]);
        }
        
        if (columnMap.uzunlukBoy !== undefined && rowData[columnMap.uzunlukBoy] !== undefined) {
          uzunlukBoy = String(rowData[columnMap.uzunlukBoy]);
        }
        
        if (columnMap.uzunlukEn !== undefined && rowData[columnMap.uzunlukEn] !== undefined) {
          uzunlukEn = String(rowData[columnMap.uzunlukEn]);
        }
        
        if (columnMap.hasirSayisi !== undefined && rowData[columnMap.hasirSayisi] !== undefined) {
          hasirSayisi = String(rowData[columnMap.hasirSayisi]);
        }
        
        // Sütun eşleştirmesi yoksa, her satırda Q, R, TR veya benzeri değerleri ara
        if (!hasirTipi) {
          for (const cell of rowData) {
            const cellValue = String(cell).trim().toUpperCase();
            if (/^(Q|R|TR)\d+/.test(cellValue)) {
              hasirTipi = cellValue;
              break;
            }
          }
        }
        
        // Sayı formatına göre değerleri normalleştir
        if (uzunlukBoy) {
          uzunlukBoy = normalizeNumber(uzunlukBoy, numberFormat);
        }
        
        if (uzunlukEn) {
          uzunlukEn = normalizeNumber(uzunlukEn, numberFormat);
        }
        
        if (hasirSayisi) {
          hasirSayisi = normalizeNumber(hasirSayisi, numberFormat);
        }
        
        // Boy ve En değerleri yoksa ve yeterli sayısal değer varsa, boyut tahminleri yap
        if ((!uzunlukBoy || !uzunlukEn) && hasirTipi) {
          const numericValues = rowData
            .map(cell => {
              const normalizedValue = normalizeNumber(String(cell), numberFormat);
              const value = parseFloat(normalizedValue);
              return isNaN(value) ? null : value;
            })
            .filter(value => value !== null);
          
          // Makine limitlerine uygun değerleri ayır
          const boyCandidates = numericValues.filter(
            v => v >= MACHINE_LIMITS.MIN_BOY * 0.8 && v <= MACHINE_LIMITS.MAX_BOY * 1.2
          ).sort((a, b) => b - a); // Büyükten küçüğe sırala
          
          const enCandidates = numericValues.filter(
            v => v >= MACHINE_LIMITS.MIN_EN_ADJUSTABLE * 0.8 && v <= MACHINE_LIMITS.MAX_EN * 1.2
          ).sort((a, b) => b - a); // Büyükten küçüğe sırala
          
          // Boy değeri yoksa, Boy adaylarından seç
          if (!uzunlukBoy && boyCandidates.length > 0) {
            uzunlukBoy = boyCandidates[0].toString();
          }
          
          // En değeri yoksa, En adaylarından seç (Boy'dan farklı olmalı)
          if (!uzunlukEn && enCandidates.length > 0) {
            // Boy değerinden farklı bir değer seç
            const boyValue = parseFloat(uzunlukBoy);
            for (const candidate of enCandidates) {
              if (candidate !== boyValue) {
                uzunlukEn = candidate.toString();
                break;
              }
            }
            
            // Hala bulunamadıysa ilk değeri al
            if (!uzunlukEn && enCandidates.length > 0) {
              uzunlukEn = enCandidates[0].toString();
            }
          }
          
          // Makine limitlerine uygun değer bulunamazsa, genel yaklaşım
          if ((!uzunlukBoy || !uzunlukEn) && numericValues.length >= 2) {
            numericValues.sort((a, b) => b - a); // Büyükten küçüğe sırala
            
            if (!uzunlukBoy && numericValues.length > 0) {
              uzunlukBoy = numericValues[0].toString();
            }
            
            if (!uzunlukEn && numericValues.length > 1) {
              uzunlukEn = numericValues[1].toString();
            }
          }
        }
        
        // Hasır sayısı yoksa, kalan sayısal değerleri kontrol et
        if (!hasirSayisi && hasirTipi) {
          const remainingValues = rowData
            .map(cell => {
              const normalizedValue = normalizeNumber(String(cell), numberFormat);
              const value = parseFloat(normalizedValue);
              return isNaN(value) ? null : value;
            })
            .filter(value => value !== null && 
                   value.toString() !== uzunlukBoy && 
                   value.toString() !== uzunlukEn);
          
          // Tam sayıları filtrele
          const integerValues = remainingValues.filter(v => 
            Number.isInteger(v) || Math.abs(v - Math.round(v)) < 0.001
          );
          
          if (integerValues.length > 0) {
            // Tam sayı varsa, adet olabileceği için al
            hasirSayisi = integerValues[0].toString();
          } else if (remainingValues.length > 0) {
            // En küçük değeri al
            remainingValues.sort((a, b) => a - b);
            hasirSayisi = remainingValues[0].toString();
          } else {
            // Varsayılan
            hasirSayisi = '1';
          }
        }
        
        // Eğer değerler boş değilse ve benzer tiplere benziyorsa ekle
        if (isValidData(hasirTipi, uzunlukBoy, uzunlukEn, hasirSayisi)) {
          // Boy ve En değerlerini makine limitlerine göre doğrula
          const boyValue = parseFloat(uzunlukBoy);
          const enValue = parseFloat(uzunlukEn);
          
          // Makine limitlerine uygunluğu kontrol et (gevşek, 70-130%)
          const isBoyValid = isNaN(boyValue) || 
                            (boyValue >= MACHINE_LIMITS.MIN_BOY * 0.7 && 
                             boyValue <= MACHINE_LIMITS.MAX_BOY * 1.3);
          
          const isEnValid = isNaN(enValue) || 
                           (enValue >= MACHINE_LIMITS.MIN_EN_ADJUSTABLE * 0.7 && 
                            enValue <= MACHINE_LIMITS.MAX_EN * 1.3);
          
          if (isBoyValid && isEnValid) {
            validRows.push({
              hasirTipi: standardizeHasirTipi(hasirTipi),
              uzunlukBoy: uzunlukBoy,
              uzunlukEn: uzunlukEn,
              hasirSayisi: hasirSayisi || '1' // Varsayılan 1
            });
          }
        }
      }
      
      if (validRows.length === 0) {
        alert('İşlenebilir veri bulunamadı. Verilerinizin makine limitlerini (Boy: 275-800cm, En: 150-250cm) karşıladığından emin olun.');
        return;
      }
      
      // Ön izleme verileri olarak ayarla
      const previewItems = validRows.map((rowData, index) => ({
        id: index,
        hasirTipi: rowData.hasirTipi || '',
        uzunlukBoy: rowData.uzunlukBoy || '',
        uzunlukEn: rowData.uzunlukEn || '',
        hasirSayisi: rowData.hasirSayisi || ''
      }));
      
      setPreviewData(previewItems);
      setBulkInputVisible(true);
    } catch (error) {
      console.error('Tablo veri işleme hatası:', error);
      alert('Veri işleme hatası: ' + error.message);
    }
  };

  // Veride geçerli değerler olup olmadığını kontrol et
  const isValidData = (hasirTipi, uzunlukBoy, uzunlukEn, hasirSayisi) => {
    const hasValidHasirTipi = hasirTipi && 
                            (String(hasirTipi).toUpperCase().startsWith('Q') ||
                             String(hasirTipi).toUpperCase().startsWith('R') ||
                             String(hasirTipi).toUpperCase().startsWith('TR'));
                             
    const hasValidUzunlukBoy = uzunlukBoy && !isNaN(parseFloat(uzunlukBoy));
    const hasValidUzunlukEn = uzunlukEn && !isNaN(parseFloat(uzunlukEn));
    const hasValidHasirSayisi = hasirSayisi && !isNaN(parseFloat(hasirSayisi));
    
    // En az hasır tipi ve bir boyut bilgisi gerekli
    return hasValidHasirTipi && (hasValidUzunlukBoy || hasValidUzunlukEn);
  };

  // Veride başlık satırı olup olmadığını tahmin et
  const guessIfHasHeaders = (data) => {
    if (data.length < 2) return false;
    
    const firstRow = data[0];
    const secondRow = data[1];
    
    // Başlık olabilecek tipik sütun adları
    const headerKeywords = [
      'hasır', 'tipi', 'tip', 'boy', 'en', 'uzunluk', 'genislik', 'sayı', 'adet', 'miktar',
      'çap', 'cap', 'çubuk', 'cubuk', 'filiz', 'ağırlık', 'weight', 'kg', 'cinsi'
    ];
    
    // İlk satırda sayı olmayan değerler var mı kontrol et
    let nonNumericHeaderCount = 0;
    let keywordMatchCount = 0;
    
    for (let i = 0; i < firstRow.length; i++) {
      const value = String(firstRow[i]).toLowerCase();
      if (value && isNaN(parseFloat(value))) {
        nonNumericHeaderCount++;
        
        // Anahtar kelimelerden birini içeriyor mu?
        if (headerKeywords.some(keyword => value.includes(keyword))) {
          keywordMatchCount++;
        }
      }
    }
    
    // İkinci satırda sayısal değerler var mı kontrol et
    let numericDataCount = 0;
    for (let i = 0; i < secondRow.length; i++) {
      const value = String(secondRow[i]);
      if (value && !isNaN(parseFloat(formatNumber(value)))) {
        numericDataCount++;
      }
    }
    
    // Eğer ilk satırda başlık anahtar kelimeleri varsa ve ikinci satırda sayısal değerler varsa, başlık vardır
    return (keywordMatchCount > 0 && numericDataCount > 0) || nonNumericHeaderCount > 2;
  };

  // Ön izleme tablosundan tüm satırları silme
  const deleteAllPreviewRows = () => {
    setPreviewData([]);
  };

  // Ön izleme tablosundan satır silme
  const deletePreviewRow = (rowIndex) => {
    const updatedPreviewData = previewData.filter((_, index) => index !== rowIndex);
    setPreviewData(updatedPreviewData);
  };

  // Ön izleme tablosuna boş satır ekleme
  const addPreviewRow = () => {
    const newRowId = previewData.length > 0 ? Math.max(...previewData.map(row => row.id)) + 1 : 0;
    setPreviewData([...previewData, createEmptyPreviewRow(newRowId)]);
  };

  // Ön izleme tablosundaki verileri ana tabloya aktarma
  const processPreviewData = () => {
    // Geçerli verileri filtrele
    const validPreviewData = previewData.filter(row => 
      row.hasirTipi && (row.uzunlukBoy || row.uzunlukEn)
    );
    
    if (validPreviewData.length === 0) {
      alert('Aktarılacak geçerli veri bulunamadı. Lütfen en az Hasır Tipi, Uzunluk Boy veya Uzunluk En alanlarını doldurun.');
      return;
    }
    
    // Yeni satır ID'leri için başlangıç değeri
    const startId = rows.length > 0 ? Math.max(...rows.map(row => row.id)) + 1 : 0;
    
    // Ön izleme verilerinden tam satırlar oluştur
    const newRows = validPreviewData.map((previewRow, index) => {
      const newRow = createEmptyRow(startId + index);
      
      // Temel verileri aktar
      newRow.hasirTipi = previewRow.hasirTipi;
      newRow.uzunlukBoy = previewRow.uzunlukBoy;
      newRow.uzunlukEn = previewRow.uzunlukEn;
      newRow.hasirSayisi = previewRow.hasirSayisi || '1'; // Varsayılan olarak 1
      
      return newRow;
    });
    
    // Satırları ana tabloya ekle
    const updatedRows = [...rows].filter(row => isRowFilled(row) || row.id === 0);
    
    // Eğer ilk satır boşsa ve sadece bir satır varsa, onu çıkar
    const finalRows = updatedRows.length === 1 && !isRowFilled(updatedRows[0]) ?
                     newRows : [...updatedRows, ...newRows];
    
    // Her yeni satır için hesaplamaları yap
    newRows.forEach((_, index) => {
      const rowIndex = updatedRows.length === 1 && !isRowFilled(updatedRows[0]) ?
                      index : updatedRows.length + index;
      updateRowFromHasirTipi(finalRows, rowIndex);
    });
    
    // Durumu güncelle
    setRows(finalRows);
    setTimeout(() => backupTable(), 500);
    setBulkInputVisible(false);

    // Ön izleme tablosunu temizle
    setPreviewData([]);
  };

  // Yeni boş satır ekleme
  const addRow = () => {
    const newRowId = rows.length > 0 ? Math.max(...rows.map(row => row.id)) + 1 : 0;
    setRows([...rows, createEmptyRow(newRowId)]);
    // backup olustur
    backupTable();

  };

  // Satır silme
  const deleteRow = (rowIndex) => {
    if (rows.length > 1) {
      const updatedRows = rows.filter((_, index) => index !== rowIndex);
      setRows(updatedRows);
    } else {
      // Son kalan satırı da silmeye izin ver ve sayfa yüklenme durumuna geri dön
      setRows([createEmptyRow(0)]);
    }
  };

  
  // Görüntüleme için değeri formatla
  const formatDisplayValue = (value) => {
    if (value === undefined || value === null || value === '') return '';
    
    // Ondalık formatı ayarla (maksimum 5 ondalık basamak)
    if (typeof value === 'number') {
      // 0 ile biten ondalıkları koru
      const strValue = value.toString();
      if (strValue.includes('.')) {
        const [whole, decimal] = strValue.split('.');
        if (decimal.length > 5) {
          return `${whole}.${decimal.substring(0, 5)}`;
        }
        return strValue;
      }
      return strValue;
    }
    
    return value;
  };

  // Excel'e aktar
  const exportToExcel = () => {
    if (rows.length === 0) {
      alert('Dışa aktarılacak veri yok.');
      return;
    }
    
    try {
      // Başlık satırı
      const headers = [
        'SIRA', 'HASIR TİPİ', 'UZUNLUK BOY', 'UZUNLUK EN', 'HASIR SAYISI', 'HASIR TÜRÜ', 
        'BOY ÇAP', 'EN ÇAP', 'BOY ARALIĞI', 'EN ARALIĞI', 'ÇUBUK SAYISI BOY', 
        'ÇUBUK SAYISI EN', 'SOL FİLİZ', 'SAĞ FİLİZ', 'ÖN FİLİZ', 'ARKA FİLİZ', 
        'ADET KG', 'TOPLAM KG', 'STOK KODU', 'AÇIKLAMA'
      ];
      
      // Verileri hazırla
      const data = [headers];
      
      rows.forEach((row, index) => {
        data.push([
          index + 1, // Sıra
          row.hasirTipi, // Hasır tipi
          row.uzunlukBoy,
          row.uzunlukEn,
          row.hasirSayisi,
          row.hasirTuru, // Hasır türü sırası değiştirildi
          row.boyCap,
          row.enCap,
          row.boyAraligi,
          row.enAraligi,
          row.cubukSayisiBoy,
          row.cubukSayisiEn,
          row.solFiliz,
          row.sagFiliz,
          row.onFiliz,
          row.arkaFiliz,
          row.adetKg,
          row.toplamKg,
          row.stokKodu,
          row.aciklama
        ]);
      });
      
      // Çalışma kitabı oluştur
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(data);
      
      // Sütun genişliklerini ayarla
      const colWidths = headers.map(h => ({ wch: Math.max(h.length, 15) }));
      ws['!cols'] = colWidths;
      
      // Başlık satırı stil
      const headerStyle = {
        font: { bold: true, sz: 12, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "1E7145" } }, // Koyu yeşil arka plan
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
        border: { 
          top: { style: "thin", color: { rgb: "000000" } }, 
          bottom: { style: "thin", color: { rgb: "000000" } }, 
          left: { style: "thin", color: { rgb: "000000" } }, 
          right: { style: "thin", color: { rgb: "000000" } } 
        }
      };
      
      // Veri hücreleri için stil
      const dataStyle = {
        alignment: { horizontal: "center", vertical: "center" },
        border: { 
          top: { style: "thin", color: { rgb: "000000" } }, 
          bottom: { style: "thin", color: { rgb: "000000" } }, 
          left: { style: "thin", color: { rgb: "000000" } }, 
          right: { style: "thin", color: { rgb: "000000" } } 
        }
      };
      
      // Sayısal değerler için stil
      const numberStyle = {
        ...dataStyle,
        numFmt: "0.00000", // 5 ondalık basamak
      };
      
      // Alternatif satır renklendirme için stil
      const altRowStyle = {
        ...dataStyle,
        fill: { fgColor: { rgb: "F2F2F2" } } // Açık gri arka plan
      };
      
      // Alternatif sayısal değerler için stil
      const altNumberStyle = {
        ...numberStyle,
        fill: { fgColor: { rgb: "F2F2F2" } } // Açık gri arka plan
      };
      
      // İlk satıra stil uygula (başlıklar)
      for (let i = 0; i < headers.length; i++) {
        const cellRef = XLSX.utils.encode_cell({ r: 0, c: i });
        if (!ws[cellRef]) ws[cellRef] = { v: headers[i] };
        ws[cellRef].s = headerStyle;
      }
      
      // Veri hücrelerine stil uygula
      for (let r = 1; r < data.length; r++) {
        const isAltRow = r % 2 === 0; // Alternatif satır renklendirme
        
        for (let c = 0; c < headers.length; c++) {
          const cellRef = XLSX.utils.encode_cell({ r, c });
          if (ws[cellRef]) {
            // Sayısal değerlere sayı formatı uygula
            if (c >= 3 && c <= 16 && ws[cellRef].v !== '') {
              ws[cellRef].s = isAltRow ? altNumberStyle : numberStyle;
            } else {
              ws[cellRef].s = isAltRow ? altRowStyle : dataStyle;
            }
          }
        }
      }
      
      // Çalışma sayfasını kitaba ekle
      XLSX.utils.book_append_sheet(wb, ws, "Çelik Hasır Hesaplama");
      
      // Rapor özeti ekle
      const summaryData = [
        ['RAPOR ÖZETİ'],
        ['Oluşturma Tarihi', new Date().toLocaleString('tr-TR')],
        ['Toplam Satır Sayısı', rows.length],
        ['Üretilebilir Ürün Sayısı', rows.filter(row => !row.uretilemez).length],
        ['Üretilemez Ürün Sayısı', rows.filter(row => row.uretilemez).length],
        ['Toplam Ağırlık (kg)', rows.reduce((sum, row) => sum + (parseFloat(row.toplamKg) || 0), 0).toFixed(2)]
      ];
      
      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
      
      // Özet stil ayarları
      const summaryHeaderStyle = {
        font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "1E7145" } },
        alignment: { horizontal: "center", vertical: "center" },
        border: { 
          top: { style: "thin" }, 
          bottom: { style: "thin" }, 
          left: { style: "thin" }, 
          right: { style: "thin" } 
        }
      };
      
      // İlk hücreyi birleştir
      if (!summaryWs['!merges']) summaryWs['!merges'] = [];
      summaryWs['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } });
      
      // Başlık stilini uygula
      const summaryHeaderCell = XLSX.utils.encode_cell({ r: 0, c: 0 });
      if (summaryWs[summaryHeaderCell]) summaryWs[summaryHeaderCell].s = summaryHeaderStyle;
      
      // Özet sayfasını ekle
      XLSX.utils.book_append_sheet(wb, summaryWs, "Özet");
      
      // Türkçe karakter desteği için encoding ayarla
      const wopts = { bookType: 'xlsx', bookSST: false, type: 'array', cellStyles: true };
      
      // Excel dosyası olarak indir
      XLSX.writeFile(wb, "celik_hasir_hesaplamalari.xlsx", wopts);
    } catch (error) {
      console.error('Dışa aktarma hatası:', error);
      alert('Excel\'e aktarma hatası: ' + error.message);
    }
  };

  // Tüm verileri sıfırla
  const resetData = () => {
    if (window.confirm('Tüm veriler silinecek. Emin misiniz?')) {
      setRows([createEmptyRow(0)]);
      setPreviewData([]);
      setFile(null);
      setIsProcessingImage(false);
      setOcrProgress(0);
      setBulkInputVisible(false);
      setRowBackups({});
      setTableBackup(null);
      setBackupDate(null);
      setSelectedPdfImage(null);
      setPdfPageCount(0);
      setCurrentPdfPage(1);
    }
  };
  
  // Veritabanına kaydetme işlemi
  const saveToDatabase = async () => {
    if (rows.length === 0 || !rows.some(row => !row.uretilemez && isRowFilled(row))) {
      alert('Veritabanına kaydedilecek geçerli ürün bulunamadı.');
      return;
    }
    
    if (!window.confirm('Geçerli ürünler veritabanına kaydedilecek. Devam etmek istiyor musunuz?')) {
      return;
    }
    
    try {
      setSavingToDatabase(true);
      
      // Sadece geçerli ve üretilebilir satırları al
      const validRows = rows.filter(row => !row.uretilemez && isRowFilled(row));
      
      // API endpoint
      const apiUrl = 'https://alb-stackblitz-1.vercel.app/api/hasir_cost_cal_hasir_list';
      
      // Her satır için mevcut kayıt var mı kontrol et ve gerekirse yeni kayıt ekle
      const savedRows = [];
      
      for (const row of validRows) {
        // Mevcut kayıtları kontrol et
        const checkResponse = await axios.get(apiUrl, {
          params: {
            hasirTipi: row.hasirTipi,
            uzunlukBoy: row.uzunlukBoy,
            uzunlukEn: row.uzunlukEn,
            hasirSayisi: row.hasirSayisi
          }
        });
        
        if (checkResponse.data && checkResponse.data.length > 0) {
          // Eşleşen kayıt bulundu, stok kodunu al
          const existingRecord = checkResponse.data[0];
          row.stokKodu = existingRecord.stokKodu;
          savedRows.push(row);
        } else {
          // Eşleşen kayıt yok, yeni stok kodu oluştur
          
          // En son stok kodunu al
          const lastStockResponse = await axios.get(`${apiUrl}/last_stock_code`);
          let lastStockCode = "CHOZL0000";
          
          if (lastStockResponse.data && lastStockResponse.data.stokKodu) {
            lastStockCode = lastStockResponse.data.stokKodu;
          }
          
          // Yeni stok kodu oluştur (son rakamı 1 artır)
          const numericPart = parseInt(lastStockCode.slice(-4));
          const newNumericPart = numericPart + 1;
          const newStockCode = `CHOZL${newNumericPart.toString().padStart(4, '0')}`;
          
          // Yeni kayıt oluştur
          const newRecord = {
            stokKodu: newStockCode,
            hasirTipi: row.hasirTipi,
            uzunlukBoy: row.uzunlukBoy,
            uzunlukEn: row.uzunlukEn,
            hasirSayisi: row.hasirSayisi,
            boyCap: row.boyCap,
            enCap: row.enCap,
            boyAraligi: row.boyAraligi,
            enAraligi: row.enAraligi,
            cubukSayisiBoy: row.cubukSayisiBoy,
            cubukSayisiEn: row.cubukSayisiEn,
            solFiliz: row.solFiliz,
            sagFiliz: row.sagFiliz,
            onFiliz: row.onFiliz,
            arkaFiliz: row.arkaFiliz,
            adetKg: row.adetKg,
            toplamKg: row.toplamKg,
            hasirTuru: row.hasirTuru
          };
          
          // Veritabanına kaydet
          await axios.post(apiUrl, newRecord);
          
          // Stok kodunu satıra ekle
          row.stokKodu = newStockCode;
          savedRows.push(row);
        }
      }
      
      // Durumu güncelle
      setRows(rows.map(row => {
        const savedRow = savedRows.find(saved => saved.id === row.id);
        if (savedRow) {
          return { ...row, stokKodu: savedRow.stokKodu };
        }
        return row;
      }));
      
      setSavingToDatabase(false);
      alert(`${savedRows.length} ürün başarıyla veritabanına kaydedildi.`);
      
    } catch (error) {
      console.error('Veritabanı kayıt hatası:', error);
      alert('Veritabanına kaydetme işlemi sırasında bir hata oluştu: ' + error.message);
      setSavingToDatabase(false);
    }
  };
  
  // Reçete oluşturma işlemi
  const createRecipe = async () => {
    if (rows.length === 0 || !rows.some(row => row.stokKodu)) {
      alert('Reçete oluşturmak için önce ürünleri veritabanına kaydedin ve stok kodu alın.');
      return;
    }
    
    try {
      setCreatingRecipe(true);
      
      // Stok kodu olan satırları al
      const rowsWithStockCode = rows.filter(row => row.stokKodu);
      
      // API endpoint
      const apiUrl = 'https://alb-stackblitz-1.vercel.app/api/hasir_cost_cal_hasir_list/recipes';
      
      // Reçete verilerini al
      const recipeResponse = await axios.get(apiUrl, {
        params: {
          stokKodlari: rowsWithStockCode.map(row => row.stokKodu).join(',')
        }
      });
      
      if (!recipeResponse.data || recipeResponse.data.length === 0) {
        throw new Error('Reçete verileri alınamadı.');
      }
      
      // Reçete verilerini Excel formatında hazırla
      const recipeData = recipeResponse.data;
      
      // Excel dosyası oluştur
      const wb = XLSX.utils.book_new();
      
      // Her ürün için ayrı bir çalışma sayfası oluştur
      recipeData.forEach(recipe => {
        const recipeSheet = XLSX.utils.json_to_sheet(recipe.receteDetaylari);
        XLSX.utils.book_append_sheet(wb, recipeSheet, recipe.stokKodu);
      });
      
      // Özet sayfası oluştur
      const summaryData = recipeData.map(recipe => ({
        'Stok Kodu': recipe.stokKodu,
        'Hasır Tipi': recipe.hasirTipi,
        'Uzunluk Boy (cm)': recipe.uzunlukBoy,
        'Uzunluk En (cm)': recipe.uzunlukEn,
        'Hasır Sayısı': recipe.hasirSayisi,
        'Toplam Ağırlık (kg)': recipe.toplamKg
      }));
      
      const summarySheet = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summarySheet, 'Özet');
      
      // Excel dosyasını indir
      XLSX.writeFile(wb, 'celik_hasir_receteler.xlsx');
      
      setCreatingRecipe(false);
      
    } catch (error) {
      console.error('Reçete oluşturma hatası:', error);
      alert('Reçete oluşturma işlemi sırasında bir hata oluştu: ' + error.message);
      setCreatingRecipe(false);
    }
  };

  // Kolon genişliği ayarlama işlemleri
  const handleResizeMouseDown = (e, index) => {
    e.preventDefault();
    
    // Başlangıç noktasını kaydet
    resizingColumnRef.current = index;
    initialResizeXRef.current = e.clientX;
    
    // İlgili header hücresini seç
    const headerCell = document.querySelector(`th[data-index="${index}"]`);
    if (headerCell) {
      initialWidthRef.current = headerCell.offsetWidth;
    }
    
    // Fareyi takip et
    document.addEventListener('mousemove', handleResizeMouseMove);
    document.addEventListener('mouseup', handleResizeMouseUp);
  };

  // Kolon genişliği ayarlama fare hareketi
  const handleResizeMouseMove = (e) => {
    if (resizingColumnRef.current === null || initialResizeXRef.current === null || initialWidthRef.current === null) return;
    
    // Fare hareketi hesapla
    const diff = e.clientX - initialResizeXRef.current;
    
    // İlgili header hücresini seç
    const headerCell = document.querySelector(`th[data-index="${resizingColumnRef.current}"]`);
    if (headerCell) {
      // Yeni genişliği ayarla (minimum 50px)
      const newWidth = Math.max(50, initialWidthRef.current + diff);
      headerCell.style.width = `${newWidth}px`;
      headerCell.style.minWidth = `${newWidth}px`;
    }
  };

  // Kolon genişliği ayarlama bırakma
  const handleResizeMouseUp = () => {
    // Resizing durumunu temizle
    resizingColumnRef.current = null;
    initialResizeXRef.current = null;
    initialWidthRef.current = null;
    
    // Event listener'ları kaldır
    document.removeEventListener('mousemove', handleResizeMouseMove);
    document.removeEventListener('mouseup', handleResizeMouseUp);
  };

// Komponent yüklendikten sonra yapılacak işlemler
useEffect(() => {
  // Klavye kısayolları ekle
  const handleKeyDown = (e) => {
    // Alt+N: Yeni satır ekle
    if (e.altKey && e.key === 'n') {
      e.preventDefault();
      addRow();
    }
    
    // Alt+E: Excel'e aktar
    if (e.altKey && e.key === 'e') {
      e.preventDefault();
      exportToExcel();
    }
    
    // Alt+I: Tüm satırları iyileştir
    if (e.altKey && e.key === 'i') {
      e.preventDefault();
      iyilestirAll();
    }
    
    // Alt+B: Backup oluştur
    if (e.altKey && e.key === 'b') {
      e.preventDefault();
      backupTable();
    }
    
    // Alt+R: Backup'a dön
    if (e.altKey && e.key === 'r') {
      e.preventDefault();
      restoreTable();
    }
  };
  
  document.addEventListener('keydown', handleKeyDown);
  
  // Pano yapıştırma olayını kontrol et (global imaj yapıştırma için)
  document.addEventListener('paste', handlePaste);
  
  // Kaydırma olayını dinle (sticky header için)
  const handleScroll = () => {
    if (tableHeaderRef.current && mainTableRef.current) {
      const tableTop = mainTableRef.current.getBoundingClientRect().top;
      const headerHeight = tableHeaderRef.current.offsetHeight;
      
      // Tablo başlığı görünüm dışına çıkmaya başladığında yapışkan hale getir
      if (tableTop < 0) {
        setStickyHeaderOffset(-tableTop);
        tableHeaderRef.current.style.position = 'sticky';
        tableHeaderRef.current.style.top = '0';
        tableHeaderRef.current.style.zIndex = '10';
        tableHeaderRef.current.style.backgroundColor = '#f3f4f6';
        tableHeaderRef.current.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
      } else {
        setStickyHeaderOffset(0);
        tableHeaderRef.current.style.position = '';
        tableHeaderRef.current.style.top = '';
        tableHeaderRef.current.style.zIndex = '';
        tableHeaderRef.current.style.backgroundColor = '';
        tableHeaderRef.current.style.boxShadow = '';
      }
    }
  };
  
  window.addEventListener('scroll', handleScroll);
  // Sayfa yüklendiğinde bir kez çağır
  handleScroll();
  
  // Temizleme fonksiyonu
  return () => {
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('paste', handlePaste);
    window.removeEventListener('scroll', handleScroll);
  };
}, [rows, tableBackup]);

// Responsive tasarım için ekran boyutu değişimini izle
useEffect(() => {
    const handleResize = () => {
      // Mobil veya tablet ekran boyutu için UI ayarlamaları
      const isMobile = window.innerWidth < 768;
      const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
      
      // Mobil görünüm için table scrolling aktif et
      if (mainTableRef.current) {
        if (isMobile || isTablet) {
          mainTableRef.current.style.overflowX = 'auto';
        } else {
          mainTableRef.current.style.overflowX = 'visible';
        }
      }
    };
    
    window.addEventListener('resize', handleResize);
    // İlk yükleme için çağır
    handleResize();
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [mainTableRef]);


  // Arayüz düzeni
  return (
    <div className="space-y-6 pb-12">
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Çelik Hasır Hesaplama</h2>
        </div>
        
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept=".xlsx,.xls,.csv,.txt" 
            style={{ display: 'none' }} 
          />
          
          <input 
            type="file" 
            ref={imageInputRef} 
            onChange={handleImageUpload} 
            accept="image/*" 
            style={{ display: 'none' }} 
          />
          
          
        </div>
        
        {/* Toplu Veri Girişi bölümü - Accordion yapısında */}
        <div className="mb-6">
          <button 
            onClick={() => setBulkInputVisible(!bulkInputVisible)}
            className="w-full px-4 py-3 bg-gray-700 text-white rounded-md flex items-center justify-between hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Table size={18} />
              <span className="font-medium">Toplu Veri Girişi</span>
            </div>
            {bulkInputVisible ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          
          {bulkInputVisible && (
            <div className="mt-3 p-4 border border-gray-300 rounded-md bg-gray-50">
              <p className="text-sm text-gray-600 mb-4">
                Excel&apos;den veya diğer kaynaklardan toplu veri ekleyebilirsiniz. &quot;Hasır Tipi&quot;, &quot;Uzunluk Boy&quot;, &quot;Uzunluk En&quot; ve &quot;Hasır Sayısı&quot; bilgilerini içeren verileri düzenleyip onaylayın.
              </p>

              
              {/* Ön izleme tablosu */}
              <div className="overflow-x-auto mb-3 border border-gray-300 rounded-md">
                <table 
                  className="w-full border-collapse bg-white" 
                  ref={previewTableRef}
                  onPaste={handleTablePaste}
                >
                  <thead>
                    <tr className="bg-gray-200">
                      <th className="border border-gray-300 p-2 text-sm font-semibold">Sıra</th>
                      <th className="border border-gray-300 p-2 text-sm font-semibold">Hasır Tipi</th>
                      <th className="border border-gray-300 p-2 text-sm font-semibold">Uzunluk Boy (cm)</th>
                      <th className="border border-gray-300 p-2 text-sm font-semibold">Uzunluk En (cm)</th>
                      <th className="border border-gray-300 p-2 text-sm font-semibold">Hasır Sayısı</th>
                      <th className="border border-gray-300 p-2 text-sm font-semibold">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.length > 0 ? (
                      previewData.map((row, rowIndex) => (
                        <tr key={row.id} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="border border-gray-300 p-2 text-center">{rowIndex + 1}</td>
                          <td className="border border-gray-300 p-2">
                            <input
                              type="text"
                              className="w-full p-1 border border-gray-300 rounded"
                              value={row.hasirTipi}
                              onChange={(e) => handlePreviewCellChange(rowIndex, 'hasirTipi', e.target.value)}
                            />
                          </td>
                          <td className="border border-gray-300 p-2">
                            <input
                              type="text"
                              className="w-full p-1 border border-gray-300 rounded"
                              value={formatDisplayValue(row.uzunlukBoy)}
                              onChange={(e) => handlePreviewCellChange(rowIndex, 'uzunlukBoy', e.target.value)}
                            />
                          </td>
                          <td className="border border-gray-300 p-2">
                            <input
                              type="text"
                              className="w-full p-1 border border-gray-300 rounded"
                              value={formatDisplayValue(row.uzunlukEn)}
                              onChange={(e) => handlePreviewCellChange(rowIndex, 'uzunlukEn', e.target.value)}
                            />
                          </td>
                          <td className="border border-gray-300 p-2">
                            <input
                              type="text"
                              className="w-full p-1 border border-gray-300 rounded"
                              value={formatDisplayValue(row.hasirSayisi)}
                              onChange={(e) => handlePreviewCellChange(rowIndex, 'hasirSayisi', e.target.value)}
                            />
                          </td>
                          <td className="border border-gray-300 p-2">
                            <button
                              onClick={() => deletePreviewRow(rowIndex)}
                              className="px-2 py-1 bg-red-600 text-white rounded-md flex items-center gap-1 justify-center hover:bg-red-700 transition-colors w-full"
                            >
                              <Trash2 size={14} />
                              Sil
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="border border-gray-300 p-4 text-center text-gray-500">
                          Veri yok. Veri eklemek için dosya yükleyin, metin yapıştırın veya &quot;Satır Ekle&quot; düğmesini kullanın.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              <div className="flex flex-wrap gap-3 mb-3">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-2 bg-gray-600 text-white rounded-md flex items-center gap-2 hover:bg-gray-700 transition-colors"
                >
                  <Upload size={16} />
                  Excel/CSV Yükle
                </button>
                
                <button 
                  onClick={() => imageInputRef.current?.click()}
                  className="px-3 py-2 bg-gray-600 text-white rounded-md flex items-center gap-2 hover:bg-gray-700 transition-colors"
                >
                  <FileImage size={16} />
                  Görüntü Yükle (OCR)
                </button>
                                
                <button 
                  onClick={addPreviewRow}
                  className="px-3 py-2 bg-green-500 text-white rounded-md flex items-center gap-2 hover:bg-green-600 transition-colors"
                >
                  <Plus size={16} />
                  Satır Ekle
                </button>
                
                <button 
                  onClick={deleteAllPreviewRows}
                  className="px-3 py-2 bg-red-400 text-white rounded-md flex items-center gap-2 hover:bg-red-500 transition-colors"
                  disabled={previewData.length === 0}
                >
                  <CircleX size={16} />
                  Tümünü Sil
                </button>
              </div>
              
              {/* OCR İşlemi Göstergesi */}
              {isProcessingImage && (
                <div className="mb-3 p-3 border border-blue-300 rounded-md bg-blue-50">
                  <h3 className="text-sm font-medium text-blue-800 mb-2">
                    {ocrProvider === 'paddleocr' ? 
                      (paddleOcrLoading ? 'PaddleOCR Yükleniyor...' : 'PaddleOCR ile İşleniyor') : 
                      'OCR.space ile İşleniyor'}
                  </h3>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${ocrProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-blue-700 mt-1">
                    {ocrProgress < 100 ? `İşleniyor... %${ocrProgress}` : 'İşlem tamamlandı!'}
                  </p>
                </div>
              )}
              
              <div className="flex justify-end space-x-3">
                <button 
                  onClick={() => setBulkInputVisible(false)}
                  className="px-3 py-1.5 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
                >
                  İptal
                </button>
                
                <button 
                  onClick={processPreviewData}
                  className="px-3 py-1.5 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors flex items-center gap-2"
                  disabled={previewData.length === 0}
                >
                  <Check size={16} />
                  Verileri İşle
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Kontrol butonları */}
        <div className="flex flex-wrap gap-3 mb-6 justify-between">
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={exportToExcel}
              title="Alt+E"
              className="px-4 py-2 bg-green-600 text-white rounded-md flex items-center gap-2 hover:bg-green-700 transition-colors"
            >
              <Download size={18} />
              Excel&apos;e Aktar
            </button>
            
            <button 
              onClick={saveToDatabase}
              disabled={savingToDatabase}
              className="px-4 py-2 bg-blue-400 text-white rounded-md flex items-center gap-2 hover:bg-blue-500 transition-colors"
            >
              {savingToDatabase ? (
                <Loader size={18} className="animate-spin" />
              ) : (
                <Database size={18} />
              )}
              Veri Tabanına Kaydet
            </button>
            
            <button 
              onClick={createRecipe}
              disabled={creatingRecipe}
              className="px-4 py-2 bg-amber-100 text-amber-800 rounded-md flex items-center gap-2 hover:bg-amber-200 transition-colors"
            >
              {creatingRecipe ? (
                <Loader size={18} className="animate-spin" />
              ) : (
                <FileText size={18} />
              )}
              Reçete Oluştur
            </button>
          </div>
          
          {/* Yedekleme düğmeleri - Yeni konum */}
          <div className="flex gap-2">
            <button 
              onClick={backupTable}
              title="Alt+B"
              className="px-2 py-1 bg-green-500 text-white rounded-md flex items-center gap-1 text-sm hover:bg-green-600 transition-colors"
            >
              <ArrowUpToLine size={16} />
              Backup Oluştur
            </button>
            
            {backupDate && (
              <span className="text-xs text-gray-500 mr-2 mt-1">
                Son yedek: {backupDate}
              </span>
            )}
            
            <button 
              onClick={restoreTable}
              title="Alt+R"
              disabled={!tableBackup}
              className={`px-2 py-1 ${!tableBackup ? 'bg-gray-300 cursor-not-allowed' : 'bg-gray-500 hover:bg-gray-600'} text-white rounded-md flex items-center gap-1 text-sm transition-colors`}
            >
              <ArrowDownToLine size={16} />
              Backup&apos;a Dön
            </button>
          </div>

        {/* Ana veri tablosu */}
        <div className="overflow-x-auto" ref={mainTableRef}>
          <table className="w-full border-collapse">
            <thead 
              ref={tableHeaderRef} 
              className="bg-gray-100"
              style={{ 
                transition: 'transform 0.2s',
                position: stickyHeaderOffset > 0 ? 'sticky' : 'static',
                top: 0,
                zIndex: 10
              }}
            >
              <tr>
                <th data-index="0" className="border border-gray-300 p-1 py-2 text-sm font-semibold relative" style={{ width: '50px' }}>
                  Sıra
                  <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize" onMouseDown={(e) => handleResizeMouseDown(e, 0)}></div>
                </th>
                <th data-index="1" className="border border-gray-300 p-1 py-2 text-sm font-semibold relative" style={{ width: '120px' }}>
                  Hasır Tipi
                  <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize" onMouseDown={(e) => handleResizeMouseDown(e, 1)}></div>
                </th>
                <th data-index="2" className="border border-gray-300 p-1 py-2 text-sm font-semibold relative" style={{ width: '100px' }}>
                  Uzunluk Boy (cm)
                  <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize" onMouseDown={(e) => handleResizeMouseDown(e, 2)}></div>
                </th>
                <th data-index="3" className="border border-gray-300 p-1 py-2 text-sm font-semibold relative" style={{ width: '100px' }}>
                  Uzunluk En (cm)
                  <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize" onMouseDown={(e) => handleResizeMouseDown(e, 3)}></div>
                </th>
                <th data-index="4" className="border border-gray-300 p-1 py-2 text-sm font-semibold relative" style={{ width: '90px' }}>
                  Hasır Sayısı
                  <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize" onMouseDown={(e) => handleResizeMouseDown(e, 4)}></div>
                </th>
                <th data-index="5" className="border border-gray-300 p-1 py-2 text-sm font-semibold relative" style={{ width: '100px' }}>
                  Hasır Türü
                  <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize" onMouseDown={(e) => handleResizeMouseDown(e, 5)}></div>
                </th>
                <th data-index="6" className="border border-gray-300 p-1 py-2 text-sm font-semibold relative" style={{ width: '90px' }}>
                  Boy Çap (mm)
                  <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize" onMouseDown={(e) => handleResizeMouseDown(e, 6)}></div>
                </th>
                <th data-index="7" className="border border-gray-300 p-1 py-2 text-sm font-semibold relative" style={{ width: '90px' }}>
                  En Çap (mm)
                  <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize" onMouseDown={(e) => handleResizeMouseDown(e, 7)}></div>
                </th>
                <th data-index="8" className="border border-gray-300 p-1 py-2 text-sm font-semibold relative" style={{ width: '90px' }}>
                  Boy Aralığı (cm)
                  <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize" onMouseDown={(e) => handleResizeMouseDown(e, 8)}></div>
                </th>
                <th data-index="9" className="border border-gray-300 p-1 py-2 text-sm font-semibold relative" style={{ width: '90px' }}>
                  En Aralığı (cm)
                  <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize" onMouseDown={(e) => handleResizeMouseDown(e, 9)}></div>
                </th>
                <th data-index="10" className="border border-gray-300 p-1 py-2 text-sm font-semibold relative" style={{ width: '90px' }}>
                  Boy Çubuk Sayısı
                  <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize" onMouseDown={(e) => handleResizeMouseDown(e, 10)}></div>
                </th>
                <th data-index="11" className="border border-gray-300 p-1 py-2 text-sm font-semibold relative" style={{ width: '90px' }}>
                  En Çubuk Sayısı
                  <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize" onMouseDown={(e) => handleResizeMouseDown(e, 11)}></div>
                </th>
                <th data-index="12" className="border border-gray-300 p-1 py-2 text-sm font-semibold relative" style={{ width: '90px' }}>
                  Sol Filiz (cm)
                  <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize" onMouseDown={(e) => handleResizeMouseDown(e, 12)}></div>
                </th>
                <th data-index="13" className="border border-gray-300 p-1 py-2 text-sm font-semibold relative" style={{ width: '90px' }}>
                  Sağ Filiz (cm)
                  <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize" onMouseDown={(e) => handleResizeMouseDown(e, 13)}></div>
                </th>
                <th data-index="14" className="border border-gray-300 p-1 py-2 text-sm font-semibold relative" style={{ width: '90px' }}>
                  Ön Filiz (cm)
                  <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize" onMouseDown={(e) => handleResizeMouseDown(e, 14)}></div>
                </th>
                <th data-index="15" className="border border-gray-300 p-1 py-2 text-sm font-semibold relative" style={{ width: '90px' }}>
                  Arka Filiz (cm)
                  <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize" onMouseDown={(e) => handleResizeMouseDown(e, 15)}></div>
                </th>
                <th data-index="16" className="border border-gray-300 p-1 py-2 text-sm font-semibold relative" style={{ width: '90px' }}>
                  Adet Kg
                  <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize" onMouseDown={(e) => handleResizeMouseDown(e, 16)}></div>
                </th>
                <th data-index="17" className="border border-gray-300 p-1 py-2 text-sm font-semibold relative" style={{ width: '90px' }}>
                  Toplam Kg
                  <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize" onMouseDown={(e) => handleResizeMouseDown(e, 17)}></div>
                </th>
                <th data-index="18" className="border border-gray-300 p-1 py-2 text-sm font-semibold relative" style={{ width: '100px' }}>
                  Stok Kodu
                  <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize" onMouseDown={(e) => handleResizeMouseDown(e, 18)}></div>
                </th>
                <th data-index="19" className="border border-gray-300 p-1 py-2 text-sm font-semibold relative" style={{ width: '200px' }}>
                  Açıklama
                  <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize" onMouseDown={(e) => handleResizeMouseDown(e, 19)}></div>
                </th>
                <th data-index="20" className="border border-gray-300 p-1 py-2 text-sm font-semibold relative" style={{ width: '110px' }}>
                  İşlemler
                  <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize" onMouseDown={(e) => handleResizeMouseDown(e, 20)}></div>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => {
                // Satırda temel alanlar dolu mu?
                const isBasicFieldsFilled = isRowFilled(row);
                
                return (
                  <tr key={row.id} className={row.uretilemez ? 'bg-red-50' : (rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50')}>
                    <td className="border border-gray-300 p-1 text-center">{rowIndex + 1}</td>
                    
                    {/* Temel alanlar (her zaman düzenlenebilir) */}
                    <td className="border border-gray-300 p-1">
                      <input
                        type="text"
                        className="w-full p-1 border border-gray-300 rounded"
                        value={row.hasirTipi}
                        onChange={(e) => handleCellChange(rowIndex, 'hasirTipi', e.target.value)}
                      />
                    </td>
                    
                    <td className="border border-gray-300 p-1">
                      <input
                        type="text"
                        className={`w-full p-1 border rounded ${row.modified.uzunlukBoy ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                        value={formatDisplayValue(row.uzunlukBoy)}
                        onChange={(e) => handleCellChange(rowIndex, 'uzunlukBoy', e.target.value)}
                      />
                    </td>
                    
                    <td className="border border-gray-300 p-1">
                      <input
                        type="text"
                        className={`w-full p-1 border rounded ${row.modified.uzunlukEn ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                        value={formatDisplayValue(row.uzunlukEn)}
                        onChange={(e) => handleCellChange(rowIndex, 'uzunlukEn', e.target.value)}
                      />
                    </td>
                    
                    <td className="border border-gray-300 p-1">
                      <input
                        type="text"
                        className={`w-full p-1 border rounded ${row.modified.hasirSayisi ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                        value={formatDisplayValue(row.hasirSayisi)}
                        onChange={(e) => handleCellChange(rowIndex, 'hasirSayisi', e.target.value)}
                      />
                    </td>

                    <td className="border border-gray-300 p-1">
                      <select
                        className={`w-full p-1 border ${row.modified.hasirTuru ? 'border-red-300 bg-red-50' : 'border-gray-300'} ${!isBasicFieldsFilled ? 'bg-gray-100' : ''}`}
                        value={row.hasirTuru}
                        onChange={(e) => {
                          const updatedRows = [...rows];
                          updatedRows[rowIndex].hasirTuru = e.target.value;
                          updatedRows[rowIndex].modified.hasirTuru = true;
                          setRows(updatedRows);
                        }}
                        disabled={!isBasicFieldsFilled}
                      >
                        <option value="">Seçiniz</option>
                        <option value="Perde">Perde</option>
                        <option value="DK Perde">DK Perde</option>
                        <option value="Döşeme">Döşeme</option>
                        <option value="Standart">Standart</option>
                      </select>
                    </td>

                    {/* Diğer alanlar */}
                    <td className="border border-gray-300 p-1">
                      <input
                        type="text"
                        className={`w-full p-1 border border-gray-300 text-center ${!isBasicFieldsFilled ? 'bg-gray-100' : ''}`}
                        value={formatDisplayValue(row.boyCap)}
                        onChange={(e) => handleCellChange(rowIndex, 'boyCap', e.target.value)}
                        disabled={!isBasicFieldsFilled}
                      />
                    </td>
                    
                    <td className="border border-gray-300 p-1">
                      <input
                        type="text"
                        className={`w-full p-1 border border-gray-300 text-center ${!isBasicFieldsFilled ? 'bg-gray-100' : ''}`}
                        value={formatDisplayValue(row.enCap)}
                        onChange={(e) => handleCellChange(rowIndex, 'enCap', e.target.value)}
                        disabled={!isBasicFieldsFilled}
                      />
                    </td>
                    
                    <td className="border border-gray-300 p-1">
                      <input
                        type="text"
                        className={`w-full p-1 border border-gray-300 ${!isBasicFieldsFilled ? 'bg-gray-100' : ''}`}
                        value={formatDisplayValue(row.boyAraligi)}
                        onChange={(e) => handleCellChange(rowIndex, 'boyAraligi', e.target.value)}
                        disabled={!isBasicFieldsFilled}
                      />
                    </td>
                    
                    <td className="border border-gray-300 p-1">
                      <input
                        type="text"
                        className={`w-full p-1 border border-gray-300 ${!isBasicFieldsFilled ? 'bg-gray-100' : ''}`}
                        value={formatDisplayValue(row.enAraligi)}
                        onChange={(e) => handleCellChange(rowIndex, 'enAraligi', e.target.value)}
                        disabled={!isBasicFieldsFilled}
                      />
                    </td>
                    
                    <td className="border border-gray-300 p-1">
                      <input
                        type="text"
                        className={`w-full p-1 border ${row.modified.cubukSayisiBoy ? 'border-red-300 bg-red-50' : 'border-gray-300'} ${!isBasicFieldsFilled ? 'bg-gray-100' : ''}`}
                        value={formatDisplayValue(row.cubukSayisiBoy)}
                        onChange={(e) => handleCellChange(rowIndex, 'cubukSayisiBoy', e.target.value)}
                        disabled={!isBasicFieldsFilled}
                      />
                    </td>
                    
                    <td className="border border-gray-300 p-1">
                      <input
                        type="text"
                        className={`w-full p-1 border ${row.modified.cubukSayisiEn ? 'border-red-300 bg-red-50' : 'border-gray-300'} ${!isBasicFieldsFilled ? 'bg-gray-100' : ''}`}
                        value={formatDisplayValue(row.cubukSayisiEn)}
                        onChange={(e) => handleCellChange(rowIndex, 'cubukSayisiEn', e.target.value)}
                        disabled={!isBasicFieldsFilled}
                      />
                    </td>
                    
                    <td className="border border-gray-300 p-1">
                      <input
                        type="text"
                        className={`w-full p-1 border ${row.modified.solFiliz ? 'border-red-500 bg-red-100' : 'border-gray-300'} ${!isBasicFieldsFilled ? 'bg-gray-100' : ''}`}
                        value={formatDisplayValue(row.solFiliz)}
                        onChange={(e) => handleCellChange(rowIndex, 'solFiliz', e.target.value)}
                        disabled={!isBasicFieldsFilled}
                      />
                    </td>
                    
                    <td className="border border-gray-300 p-1">
                      <input
                        type="text"
                        className={`w-full p-1 border ${row.modified.sagFiliz ? 'border-red-500 bg-red-100' : 'border-gray-300'} ${!isBasicFieldsFilled ? 'bg-gray-100' : ''}`}
                        value={formatDisplayValue(row.sagFiliz)}
                        onChange={(e) => handleCellChange(rowIndex, 'sagFiliz', e.target.value)}
                        disabled={!isBasicFieldsFilled}
                      />
                    </td>
                    
                    <td className="border border-gray-300 p-1">
                      <input
                        type="text"
                        className={`w-full p-1 border ${row.modified.onFiliz ? 'border-red-500 bg-red-100' : 'border-gray-300'} ${!isBasicFieldsFilled ? 'bg-gray-100' : ''}`}
                        value={formatDisplayValue(row.onFiliz)}
                        onChange={(e) => handleCellChange(rowIndex, 'onFiliz', e.target.value)}
                        disabled={!isBasicFieldsFilled}
                      />
                    </td>
                    
                    <td className="border border-gray-300 p-1">
                      <input
                        type="text"
                        className={`w-full p-1 border ${row.modified.arkaFiliz ? 'border-red-500 bg-red-100' : 'border-gray-300'} ${!isBasicFieldsFilled ? 'bg-gray-100' : ''}`}
                        value={formatDisplayValue(row.arkaFiliz)}
                        onChange={(e) => handleCellChange(rowIndex, 'arkaFiliz', e.target.value)}
                        disabled={!isBasicFieldsFilled}
                      />
                    </td>
                    
                    <td className="border border-gray-300 p-1">
                      <input
                        type="text"
                        className={`w-full p-1 border border-gray-300 text-right font-medium ${!isBasicFieldsFilled ? 'bg-gray-100' : ''}`}
                        value={formatDisplayValue(row.adetKg)}
                        onChange={(e) => handleCellChange(rowIndex, 'adetKg', e.target.value)}
                        disabled={!isBasicFieldsFilled}
                      />
                    </td>
                    
                    <td className="border border-gray-300 p-1">
                      <input
                        type="text"
                        className={`w-full p-1 border border-gray-300 text-right font-medium ${!isBasicFieldsFilled ? 'bg-gray-100' : ''}`}
                        value={formatDisplayValue(row.toplamKg)}
                        onChange={(e) => handleCellChange(rowIndex, 'toplamKg', e.target.value)}
                        disabled={!isBasicFieldsFilled}
                      />
                    </td>
                    
                    <td className="border border-gray-300 p-1">
                      <input
                        type="text"
                        className="w-full p-1 border border-gray-300 font-medium text-blue-600"
                        value={row.stokKodu}
                        readOnly
                      />
                    </td>
                    
                    <td className="border border-gray-300 p-1">
                      <textarea
                        className={`w-full p-1 border border-gray-300 rounded text-xs ${row.uretilemez ? 'text-red-600 font-medium' : ''} ${!isBasicFieldsFilled ? 'bg-gray-100' : ''}`}
                        value={row.aciklama}
                        onChange={(e) => handleCellChange(rowIndex, 'aciklama', e.target.value)}
                        rows={2}
                      />
                    </td>
                    
                    <td className="border border-gray-300 p-1">
                      <div className="flex gap-1">
                        <button
                          onClick={() => iyilestir(rowIndex)}
                          disabled={!isBasicFieldsFilled || processingRowIndex === rowIndex}
                          className={`flex-grow px-2 py-1 bg-blue-600 text-white rounded-md flex items-center gap-1 justify-center hover:bg-blue-700 transition-colors ${!isBasicFieldsFilled ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {processingRowIndex === rowIndex ? (
                            <Loader size={14} className="animate-spin" />
                          ) : (
                            <RefreshCw size={14} />
                          )}
                          <span className="hidden sm:inline">İyileştir</span>
                        </button>
                        
                        <button
                          onClick={() => deleteRow(rowIndex)}
                          className="px-2 py-1 bg-red-600 text-white rounded-md flex items-center justify-center hover:bg-red-700 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* Alt butonlar ve açıklamalar - Tamamen yeniden düzenlendi */}
        <div className="mt-4 w-full">
          <div className="flex flex-col sm:flex-row w-full">
            {/* Sol taraftaki buton */}
            <div className="sm:w-1/3 mb-3 sm:mb-0">
              <button
                onClick={addRow}
                title="Alt+N"
                className="px-4 py-2 bg-green-500 text-white rounded-md flex items-center gap-2 hover:bg-green-600 transition-colors"
              >
                <Plus size={18} />
                Yeni Satır Ekle
              </button>
            </div>
            
            {/* Sağ taraftaki butonlar */}
            <div className="sm:w-2/3 flex flex-wrap gap-3 justify-end">
              <button
                onClick={iyilestirAll}
                title="Alt+I"
                disabled={batchProcessing}
                className="px-4 py-2 bg-blue-700 text-white rounded-md flex items-center gap-2 hover:bg-blue-800 transition-colors"
              >
                {batchProcessing ? (
                  <Loader size={18} className="animate-spin" />
                ) : (
                  <RefreshCw size={18} />
                )}
                Hepsini İyileştir
              </button>
              
              <button
                onClick={restoreAllRows}
                disabled={Object.keys(rowBackups).length === 0}
                className="px-4 py-2 bg-orange-600 text-white rounded-md flex items-center gap-2 hover:bg-orange-700 transition-colors"
              >
                <Edit3 size={18} />
                İyileştirmeleri Geri Al
              </button>
              
              <button 
                onClick={resetData}
                className="px-4 py-2 bg-red-600 text-white rounded-md flex items-center gap-2 hover:bg-red-700 transition-colors"
              >
                <AlertCircle size={18} />
                Sıfırla
              </button>
            </div>
          </div>
        </div>
        
        {/* Değiştirilen hücreler için açıklama */}
        <div className="mt-6 bg-gray-50 p-3 rounded-md text-sm">
          <div className="flex flex-wrap items-center gap-2 text-gray-700">
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-red-50 border border-red-300 rounded"></div>
              <span>Değiştirilmiş değer</span>
            </div>
            <span className="mx-2 hidden sm:inline">•</span>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-red-100 border border-red-500 rounded"></div>
              <span>Elle değiştirilmiş filiz</span>
            </div>
            <span className="mx-2 hidden sm:inline">•</span>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded"></div>
              <span>Düzenlenebilir değil</span>
            </div>
            <span className="mx-2 hidden sm:inline">•</span>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-red-50 border border-gray-300 rounded"></div>
              <span>Üretilemez ürün</span>
            </div>
          </div>
          
          <div className="mt-2 flex items-start gap-2 text-gray-700">
            <Info size={16} className="flex-shrink-0 mt-0.5 text-blue-500" />
            <p>
              Önce &apos;Hasır Tipi&apos;, &apos;Uzunluk Boy&apos;, &apos;Uzunluk En&apos; ve &apos;Hasır Sayısı&apos; alanlarını doldurun. 
              Diğer alanlar otomatik hesaplanacaktır. İyileştirme işlemi için &apos;İyileştir&apos; düğmesini kullanabilirsiniz.
              Kırmızı ile işaretlenen değerler otomatik olarak değiştirilmiş değerlerdir.
            </p>
          </div>
          
          <div className="mt-2 text-sm text-gray-500">
            <p>Klavye Kısayolları: Alt+N = Yeni Satır Ekle, Alt+E = Excel&apos;e Aktar, Alt+I = Hepsini İyileştir, Alt+B = Backup Oluştur, Alt+R = Backup&apos;a Dön</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CelikHasirHesaplama;
