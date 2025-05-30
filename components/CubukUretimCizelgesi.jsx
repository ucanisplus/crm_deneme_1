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

// Sortable row component
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

  // Calculate aggregated rods from main table data
  useEffect(() => {
    if (isOpen && mainTableData && mainTableData.length > 0) {
      const rodMap = new Map();
      
      mainTableData.forEach(row => {
        // Skip empty or invalid rows
        if (!row.uzunlukBoy || !row.uzunlukEn || !row.boyCap || !row.enCap) return;
        
        // Process Boy rods
        if (row.cubukSayisiBoy > 0) {
          const key = `${row.boyCap}-${row.uzunlukBoy}`;
          if (rodMap.has(key)) {
            rodMap.get(key).quantity += row.cubukSayisiBoy;
          } else {
            const suggestedFLM = flmMappings.getSuggestedFLM(row.boyCap);
            rodMap.set(key, {
              id: `boy-${key}`,
              diameter: row.boyCap,
              length: row.uzunlukBoy,
              quantity: row.cubukSayisiBoy,
              flmDiameter: suggestedFLM.diameter,
              flmQuality: suggestedFLM.quality
            });
          }
        }
        
        // Process En rods
        if (row.cubukSayisiEn > 0) {
          const key = `${row.enCap}-${row.uzunlukEn}`;
          if (rodMap.has(key)) {
            rodMap.get(key).quantity += row.cubukSayisiEn;
          } else {
            const suggestedFLM = flmMappings.getSuggestedFLM(row.enCap);
            rodMap.set(key, {
              id: `en-${key}`,
              diameter: row.enCap,
              length: row.uzunlukEn,
              quantity: row.cubukSayisiEn,
              flmDiameter: suggestedFLM.diameter,
              flmQuality: suggestedFLM.quality
            });
          }
        }
      });
      
      // Convert to array and sort by diameter (smallest first), then by length
      const sortedRods = Array.from(rodMap.values()).sort((a, b) => {
        if (a.diameter !== b.diameter) {
          return a.diameter - b.diameter;
        }
        return a.length - b.length;
      });
      
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
      'Filmaşin Kalite': rod.flmQuality
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Çubuk Üretim');
    
    // Add title
    XLSX.utils.sheet_add_aoa(ws, [['ÇELİK HASIR ÇUBUK ÜRETİM ÇİZELGESİ']], { origin: 'A1' });
    XLSX.utils.sheet_add_aoa(ws, [[`Tarih: ${date}`]], { origin: 'A2' });
    
    // Adjust column widths
    const cols = [
      { wch: 10 }, // Sıra
      { wch: 15 }, // Çap
      { wch: 15 }, // Uzunluk
      { wch: 15 }, // Miktar
      { wch: 20 }, // Filmaşin Çap
      { wch: 20 }  // Filmaşin Kalite
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