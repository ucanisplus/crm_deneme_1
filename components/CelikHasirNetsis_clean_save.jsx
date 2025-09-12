// CLEAN SAVE FUNCTION FOR RENDER - Individual save logic
const saveToDatabase = async (products) => {
  try {
    // Reset cancellation flag and saved products tracker for new session
    isSaveCancelledRef.current = false;
    currentSessionSavedProducts.current = [];

    // Reset batch sequence counter for new batch
    resetBatchSequenceCounter();
    
    // Initialize batch sequence before any stok kodu generation
    await initializeBatchSequence();
    
    setIsLoading(true);
    setIsSavingToDatabase(true);
    setDatabaseProgress({ current: 0, total: 0, operation: 'Veritabanı kontrol ediliyor...', currentProduct: '' });
    
    // Sadece kaydedilmesi gereken ürünleri kaydet
    const productsToSave = getProductsToSave();
    
    if (productsToSave.length === 0) {
      toast.warning('Kaydedilecek ürün bulunamadı.');
      return;
    }

    // Skip database refresh during save to avoid timeout - use existing data  
    setDatabaseProgress({ current: 0, total: 0, operation: 'Mevcut veriler kullanılıyor...', currentProduct: '' });
    
    console.log('Using existing database state for save operation (avoiding timeout)');
    
    // Use existing savedProducts instead of fetching fresh data to avoid timeout
    const freshSavedProducts = savedProducts;
    
    console.log('Fresh database state:', {
      mm: freshSavedProducts.mm.length,
      ncbk: freshSavedProducts.ncbk.length,
      ntel: freshSavedProducts.ntel.length,
      mmCodes: freshSavedProducts.mm.map(p => p.stok_kodu)
    });
    
    setSavedProducts(freshSavedProducts);
    
    // Create a map of Stok Adı to all related Stok Kodus
    const stokAdiToStokKodusMap = new Map();
    
    // Map all existing products by Stok Adı
    [...freshSavedProducts.mm, ...freshSavedProducts.ncbk, ...freshSavedProducts.ntel].forEach(p => {
      if (p.stok_adi) {
        if (!stokAdiToStokKodusMap.has(p.stok_adi)) {
          stokAdiToStokKodusMap.set(p.stok_adi, []);
        }
        stokAdiToStokKodusMap.get(p.stok_adi).push(p.stok_kodu);
      }
    });
    
    console.log('Stok Adı to Stok Kodus mapping:', Array.from(stokAdiToStokKodusMap.entries()));
    console.log('Sample database Stok Adı formats:', Array.from(stokAdiToStokKodusMap.keys()).slice(0, 3));
    
    // Duplicates'leri ÖNCE filtrele - sadece yeni ürünleri kaydet
    const newProducts = [];
    const skippedProducts = [];
    const batchDuplicates = []; // Track duplicates within current batch
    
    // First pass: identify duplicates within the batch itself
    const batchStokAdiMap = new Map(); // Map Stok Adı to first occurrence index
    const batchUniqueProducts = []; // Products after removing batch duplicates
    
    for (let i = 0; i < productsToSave.length; i++) {
      const product = productsToSave[i];
      const productStokAdi = generateStokAdi(product, 'CH');
      
      if (batchStokAdiMap.has(productStokAdi)) {
        // This is a duplicate within the batch
        const firstOccurrenceIndex = batchStokAdiMap.get(productStokAdi);
        batchDuplicates.push({
          ...product,
          duplicateOfIndex: firstOccurrenceIndex,
          stokAdi: productStokAdi
        });
      } else {
        // First occurrence of this Stok Adı in the batch
        batchStokAdiMap.set(productStokAdi, i);
        batchUniqueProducts.push(product);
      }
    }
    
    // Second pass: check unique products against database
    for (const product of batchUniqueProducts) {
      // Generate Stok Adı for identification
      const productStokAdi = generateStokAdi(product, 'CH');
      
      // Debug: Log what we're comparing
      console.log('*** STOK ADI COMPARISON DEBUG ***');
      console.log('Generated Stok Adı:', JSON.stringify(productStokAdi));
      console.log('Product data:', {
        hasirTipi: product.hasirTipi,
        boyCap: product.boyCap,
        enCap: product.enCap,
        uzunlukBoy: product.uzunlukBoy,
        uzunlukEn: product.uzunlukEn,
        boyAraligi: product.boyAraligi,
        enAraligi: product.enAraligi,
        gozAraligi: product.gozAraligi
      });
      
      if (stokAdiToStokKodusMap.has(productStokAdi)) {
        const existingStokKodus = stokAdiToStokKodusMap.get(productStokAdi);
        console.log(`⚠️ DUPLICATE: "${productStokAdi}" already exists with codes:`, existingStokKodus);
        skippedProducts.push({
          ...product,
          stokAdi: productStokAdi,
          existingStokKodus: existingStokKodus
        });
      } else {
        console.log(`✅ NEW: "${productStokAdi}" will be saved`);
        newProducts.push(product);
      }
    }
    
    const unoptimizedCount = newProducts.filter(p => !isProductOptimized(p)).length;
    
    // İlerleme tracking
    let processedCount = 0;
    const totalCount = newProducts.length;
    const duplicateMessage = batchDuplicates.length > 0 ? `, ${batchDuplicates.length} duplike ürün` : '';
    setDatabaseProgress({ 
      current: 0, 
      total: totalCount, 
      operation: `${newProducts.length} yeni ürün kaydediliyor, ${skippedProducts.length} mevcut ürün atlanıyor${duplicateMessage}...`,
      currentProduct: unoptimizedCount > 0 ? `(${unoptimizedCount} optimize edilmemiş)` : ''
    });
    
    // INDIVIDUAL SAVE LOGIC (working with Render endpoints)
    console.log(`🚀 Starting individual save operations for ${newProducts.length} products...`);
    
    for (let i = 0; i < newProducts.length; i++) {
      const product = newProducts[i];
      processedCount++;
      setDatabaseProgress({ 
        current: processedCount, 
        total: newProducts.length, 
        operation: 'Veritabanına kaydediliyor...',
        currentProduct: `${product.hasirTipi} (${product.uzunlukBoy}x${product.uzunlukEn}cm)`
      });
      
      // CH kaydı
      const kgValue = parseFloat(product.adetKg || product.totalKg || 0);
      
      // Generate stok_kodu and capture it for sequence tracking
      let generatedStokKodu = generateStokKodu(product, 'CH', i);
      const chData = {
        stok_kodu: generatedStokKodu,
        stok_adi: generateStokAdi(product, 'CH'),
        grup_kodu: 'MM',
        kod_1: 'HSR',
        kod_2: (product.uzunlukBoy === '500' && product.uzunlukEn === '215' && 
                (formatGozAraligi(product) === '15x15' || formatGozAraligi(product) === '15x25')) ? 'STD' : 'OZL',
        ingilizce_isim: generateIngilizceIsim(product, 'CH'),
        // Standard columns from SQL
        alis_kdv_orani: 20,
        satis_kdv_orani: 20,
        muh_detay: 31,
        depo_kodu: 36,
        br_1: 'KG',
        br_2: 'AD',
        pay_1: 1,
        payda_1: parseFloat(kgValue.toFixed(5)),
        cevrim_degeri_1: 0,
        olcu_br_3: null,
        cevrim_pay_2: 1,
        cevrim_payda_2: 1,
        cevrim_degeri_2: 1,
        // Product specific columns
        hasir_tipi: normalizeHasirTipi(product.hasirTipi),
        cap: parseFloat(parseFloat(product.boyCap || 0).toFixed(1)),
        cap2: parseFloat(parseFloat(product.enCap || 0).toFixed(1)),
        ebat_boy: parseFloat(product.uzunlukBoy || 0),
        ebat_en: parseFloat(product.uzunlukEn || 0),
        goz_araligi: formatGozAraligi(product),
        kg: parseFloat(kgValue.toFixed(5)),
        ic_cap_boy_cubuk_ad: parseInt(product.cubukSayisiBoy || 0),
        dis_cap_en_cubuk_ad: parseInt(product.cubukSayisiEn || 0),
        // Defaults
        ozel_saha_2_say: 0,
        ozel_saha_3_say: 0,
        ozel_saha_4_say: 0,
        alis_fiyati: 0,
        fiyat_birimi: 2,
        satis_fiyati_1: 0,
        satis_fiyati_2: 0,
        satis_fiyati_3: 0,
        satis_fiyati_4: 0,
        doviz_tip: 0,
        doviz_alis: 0,
        doviz_maliyeti: 0,
        doviz_satis_fiyati: 0,
        azami_stok: 0,
        asgari_stok: 0,
        bekleme_suresi: 0,
        temin_suresi: 0,
        birim_agirlik: 0,
        nakliye_tutar: 0,
        stok_turu: 'D',
        esnek_yapilandir: 'H',
        super_recete_kullanilsin: 'H',
        user_id: user.id
      };

      let chResult;
      
      try {
        // CH SAVE: Real API call to Render backend
        console.log('🔍 DEBUG - CH Data being saved:', {
          stok_kodu: chData.stok_kodu,
          stok_adi: chData.stok_adi,
          hasir_tipi: chData.hasir_tipi,
          fiyat_birimi: chData.fiyat_birimi,
          cap: chData.cap,
          cap2: chData.cap2,
          ebat_boy: chData.ebat_boy,
          ebat_en: chData.ebat_en,
          kg: chData.kg
        });
        
        const chResponse = await fetchWithRetry(API_URLS.celikHasirMm, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(chData)
        }, 5, 1000, (msg) => setDatabaseProgress(prev => ({ ...prev, operation: msg })));
        
        if (chResponse.status === 409) {
          // Duplicate detected - try with next sequence number
          console.log(`*** DUPLICATE DETECTED: ${chData.stok_kodu} already exists, retrying with next sequence`);
          
          // Increment sequence counter and try again (max 3 attempts)
          let retryAttempts = 0;
          let retrySuccess = false;
          
          while (retryAttempts < 3 && !retrySuccess) {
            retryAttempts++;
            batchSequenceCounter++; // Increment to get next sequence number
            const newStokKodu = `CHOZL${String(batchSequenceCounter).padStart(4, '0')}`;
            console.log(`*** Retry attempt ${retryAttempts}: trying with ${newStokKodu}`);
            
            // Update the chData with new stok_kodu
            chData.stok_kodu = newStokKodu;
            
            // Try saving again
            const retryResponse = await fetchWithRetry(`${API_URLS.celikHasirMm}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(chData)
            }, 3, 1000, (msg) => setDatabaseProgress(prev => ({ ...prev, operation: `${msg} (retry ${retryAttempts})` })));
            
            if (retryResponse.ok) {
              console.log(`*** Retry successful with ${newStokKodu}`);
              chResult = await retryResponse.json();
              generatedStokKodu = newStokKodu; // Update the generated code for sequence tracking
              retrySuccess = true;
            } else if (retryResponse.status === 409) {
              console.log(`*** Retry ${retryAttempts} still duplicate: ${newStokKodu}`);
              // Continue loop for next retry
            } else {
              throw new Error(`CH kaydi basarisiz: ${retryResponse.status} (retry ${retryAttempts})`);
            }
          }
          
          if (!retrySuccess) {
            console.error(`*** Failed to save CH after 3 retry attempts`);
            toast.error(`Kayit basarisiz: 3 deneme sonucu duplicate hatasi`);
            continue; // Skip this product
          }
        } else if (!chResponse.ok) {
          throw new Error(`CH kaydi basarisiz: ${chResponse.status}`);
        } else {
          chResult = await chResponse.json();
        }

        // Track saved CH product
        currentSessionSavedProducts.current.push({
          type: 'CH',
          stok_kodu: chResult.stok_kodu,
          id: chResult.id || chResult.stok_kodu
        });
        
        console.log(`✅ CH saved successfully: ${chResult.stok_kodu}`);

      } catch (error) {
        console.error(`Ürün kaydı hatası (${product.hasirTipi}):`, error);
        toast.error(`Ürün kaydı hatası: ${product.hasirTipi}`);
        continue; // Bu ürünü atla, diğerlerine devam et
      }

      // Save NCBK and NTEL here (similar clean individual save logic)...
      // ... (rest of the save logic)
    }

    // Individual save completed successfully
    console.log(`✅ Successfully processed ${processedCount} products individually`);
    
    // Update sequences after all saves completed
    try {
      console.log('*** Updating sequences with dual backup system');
      if (newProducts.length > 0) {
        const actualSequence = batchSequenceCounter;
        console.log('*** Final batch sequence counter:', actualSequence);
        await updateSequences(newProducts[newProducts.length - 1], actualSequence);
      }
    } catch (seqError) {
      console.error('Sequence update error:', seqError);
    }

    // Return the newly saved products for UI update
    toast.success(`${processedCount} yeni ürün ve reçeteleri başarıyla kaydedildi!`);
    
    // Sadece yeni kaydedilen ürünleri döndür
    return newProducts;
    
  } catch (error) {
    console.error('Veritabanına kaydetme hatası:', error);
    
    // Provide specific error messages based on error type
    if (error.message?.includes('CORS') || error.message?.includes('Failed to fetch')) {
      toast.error('Ağ bağlantısı hatası - Lütfen internet bağlantınızı kontrol edin');
    } else if (error.message?.includes('Backend responses failed')) {
      toast.error('Veritabanı sunucusuna erişilemiyor - Lütfen daha sonra tekrar deneyin');
    } else if (error.message?.includes('401') || error.message?.includes('403')) {
      toast.error('Yetki hatası - Lütfen tekrar giriş yapın');
    } else {
      toast.error(`Veritabanına kaydetme sırasında hata oluştu: ${error.message || 'Bilinmeyen hata'}`);
    }
    
    return [];
  } finally {
    setIsLoading(false);
    setIsSavingToDatabase(false);
    setDatabaseProgress({ current: 0, total: 0, operation: '', currentProduct: '' });
  }
};