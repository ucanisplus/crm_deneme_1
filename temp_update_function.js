// New implementation of handleSaveToDatabase
// Replace the existing handleSaveToDatabase function with this one

const handleSaveToDatabase = async () => {
  try {
    setLoading(true);
    setError(null);

    // Form doğrulama kontrolleri
    if (!formValues.stok_adi || !formValues.cap || !formValues.kaplama) {
      setError('Lütfen gerekli tüm alanları doldurun (Ürün Adı, Çap, Kaplama)');
      toast.error('Lütfen gerekli tüm alanları doldurun');
      return false;
    }

    // Seçili YM ST kontrolü
    if (!selectedYmSt || selectedYmSt.length === 0) {
      setError('Lütfen en az bir YM ST seçin');
      toast.error('Lütfen en az bir YM ST seçin');
      return false;
    }

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
    }

    // 1-to-1-to-1 model uygulaması: Her YM ST için bir MM GT ve YM GT oluştur
    const savedProducts = [];
    let lastSavedProduct = null;
    let hasErrors = false;

    // Her bir YM ST için ayrı MM GT, YM GT ve reçeteleri oluştur
    for (let i = 0; i < uniqueYmSt.length; i++) {
      const ymSt = uniqueYmSt[i];
      
      try {
        console.log(`İşleniyor: ${i+1}/${uniqueYmSt.length} - YM ST: ${ymSt.stok_kodu}`);
        
        // MM GT oluştur - her YM ST için özgün bir sıra numarası alacak
        // (saveMMGT içinde sequence numarası otomatik artırılıyor)
        const savedMmGt = await saveMMGT(formValues);
        if (!savedMmGt) {
          console.error(`MM GT oluşturulamadı: ${ymSt.stok_kodu} için`);
          hasErrors = true;
          continue;
        }

        // YM GT oluştur ve MM GT ile ilişkilendir
        const savedYmGt = await saveYMGT(formValues, savedMmGt.id);
        if (!savedYmGt) {
          console.error(`YM GT oluşturulamadı: ${ymSt.stok_kodu} için`);
          hasErrors = true;
          continue;
        }

        // YM ST'yi MM GT ile ilişkilendir
        const savedYmStResult = await saveYMST(ymSt, savedMmGt.id);
        if (!savedYmStResult) {
          console.error(`YM ST ilişkilendirilemedi: ${ymSt.stok_kodu}`);
          hasErrors = true;
          continue;
        }

        // Reçeteleri kaydet
        const savedRecete = await saveRecete(receteFormValues, savedMmGt.id, savedYmGt.id);
        if (!savedRecete) {
          console.error(`Reçete kaydedilemedi: ${savedMmGt.stok_kodu} için`);
          hasErrors = true;
        }

        // Kaydedilen ürünü listeye ekle ve son ürün olarak kaydet
        const productGroup = {
          mmGt: savedMmGt,
          ymGt: savedYmGt,
          ymSt: ymSt,
          recete: savedRecete
        };
        
        savedProducts.push(productGroup);
        lastSavedProduct = productGroup;
        
        console.log(`Başarıyla kaydedildi: MM GT: ${savedMmGt.stok_kodu}, YM GT: ${savedYmGt.stok_kodu}, YM ST: ${ymSt.stok_kodu}`);
      } catch (itemError) {
        console.error(`${ymSt.stok_kodu} işlenirken hata:`, itemError);
        hasErrors = true;
        // Bir öğe için hata olsa bile diğerlerine devam et
        continue;
      }
    }

    // Sonuçları işle
    if (savedProducts.length > 0) {
      // UI'ı son oluşturulan ürünle güncelle
      setDatabaseSaved(true);
      setIsEditMode(true);
      
      if (lastSavedProduct) {
        setMmGtData(lastSavedProduct.mmGt);
        setYmGtData(lastSavedProduct.ymGt);
        setReceteData(lastSavedProduct.recete || receteFormValues);
      }

      // Veritabanı verilerini güncelle
      await fetchProductDatabase();

      // Performans ölçümü sonucu
      const endTime = Date.now();
      const elapsedTime = (endTime - startTime) / 1000;
      setSavingTime(elapsedTime);

      // Başarı veya kısmi başarı bildirimi
      if (hasErrors) {
        toast.warning(`${savedProducts.length} ürün kaydedildi, ancak bazı ürünlerde hatalar oluştu. Detaylar için konsolu kontrol edin. (${elapsedTime.toFixed(2)} saniye)`);
      } else {
        toast.success(`${savedProducts.length} ürün başarıyla veritabanına kaydedildi (${elapsedTime.toFixed(2)} saniye)`);
      }
      
      return true;
    } else {
      // Hiç ürün kaydedilemedi
      setError('Hiçbir ürün kaydedilemedi. Lütfen hata mesajlarını kontrol edin.');
      toast.error('Hiçbir ürün kaydedilemedi. Lütfen konsol hatalarını kontrol edin.');
      return false;
    }
  } catch (error) {
    console.error('Veritabanı kaydetme hatası:', error);
    setError('Veritabanına kayıt sırasında hata oluştu: ' + error.message);
    toast.error('Veritabanına kayıt sırasında hata oluştu: ' + error.message);
    return false;
  } finally {
    setLoading(false);
  }
};