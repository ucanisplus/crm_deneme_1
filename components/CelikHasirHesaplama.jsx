// Tüm satırları iyileştir - Tek seferde optimizasyon yapar
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
      
      // Yeni yaklaşım: tekli iyileştirme fonksiyonunu çağır
      // Bu sayede aynı işlem mantığı kullanılır
      await iyilestir(rowIndex);
      
      // Açıklamaya toplu işlem notu ekle
      const row = updatedRows[rowIndex];
      const timestamp = new Date().toLocaleTimeString('tr-TR', {hour: '2-digit', minute: '2-digit'});
      
      if (row.aciklama && !row.aciklama.startsWith('[Toplu İyileştirme]')) {
        row.aciklama = `[${timestamp} Toplu İyileştirme] ` + row.aciklama;
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
