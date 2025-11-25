"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Table, 
  Download, 
  Printer,
  GripVertical,
  ChevronDown
} from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import * as XLSX from 'xlsx';
import { flmMappings } from '../lib/flmMappings';

// Sortable row Bileşen
const SortableRow = ({ id, rod, index, onFlmChange }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr ref={setNodeRef} style={style} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
      <td className="border border-gray-300 p-2 text-center">
        <div {...attributes} {...listeners} className="cursor-move">
          <GripVertical size={16} className="text-gray-400 mx-auto" />
        </div>
      </td>
      <td className="border border-gray-300 p-2 text-center">{index + 1}</td>
      <td className="border border-gray-300 p-2 text-center">{rod.diameter} mm</td>
      <td className="border border-gray-300 p-2 text-center">{rod.length} cm</td>
      <td className="border border-gray-300 p-2 text-center font-semibold">{rod.quantity}</td>
      <td className="border border-gray-300 p-2">
        <div className="flex items-center gap-2">
          <select
            value={rod.flmDiameter}
            onChange={(e) => onFlmChange(rod.id, 'diameter', e.target.value)}
            className="flex-1 p-1 border border-gray-300 rounded text-sm"
          >
            {flmMappings.availableDiameters.map(d => (
              <option key={d} value={d}>{d} mm</option>
            ))}
          </select>
          <select
            value={rod.flmQuality}
            onChange={(e) => onFlmChange(rod.id, 'quality', e.target.value)}
            className="flex-1 p-1 border border-gray-300 rounded text-sm"
          >
            {flmMappings.availableQualities.map(q => (
              <option key={q} value={q}>{q}</option>
            ))}
          </select>
        </div>
      </td>
      <td className="border border-gray-300 p-2">
        <div className="max-h-20 overflow-y-auto">
          {rod.usedInProducts && rod.usedInProducts.length > 0 ? (
            <ul className="text-xs space-y-1">
              {rod.usedInProducts.map((product, idx) => (
                <li key={idx} className="bg-gray-100 px-2 py-1 rounded text-gray-700">
                  {product.hasirTipi} ({product.uzunlukBoy}×{product.uzunlukEn}cm)
                  {product.hasirSayisi > 1 && ` x${product.hasirSayisi}`}
                </li>
              ))}
            </ul>
          ) : (
            <span className="text-gray-400 text-xs">-</span>
          )}
        </div>
      </td>
    </tr>
  );
};

const CubukUretimCizelgesi = ({ isOpen, onClose, mainTableData }) => {
  const [rods, setRods] = useState([]);
  const [showTable, setShowTable] = useState(false);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Hesapla aggregated rods den main table Veri
  useEffect(() => {
    if (isOpen && mainTableData && mainTableData.length > 0) {
      console.log('=== ÇUBUK CALCULATION DEBUG ===');
      console.log(`Received mainTableData with ${mainTableData.length} rows`);
      console.log('Sample rows (first 3):');
      mainTableData.slice(0, 3).forEach((row, i) => {
        console.log(`Row ${i}:`, {
          hasirTipi: row.hasirTipi,
          dimensions: `${row.uzunlukBoy}×${row.uzunlukEn}`,
          hasirSayisi: row.hasirSayisi,
          cubukSayisiBoy: row.cubukSayisiBoy,
          cubukSayisiEn: row.cubukSayisiEn,
          modified: row.modified // Check if we have modification tracking
        });
      });
      
      const rodMap = new Map();
      
      mainTableData.forEach((row, rowIndex) => {
        // Skip empty or Geçersiz rows
        if (!row.uzunlukBoy || !row.uzunlukEn || !row.boyCap || !row.enCap) {
          console.log(`Row ${rowIndex} skipped - missing dimensions:`, {
            uzunlukBoy: row.uzunlukBoy,
            uzunlukEn: row.uzunlukEn,
            boyCap: row.boyCap,
            enCap: row.enCap
          });
          return;
        }

        // Additional validation - skip rows ile zero or Geçersiz rod counts
        if ((!row.cubukSayisiBoy || parseInt(row.cubukSayisiBoy) <= 0) && 
            (!row.cubukSayisiEn || parseInt(row.cubukSayisiEn) <= 0)) {
          console.log(`Row ${rowIndex} skipped - no valid rod counts:`, {
            cubukSayisiBoy: row.cubukSayisiBoy,
            cubukSayisiEn: row.cubukSayisiEn
          });
          return;
        }
        
        // Oluştur Ürün info için tracking
        const hasirSayisi = parseInt(row.hasirSayisi) || 1;
        
        // Doğrula hasirSayisi - should be reasonable positive Sayı
        if (hasirSayisi <= 0 || hasirSayisi > 1000) {
          console.warn(`Row ${rowIndex} has suspicious hasirSayisi: ${hasirSayisi}, using 1`);
        }
        
        const productInfo = {
          hasirTipi: row.hasirTipi || 'Bilinmeyen',
          uzunlukBoy: row.uzunlukBoy,
          uzunlukEn: row.uzunlukEn,
          hasirSayisi: Math.max(1, Math.min(hasirSayisi, 1000)) // Clamp between 1 and 1000
        };
        
        console.log(`Processing row ${rowIndex}:`, {
          productInfo,
          cubukSayisiBoy_raw: row.cubukSayisiBoy,
          cubukSayisiBoy_type: typeof row.cubukSayisiBoy,
          cubukSayisiEn_raw: row.cubukSayisiEn,
          cubukSayisiEn_type: typeof row.cubukSayisiEn,
          hasirSayisi_raw: row.hasirSayisi,
          hasirSayisi_type: typeof row.hasirSayisi,
          boyCap: row.boyCap,
          enCap: row.enCap,
          rowId: row.id || `row-${rowIndex}`
        });
        
        // İşlem Boy rods
        const cubukSayisiBoy = parseInt(row.cubukSayisiBoy) || 0;
        if (cubukSayisiBoy > 0) {
          const key = `${row.boyCap}-${row.uzunlukBoy}`;
          const boyQuantity = cubukSayisiBoy * productInfo.hasirSayisi;
          
          console.log(`Boy rod calculation for key ${key}:`, {
            cubukSayisiBoy: cubukSayisiBoy,
            cubukSayisiBoy_type: typeof cubukSayisiBoy,
            hasirSayisi: productInfo.hasirSayisi,
            hasirSayisi_type: typeof productInfo.hasirSayisi,
            multiplication_result: boyQuantity,
            multiplication_type: typeof boyQuantity,
            existing: rodMap.has(key)
          });
          
          if (rodMap.has(key)) {
            const existingRod = rodMap.get(key);
            const oldQuantity = existingRod.quantity;
            
            // CRITICAL: Ensure numeric addition, not String concatenation
            console.log(`BEFORE addition - oldQuantity: ${oldQuantity} (type: ${typeof oldQuantity}), boyQuantity: ${boyQuantity} (type: ${typeof boyQuantity})`);
            
            existingRod.quantity = Number(existingRod.quantity) + Number(boyQuantity);
            existingRod.usedInProducts.push(productInfo);
            
            console.log(`Updated existing boy rod ${key}: ${oldQuantity} + ${boyQuantity} = ${existingRod.quantity} (type: ${typeof existingRod.quantity})`);
          } else {
            const suggestedFLM = flmMappings.getSuggestedFLM(row.boyCap);
            rodMap.set(key, {
              id: `boy-${key}`,
              diameter: row.boyCap,
              length: row.uzunlukBoy,
              quantity: Number(boyQuantity), // Ensure it's stored as number
              flmDiameter: suggestedFLM.diameter,
              flmQuality: suggestedFLM.quality,
              usedInProducts: [productInfo]
            });
            console.log(`Created new boy rod ${key}: quantity = ${boyQuantity} (type: ${typeof boyQuantity})`);
          }
        }
        
        // İşlem En rods
        const cubukSayisiEn = parseInt(row.cubukSayisiEn) || 0;
        if (cubukSayisiEn > 0) {
          const key = `${row.enCap}-${row.uzunlukEn}`;
          const enQuantity = cubukSayisiEn * productInfo.hasirSayisi;
          
          console.log(`En rod calculation for key ${key}:`, {
            cubukSayisiEn: cubukSayisiEn,
            cubukSayisiEn_type: typeof cubukSayisiEn,
            hasirSayisi: productInfo.hasirSayisi,
            hasirSayisi_type: typeof productInfo.hasirSayisi,
            multiplication_result: enQuantity,
            multiplication_type: typeof enQuantity,
            existing: rodMap.has(key)
          });
          
          if (rodMap.has(key)) {
            const existingRod = rodMap.get(key);
            const oldQuantity = existingRod.quantity;
            
            // CRITICAL: Ensure numeric addition, not String concatenation
            console.log(`BEFORE addition - oldQuantity: ${oldQuantity} (type: ${typeof oldQuantity}), enQuantity: ${enQuantity} (type: ${typeof enQuantity})`);
            
            existingRod.quantity = Number(existingRod.quantity) + Number(enQuantity);
            existingRod.usedInProducts.push(productInfo);
            
            console.log(`Updated existing en rod ${key}: ${oldQuantity} + ${enQuantity} = ${existingRod.quantity} (type: ${typeof existingRod.quantity})`);
          } else {
            const suggestedFLM = flmMappings.getSuggestedFLM(row.enCap);
            rodMap.set(key, {
              id: `en-${key}`,
              diameter: row.enCap,
              length: row.uzunlukEn,
              quantity: Number(enQuantity), // Ensure it's stored as number
              flmDiameter: suggestedFLM.diameter,
              flmQuality: suggestedFLM.quality,
              usedInProducts: [productInfo]
            });
            console.log(`Created new en rod ${key}: quantity = ${enQuantity} (type: ${typeof enQuantity})`);
          }
        }
      });
      
      // Çevir a Dizi and Sırala ile Çap (smallest first), then ile Uzunluk
      const sortedRods = Array.from(rodMap.values()).sort((a, b) => {
        if (a.diameter !== b.diameter) {
          return a.diameter - b.diameter;
        }
        return a.length - b.length;
      });
      
      console.log('Final rod map contents:');
      let totalCalculatedRods = 0;
      let duplicateProductWarnings = 0;
      
      rodMap.forEach((rod, key) => {
        totalCalculatedRods += rod.quantity;
        
        // Kontrol et için potential duplicate products (same mesh Tip ile same dimensions)
        const productKeys = new Set();
        rod.usedInProducts.forEach(p => {
          const productKey = `${p.hasirTipi}-${p.uzunlukBoy}-${p.uzunlukEn}`;
          if (productKeys.has(productKey)) {
            console.warn(`⚠️ DUPLICATE PRODUCT WARNING for rod ${key}: ${productKey} appears multiple times!`);
            duplicateProductWarnings++;
          }
          productKeys.add(productKey);
        });
        
        console.log(`${key}:`, {
          quantity: rod.quantity,
          usedInProducts: rod.usedInProducts.map(p => ({
            hasirTipi: p.hasirTipi,
            hasirSayisi: p.hasirSayisi,
            dimensions: `${p.uzunlukBoy}×${p.uzunlukEn}`
          }))
        });
      });
      
      console.log('📊 CALCULATION SUMMARY:');
      console.log(`Total unique rod specifications: ${sortedRods.length}`);
      console.log(`Total rod quantity across all specifications: ${totalCalculatedRods}`);
      console.log(`Duplicate product warnings: ${duplicateProductWarnings}`);
      console.log(`Total rows processed: ${mainTableData.length}`);
      console.log('=== END DEBUG ===');
      
      setRods(sortedRods);
      setShowTable(true);
    }
  }, [isOpen, mainTableData]);

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setRods((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleFlmChange = (rodId, type, value) => {
    setRods(prev => prev.map(rod => {
      if (rod.id === rodId) {
        if (type === 'diameter') {
          return { ...rod, flmDiameter: parseInt(value) };
        } else {
          return { ...rod, flmQuality: value };
        }
      }
      return rod;
    }));
  };

  const exportToExcel = () => {
    const date = new Date().toLocaleDateString('tr-TR');
    const data = rods.map((rod, index) => ({
      'Sıra': index + 1,
      'Çap (mm)': rod.diameter,
      'Uzunluk (cm)': rod.length,
      'Miktar': rod.quantity,
      'Filmaşin Çap (mm)': rod.flmDiameter,
      'Filmaşin Kalite': rod.flmQuality,
      'Kullanılacak Ürünler': rod.usedInProducts ? 
        rod.usedInProducts.map(p => `• ${p.hasirTipi} (${p.uzunlukBoy}×${p.uzunlukEn}cm)${p.hasirSayisi > 1 ? ` x${p.hasirSayisi}` : ''}`).join('\n') 
        : ''
    }));
    
    const ws = XLSX.utils.json_to_sheet(data, { origin: 'A2' });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Çubuk Üretim');
    
    // Ekle title ile Tarih in the first row
    XLSX.utils.sheet_add_aoa(ws, [[`ÇELİK HASIR ÇUBUK ÜRETİM ÇİZELGESİ - ${date}`]], { origin: 'A1' });
    
    // Merge cells için the title
    ws['!merges'] = [{ s: { c: 0, r: 0 }, e: { c: 6, r: 0 } }];
    
    // Enable text wrapping and Ayarla row heights için proper display
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let row = 2; row <= range.e.r; row++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: 6 }); // Column G (Kullanılacak Ürünler)
      if (ws[cellAddress]) {
        ws[cellAddress].s = {
          alignment: {
            wrapText: true,
            vertical: 'top'
          }
        };
      }
    }
    
    // Ayarla row heights için better display
    ws['!rows'] = [];
    for (let i = 0; i <= range.e.r; i++) {
      if (i === 0) {
        ws['!rows'][i] = { hpt: 25 }; // Title row
      } else if (i === 1) {
        ws['!rows'][i] = { hpt: 20 }; // Header row
      } else {
        // Hesapla Yükseklik based on Sayı of products
        const dataIndex = i - 2;
        const productCount = rods[dataIndex]?.usedInProducts?.length || 1;
        ws['!rows'][i] = { hpt: Math.max(20, productCount * 15 + 10) }; // Dynamic height
      }
    }
    
    // Adjust column widths
    const cols = [
      { wch: 8 },  // Sıra
      { wch: 12 }, // Çap
      { wch: 15 }, // Uzunluk
      { wch: 10 }, // Miktar
      { wch: 18 }, // Filmaşin Çap
      { wch: 18 }, // Filmaşin Kalite
      { wch: 50 }  // Kullanılacak Ürünler (wider for better display)
    ];
    ws['!cols'] = cols;
    
    XLSX.writeFile(wb, `Cubuk_Uretim_Cizelgesi_${date.replace(/\./g, '_')}.xlsx`);
  };

  const handlePrint = () => {
    const date = new Date().toLocaleDateString('tr-TR');
    const printWindow = window.open('', '_blank');
    
    const tableHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Çelik Hasır Çubuk Üretim Çizelgesi</title>
        <style>
          body { font-family: Arial, sans-serif; }
          h1 { text-align: center; }
          h3 { text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid black; padding: 8px; text-align: center; }
          th { background-color: #f0f0f0; font-weight: bold; }
          .products-cell { text-align: left; font-size: 11px; max-width: 200px; }
          .product-item { margin-bottom: 2px; padding: 2px; background-color: #f5f5f5; }
          @media print {
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <h1>ÇELİK HASIR ÇUBUK ÜRETİM ÇİZELGESİ</h1>
        <h3>Tarih: ${date}</h3>
        <table>
          <thead>
            <tr>
              <th>Sıra</th>
              <th>Çap (mm)</th>
              <th>Uzunluk (cm)</th>
              <th>Miktar</th>
              <th>Filmaşin Çap (mm)</th>
              <th>Filmaşin Kalite</th>
              <th>Kullanılacak Ürünler</th>
            </tr>
          </thead>
          <tbody>
            ${rods.map((rod, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${rod.diameter}</td>
                <td>${rod.length}</td>
                <td><strong>${rod.quantity}</strong></td>
                <td>${rod.flmDiameter}</td>
                <td>${rod.flmQuality}</td>
                <td class="products-cell">
                  ${rod.usedInProducts ? 
                    rod.usedInProducts.map(p => 
                      `<div class="product-item">${p.hasirTipi} (${p.uzunlukBoy}×${p.uzunlukEn}cm)${p.hasirSayisi > 1 ? ` x${p.hasirSayisi}` : ''}</div>`
                    ).join('') 
                    : '-'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <script>window.print();</script>
      </body>
      </html>
    `;
    
    printWindow.document.write(tableHtml);
    printWindow.document.close();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Çelik Hasır Çubuk Üretim Çizelgesi</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>
        
        {showTable && rods.length > 0 ? (
          <>
            <div className="mb-4 text-sm text-gray-600">
              <p>Toplam {rods.length} farklı çubuk tipi bulundu. Sürükleyerek sırayı değiştirebilirsiniz.</p>
            </div>
            
            <div className="overflow-x-auto mb-4 border border-gray-300 rounded-md">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <table className="w-full border-collapse bg-white">
                  <thead>
                    <tr className="bg-gray-200">
                      <th className="border border-gray-300 p-2 text-sm font-semibold w-10"></th>
                      <th className="border border-gray-300 p-2 text-sm font-semibold">Sıra</th>
                      <th className="border border-gray-300 p-2 text-sm font-semibold">Çap (mm)</th>
                      <th className="border border-gray-300 p-2 text-sm font-semibold">Uzunluk (cm)</th>
                      <th className="border border-gray-300 p-2 text-sm font-semibold">Miktar</th>
                      <th className="border border-gray-300 p-2 text-sm font-semibold">Filmaşin (Çap / Kalite)</th>
                      <th className="border border-gray-300 p-2 text-sm font-semibold">Kullanılacak Ürünler</th>
                    </tr>
                  </thead>
                  <tbody>
                    <SortableContext items={rods.map(r => r.id)} strategy={verticalListSortingStrategy}>
                      {rods.map((rod, index) => (
                        <SortableRow 
                          key={rod.id} 
                          id={rod.id} 
                          rod={rod} 
                          index={index}
                          onFlmChange={handleFlmChange}
                        />
                      ))}
                    </SortableContext>
                  </tbody>
                </table>
              </DndContext>
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={exportToExcel}
                className="px-4 py-2 bg-green-600 text-white rounded-md flex items-center gap-2 hover:bg-green-700"
              >
                <Download size={18} />
                Excel'e Aktar
              </button>
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-blue-600 text-white rounded-md flex items-center gap-2 hover:bg-blue-700"
              >
                <Printer size={18} />
                Yazdır
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>Henüz hesaplanmış çubuk verisi bulunmamaktadır.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CubukUretimCizelgesi;