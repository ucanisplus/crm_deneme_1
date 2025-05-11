// Updated handleSaveToDatabase and handleSaveAndCreateExcel functions

// 1. Fix for handleSaveToDatabase to ensure proper return value for success/failure
const handleSaveToDatabase = async () => {
  try {
    // Input validation
    if (!formValues.cap || !formValues.kaplama || !formValues.kod_2) {
      toast.error('Lütfen zorunlu alanları doldurun (Çap, Kaplama ve Kod-2 zorunludur)');
      return false;
    }

    // YM ST validation
    if (!selectedYmSt || selectedYmSt.length === 0) {
      toast.error('En az bir YM ST seçmelisiniz');
      return false;
    }

    setLoading(true);
    setError(null);

    // Performans ölçümü için zaman hesaplama
    const startTime = Date.now();

    // YM ST listesini benzersiz hale getir
    const uniqueYmSt = [];
    const ymStMap = new Map();

    selectedYmSt.forEach(item => {
      if (!ymStMap.has(item.stok_kodu)) {
        ymStMap.set(item.stok_kodu, item);
        uniqueYmSt.push(item);
      }
    });

    // Eğer seçili YM ST tekrarlanıyorsa güncelle
    if (uniqueYmSt.length !== selectedYmSt.length) {
      setSelectedYmSt(uniqueYmSt);
      toast.info(`${selectedYmSt.length - uniqueYmSt.length} adet tekrarlanan YM ST kaydı temizlendi`);
    }

    // Oluşturulan ürünleri saklayacak dizi
    const createdProducts = [];
    let lastMmGt = null;
    let lastYmGt = null;
    let hasErrors = false;

    // Her YM ST için ayrı MM GT ve YM GT oluştur (1-to-1-to-1 model)
    for (let i = 0; i < uniqueYmSt.length; i++) {
      try {
        const ymSt = uniqueYmSt[i];
        const currentFormValues = {...formValues};

        // Her ürün için benzersiz bir sequence numarası olmasını sağla
        // İlk ürün için form değerlerini doğrudan kullan, diğerleri için sequence artırılacak
        if (i > 0) {
          // saveMMGT() fonksiyonu zaten sequence'ı artıracak, bu nedenle burada bir şey yapmaya gerek yok
          // Her iterasyonda yeni bir MM GT için yeni bir sequence oluşturulacak
        }

        // MM GT kaydet
        const savedMmGt = await saveMMGT(currentFormValues);
        if (!savedMmGt) {
          console.error(`${i+1}. ürün için MM GT kaydedilemedi`);
          toast.error(`${i+1}. ürün için MM GT kaydedilemedi`);
          hasErrors = true;
          continue;
        }

        // YM GT kaydet
        const savedYmGt = await saveYMGT(currentFormValues, savedMmGt.id);
        if (!savedYmGt) {
          console.error(`${i+1}. ürün için YM GT kaydedilemedi`);
          toast.error(`${i+1}. ürün için YM GT kaydedilemedi`);
          hasErrors = true;
          continue;
        }

        // İlgili YM ST'yi kaydet - her MM GT için bir YM ST
        const savedYmSt = await saveYMST(ymSt, savedMmGt.id);
        if (!savedYmSt) {
          console.error(`${i+1}. ürün için YM ST kaydedilemedi`);
          toast.error(`${i+1}. ürün için YM ST kaydedilemedi`);
          hasErrors = true;
          continue;
        }

        // Reçeteleri kaydet
        const savedRecete = await saveRecete(receteFormValues, savedMmGt.id, savedYmGt.id);
        if (!savedRecete) {
          console.error(`${i+1}. ürün için reçete kaydedilemedi`);
          toast.error(`${i+1}. ürün için reçete kaydedilemedi`);
          hasErrors = true;
          continue;
        }

        // Oluşturulan ürünü diziye ekle
        createdProducts.push({
          mmGt: savedMmGt,
          ymGt: savedYmGt,
          ymSt: ymSt
        });

        // Son ürünü sakla - UI güncellemesi için
        lastMmGt = savedMmGt;
        lastYmGt = savedYmGt;

        console.log(`${i+1}/${uniqueYmSt.length} ürün başarıyla kaydedildi`);
      } catch (innerError) {
        console.error(`${i+1}. ürün kaydedilirken hata oluştu:`, innerError);
        toast.error(`${i+1}. ürün kaydedilirken hata oluştu: ${innerError.message}`);
        hasErrors = true;
      }
    }

    // En az bir ürün başarıyla oluşturulduysa
    if (createdProducts.length > 0) {
      setDatabaseSaved(true);
      setIsEditMode(true);
      // Son oluşturulan ürünün bilgilerini UI'da göster
      setMmGtData(lastMmGt);
      setYmGtData(lastYmGt);
      setReceteData(receteFormValues);

      // Veritabanı verilerini güncelle
      await fetchProductDatabase();

      // Performans ölçümü sonucu
      const endTime = Date.now();
      const elapsedTime = (endTime - startTime) / 1000;
      setSavingTime(elapsedTime);

      if (hasErrors) {
        toast.warning(`${createdProducts.length}/${uniqueYmSt.length} ürün veritabanına kaydedildi (${elapsedTime.toFixed(2)} saniye), bazı ürünlerde hatalar oluştu`);
      } else {
        toast.success(`${createdProducts.length} ürün başarıyla veritabanına kaydedildi (${elapsedTime.toFixed(2)} saniye)`);
      }

      return true;
    } else {
      toast.error('Hiçbir ürün kaydedilemedi.');
      return false;
    }
  } catch (error) {
    console.error('Veritabanı kaydetme hatası:', error);
    toast.error('Veritabanına kayıt sırasında hata oluştu: ' + error.message);
    return false;
  } finally {
    setLoading(false);
  }
};

// 2. Fix for handleSaveAndCreateExcel to ensure proper error handling
const handleSaveAndCreateExcel = async (type) => {
  try {
    setLoading(true);
    
    // Tüm zorunlu alanları kontrol et
    if (!formValues.cap || !formValues.kaplama || !formValues.kod_2) {
      toast.error('Lütfen zorunlu alanları doldurun (Çap, Kaplama ve Kod-2 zorunludur)');
      setLoading(false);
      return;
    }

    // YM ST seçilmiş mi kontrol et
    if (!selectedYmSt || selectedYmSt.length === 0) {
      toast.error('Excel oluşturmak için en az bir YM ST seçmelisiniz');
      setLoading(false);
      return;
    }
    
    // İlerleme bildirimi
    toast.info('Kaydetme ve Excel oluşturma işlemi başlatıldı...', {
      autoClose: false,
      toastId: 'save-excel'
    });
    
    // Veritabanına kaydet
    const saveSuccess = await handleSaveToDatabase();
    
    // Kapatma işlemi
    toast.dismiss('save-excel');
    
    if (saveSuccess) {
      // Excel için ilerleme bildirimi
      toast.info('Excel dosyası oluşturuluyor...', {
        autoClose: false,
        toastId: 'create-excel'
      });
      
      try {
        // Excel oluştur
        await handleCreateExcelOnly(type);
        toast.dismiss('create-excel');
        toast.success('Excel dosyası başarıyla oluşturuldu');
      } catch (excelError) {
        toast.dismiss('create-excel');
        console.error('Excel oluşturma hatası:', excelError);
        toast.error('Excel oluşturulurken bir hata oluştu: ' + excelError.message);
      }
    } else {
      toast.error('Veritabanına kaydedilmeden Excel oluşturulamadı');
    }
  } catch (error) {
    console.error('Kaydet ve Excel oluştur hatası:', error);
    toast.error('İşlem sırasında bir hata oluştu: ' + error.message);
  } finally {
    setLoading(false);
  }
};

// 3. Fix for handleCreateExcelOnly
const handleCreateExcelOnly = async (type) => {
  try {
    // Minimum gereksinimler kontrolü
    if (!formValues.cap || !formValues.kaplama || !formValues.kod_2) {
      toast.error('Excel oluşturmak için gerekli alanları doldurun (Çap, Kaplama ve Kod-2 zorunludur)');
      return;
    }
    
    if (!selectedYmSt || selectedYmSt.length === 0) {
      toast.error('Excel oluşturmak için en az bir YM ST seçmelisiniz');
      return;
    }
    
    setLoading(true);
    
    // İlerleme bildirimi
    toast.info('Excel dosyası oluşturuluyor...', {
      autoClose: false,
      toastId: 'create-excel-only'
    });
    
    // Geçici veriler oluştur - veritabanında kaydedilmemiş durum için
    const tempMmGt = mmGtData || {
      id: 'temp_' + Date.now(),
      ...formValues,
      stok_kodu: getFormattedStokKodu(),
      stok_adi: `Galvanizli Tel ${formValues.cap} mm -${formValues.tolerans_minus}/+${formValues.tolerans_plus} ${formValues.kaplama} gr/m²${formValues.min_mukavemet}-${formValues.max_mukavemet} MPa ID:${formValues.ic_cap} cm OD:${formValues.dis_cap} cm ${formValues.kg} kg`,
      ingilizce_isim: `Galvanized Steel Wire ${formValues.cap} mm -${formValues.tolerans_minus}/+${formValues.tolerans_plus} ${formValues.kaplama} gr/m²${formValues.min_mukavemet}-${formValues.max_mukavemet} MPa ID:${formValues.ic_cap} cm OD:${formValues.dis_cap} cm ${formValues.kg} kg`,
      gumruk_tarife_kodu: getGumrukTarifeKodu(parseFloat(formValues.cap)),
      amb_shrink: getNaylonKodu(formValues.ic_cap),
      metarial: 'Galvanizli Tel',
      wax: '+',
      lifting_lugs: '+',
      unwinding: formValues.unwinding || '',
      coil_dimensions_id: formValues.ic_cap.toString(),
      coil_dimensions_od: formValues.dis_cap.toString(),
      coil_weight: formValues.kg.toString(),
    };
    
    const tempYmGt = ymGtData || {
      id: 'temp_' + Date.now(),
      ...formValues,
      stok_kodu: `YM.GT.${formValues.kod_2}.${parseFloat(formValues.cap).toFixed(2).replace('.', '').padStart(4, '0')}.01`,
      stok_adi: `YM Galvanizli Tel ${formValues.cap} mm ${formValues.kaplama} gr/m²`,
      ingilizce_isim: `YM Galvanized Steel Wire ${formValues.cap} mm ${formValues.kaplama} gr/m²`,
      mm_gt_id: tempMmGt.id,
    };
    
    // Excel oluştur
    if (!type || type === 'stok-karti') {
      await createStokKartiExcel(tempMmGt, tempYmGt, selectedYmSt);
    }
    
    if (!type || type === 'recete') {
      await createReceteExcel(tempMmGt, tempYmGt, selectedYmSt);
    }
    
    if (type === 'both') {
      await createStokKartiExcel(tempMmGt, tempYmGt, selectedYmSt);
      await createReceteExcel(tempMmGt, tempYmGt, selectedYmSt);
    }
    
    // İlerleme bildirimini kapat
    toast.dismiss('create-excel-only');
    toast.success('Excel dosyası başarıyla oluşturuldu');
  } catch (error) {
    console.error('Excel oluşturma hatası:', error);
    toast.dismiss('create-excel-only');
    toast.error('Excel oluşturulurken bir hata oluştu: ' + error.message);
  } finally {
    setLoading(false);
  }
};