// Create a fixed version of the saveRecipesToDatabase function that fixes the core issue
// The issue is that when the API returns 404 errors, the code fails to properly handle it and doesn't save the recipes

// The key fixes needed are:
// 1. Add fallback mechanism when getting MMGT and YMGT data fails with 404
// 2. Generate stok_kodu values even when the API fails
// 3. Improve error handling for all recipe save operations
// 4. Fix syntax errors with missing semicolons

// Here is how the fixed saveRecipesToDatabase function should look:

const saveRecipesToDatabase = async (mmGtIds, ymGtId, ymStIds) => {
  try {
    const allYmSts = [...selectedYmSts, ...autoGeneratedYmSts];
    const mainYmSt = allYmSts[mainYmStIndex] || allYmSts[0];
    
    // ÖNEMLİ KRİTİK FIX: Artan sequence'i doğru şekilde almak MMGT ve YMGT reçeteleri için hayati
    let mmGtSequence = '00';
    let mmGtStokKodu = '';
    let ymGtSequence = '00';
    let ymGtStokKodu = '';
    
    // 1. MMGT stok_kodu'nu direkt olarak veritabanından al
    if (mmGtIds.length > 0) {
      const mmGtId = mmGtIds[0];
      
      try {
        // MMGT'nin stok_kodu'nu direkt veritabanından al
        const mmGtResponse = await fetchWithAuth(`${API_URLS.galMmGt}/${mmGtId}`);
        if (mmGtResponse && mmGtResponse.ok) {
          const mmGt = await mmGtResponse.json();
          if (mmGt && mmGt.stok_kodu) {
            mmGtStokKodu = mmGt.stok_kodu;
            mmGtSequence = mmGt.stok_kodu.split('.').pop();
            
            if (mmGtSequence === '00') {
              console.warn(`UYARI: MMGT ürünü veritabanında "00" sequence ile kaydedilmiş`);
            } else {
              console.log(`KRİTİK FIX! MMGT veritabanında bulunan GERÇEK stok_kodu: ${mmGtStokKodu} (sequence: ${mmGtSequence})`);
            }
          } else {
            console.error(`MMGT veritabanında stok_kodu bulunamadı! ID: ${mmGtId}`);
            // Ürün bulunamadı durumunda otomatik kod oluştur
            const capFormatted = Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0');
            mmGtStokKodu = `GT.${mmGtData.kod_2}.${capFormatted}.00`;
            mmGtSequence = '00';
            console.log(`MMGT için otomatik stok_kodu oluşturuldu: ${mmGtStokKodu}`);
          }
        } else {
          console.error(`MMGT veritabanından alınamadı! ID: ${mmGtId}`);
          // API 404 hatası durumunda otomatik kod oluştur
          const capFormatted = Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0');
          mmGtStokKodu = `GT.${mmGtData.kod_2}.${capFormatted}.00`;
          mmGtSequence = '00';
          console.log(`MMGT için otomatik stok_kodu oluşturuldu: ${mmGtStokKodu}`);
        }
      } catch (error) {
        console.error(`MMGT bilgileri alınırken hata: ${error.message}`);
        // Hata durumunda otomatik kod oluştur
        const capFormatted = Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0');
        mmGtStokKodu = `GT.${mmGtData.kod_2}.${capFormatted}.00`;
        mmGtSequence = '00';
        console.log(`MMGT için otomatik stok_kodu oluşturuldu: ${mmGtStokKodu}`);
      }
    }
    
    // 2. YMGT stok_kodu'nu direkt olarak veritabanından al
    if (ymGtId) {
      try {
        const ymGtResponse = await fetchWithAuth(`${API_URLS.galYmGt}/${ymGtId}`);
        if (ymGtResponse && ymGtResponse.ok) {
          const ymGt = await ymGtResponse.json();
          if (ymGt && ymGt.stok_kodu) {
            ymGtStokKodu = ymGt.stok_kodu;
            ymGtSequence = ymGt.stok_kodu.split('.').pop();
            
            if (ymGtSequence === '00') {
              console.warn(`UYARI: YMGT ürünü veritabanında "00" sequence ile kaydedilmiş`);
            } else {
              console.log(`KRİTİK FIX! YMGT veritabanında bulunan GERÇEK stok_kodu: ${ymGtStokKodu} (sequence: ${ymGtSequence})`);
            }
            
            // MMGT ve YMGT aynı sequence'e sahip olmalı!
            if (mmGtSequence !== ymGtSequence) {
              console.error(`SORUN! MMGT ve YMGT farklı sequence'lere sahip! MMGT: ${mmGtSequence}, YMGT: ${ymGtSequence}`);
              // YMGT sequence'i MMGT ile aynı yap - kritik düzeltme
              ymGtSequence = mmGtSequence;
            }
          } else {
            console.error(`YMGT veritabanında stok_kodu bulunamadı! ID: ${ymGtId}`);
            // Ürün bulunamadı durumunda otomatik kod oluştur
            const capFormatted = Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0');
            ymGtStokKodu = `YM.GT.${mmGtData.kod_2}.${capFormatted}.${mmGtSequence}`;
            console.log(`YMGT için otomatik stok_kodu oluşturuldu: ${ymGtStokKodu}`);
          }
        } else {
          console.error(`YMGT veritabanından alınamadı! ID: ${ymGtId}`);
          // API 404 hatası durumunda otomatik kod oluştur
          const capFormatted = Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0');
          ymGtStokKodu = `YM.GT.${mmGtData.kod_2}.${capFormatted}.${mmGtSequence}`;
          console.log(`YMGT için otomatik stok_kodu oluşturuldu: ${ymGtStokKodu}`);
        }
      } catch (error) {
        console.error(`YMGT bilgileri alınırken hata: ${error.message}`);
        // Hata durumunda otomatik kod oluştur
        const capFormatted = Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0');
        ymGtStokKodu = `YM.GT.${mmGtData.kod_2}.${capFormatted}.${mmGtSequence}`;
        console.log(`YMGT için otomatik stok_kodu oluşturuldu: ${ymGtStokKodu}`);
      }
    }
    
    console.log(`REÇETELER İÇİN KULLANILACAK SEQUENCE: ${mmGtSequence}`);
    console.log(`MMGT MAMUL_KODU: ${mmGtStokKodu}`);
    console.log(`YMGT MAMUL_KODU: ${ymGtStokKodu}`);
    
    // Sadece 1 MM GT reçetesini kaydet
    if (mmGtIds.length > 0) {
      // mmGtStokKodu null ise oluştur
      if (!mmGtStokKodu) {
        const capFormatted = Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0');
        mmGtStokKodu = `GT.${mmGtData.kod_2}.${capFormatted}.00`;
        mmGtSequence = '00';
        console.log(`MMGT için yedek stok_kodu oluşturuldu: ${mmGtStokKodu}`);
      }
      
      const mmGtId = mmGtIds[0]; // Artık sadece 1 tane MM GT var
      const mmGtRecipe = allRecipes.mmGtRecipes[mainYmStIndex] || {}; // Ana YM ST'ye bağlı MM GT reçetesi
      
      console.log(`MMGT reçeteleri için ID: ${mmGtId}, stok_kodu: ${mmGtStokKodu}, sequence: ${mmGtSequence}`);
      
      // MMGT için mevcut tüm reçeteleri kontrol et ve sil
      try {
        // 1. Tüm mevcut reçeteleri getir
        const allRecipesResponse = await fetchWithAuth(`${API_URLS.galMmGtRecete}?mm_gt_id=${mmGtId}`);
        if (allRecipesResponse && allRecipesResponse.ok) {
          const allRecipesData = await allRecipesResponse.json();
          console.log(`${allRecipesData.length} adet MMGT reçetesi bulundu`);
          
          // 2. Her reçeteyi kontrol et, yanlış mamul_kodu veya bilesen_kodu içerenleri sil
          for (const recipe of allRecipesData) {
            // mamul_kodu mmGtStokKodu ile aynı değilse sil
            if (recipe.mamul_kodu !== mmGtStokKodu) {
              console.log(`YANLIŞ MAMUL_KODU MMGT reçetesi siliniyor: ID=${recipe.id}, mamul_kodu=${recipe.mamul_kodu}, doğrusu=${mmGtStokKodu}`);
              try {
                await fetchWithAuth(`${API_URLS.galMmGtRecete}/${recipe.id}`, { method: 'DELETE' });
              } catch (deleteError) {
                console.error(`MMGT reçetesi silinemedi: ${deleteError.message}`);
              }
            }
          }
        } else {
          console.log(`MMGT için reçete bulunamadı - 404 hatası olabilir`);
        }
      } catch (error) {
        console.error('MMGT reçeteleri kontrol edilirken hata:', error);
        // Hata durumunda işleme devam et
      }
      
      // Tüm mevcut reçeteleri sil - güvenlik için
      await deleteExistingRecipes('mmgt', mmGtId);
      
      let siraNo = 1;
      const capFormatted = Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0');
      
      // KRİTİK: mamul_kodu kesinlikle ve kesinlikle MMGT stok kartı tablosundaki stok_kodu ile aynı olmalı
      const mamulKodu = mmGtStokKodu;
      console.log(`MMGT REÇETELERİ İÇİN KULLANILACAK MAMUL_KODU: ${mamulKodu} (sequence: ${mmGtSequence})`);
      
      // Son bir kontrol: mmGtStokKodu boş olmamalı ve doğru formatta olmalı
      if (!mamulKodu || !mamulKodu.includes('.')) {
        console.error(`HATA! Geçersiz MMGT stok_kodu: ${mamulKodu}`);
        throw new Error(`Geçersiz MMGT stok_kodu: ${mamulKodu}`);
      }
      
      console.log(`MMGT reçete için kullanılacak mamul_kodu: ${mamulKodu} (sequence: ${mmGtSequence})`);
      
      // Son bir kontrol: sequence doğru mu?
      const recordSequence = mamulKodu.split('.').pop();
      if (recordSequence !== mmGtSequence) {
        console.error(`UYARI! Sequence tutarsızlığı: Reçete için ${recordSequence}, Stok için ${mmGtSequence}`);
      }
      
      // MMGT reçete sıralaması: 1) YM.GT bileşeni, 2) GTPKT01 operasyonu, 3) diğer bileşenler
      const recipeEntries = Object.entries(mmGtRecipe);
      const ymGtEntry = recipeEntries.find(([key]) => key.includes('YM.GT.'));
      const operationEntry = recipeEntries.find(([key]) => key === 'GTPKT01');
      const otherEntries = recipeEntries.filter(([key]) => !key.includes('YM.GT.') && key !== 'GTPKT01');
      
      // Sırayla ekle
      const orderedEntries = [ymGtEntry, operationEntry, ...otherEntries].filter(Boolean);
      
      for (const [key, value] of orderedEntries) {
        if (value > 0) {
          // Operasyon/Bileşen sınıflandırması düzeltmesi
          const operasyonBilesen = (key === 'GTPKT01' || key === 'GLV01' || key === 'TLC01') ? 'Operasyon' : 'Bileşen';
          
          // Format the value exactly as it would appear in Excel, using points as decimal separators
          let formattedValue = value;
          if (typeof value === 'number') {
            formattedValue = value.toLocaleString('en-US', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 5,
              useGrouping: false // No thousand separators
            });
          }
          
          // Son bir kontrol: mamulKodu'nun sequence'ini doğrula
          const recordSequence = mamulKodu.split('.').pop();
          if (recordSequence !== mmGtSequence) {
            console.error(`Sequence uyuşmazlığı! Reçete kaydediliyor: ${recordSequence}, olması gereken: ${mmGtSequence}`);
          }
          
          console.log(`MMGT reçete kaydı: ${mmGtId}, ${mamulKodu}, ${key}, ${formattedValue}`);
          
          // BURADA ÖNEMLİ: MMGT reçeteleri için her zaman doğru sequence'i içeren mamul_kodu kullanmak çok önemli
          console.log(`MMGT REÇETE EKLEME (FIX): mamul_kodu=${mamulKodu}, bilesen_kodu=${key}, mm_gt_id=${mmGtId}`);
          
          // Tüm parametreleri logla
          const receteParams = {
            mm_gt_id: mmGtId,
            mamul_kodu: mamulKodu, // ÖNEMLİ: Her zaman doğru sequence ile güncel mamul_kodu
            bilesen_kodu: key,
            miktar: formattedValue,
            sira_no: siraNo++,
            operasyon_bilesen: operasyonBilesen,
            olcu_br: getOlcuBr(key),
          };
          console.log("REÇETE PARAMETRE KONTROLÜ:", JSON.stringify(receteParams));
          
          // Başka bir reçete ile çakışma olabilir mi kontrol et
          try {
            const checkResponse = await fetchWithAuth(`${API_URLS.galMmGtRecete}?mm_gt_id=${mmGtId}`);
            if (checkResponse && checkResponse.ok) {
              const existingRecipes = await checkResponse.json();
              const conflictRecipe = existingRecipes.find(r => r.bilesen_kodu === key && r.mamul_kodu !== mamulKodu);
              if (conflictRecipe) {
                console.error(`ÇAKIŞMA! Farklı mamul_kodu ile reçete mevcut: ${conflictRecipe.mamul_kodu} (silinecek)`);
                try {
                  await fetchWithAuth(`${API_URLS.galMmGtRecete}/${conflictRecipe.id}`, { method: 'DELETE' });
                } catch (deleteError) {
                  console.error(`Çakışan MMGT reçetesi silinemedi: ${deleteError.message}`);
                }
              }
            }
          } catch (checkError) {
            console.error(`MMGT reçeteleri kontrol edilirken hata: ${checkError.message}`);
            // Hataya rağmen devam et
          }
          
          try {
            console.log(`MMGT reçetesi kaydediliyor: ${mmGtId}, ${mamulKodu}, ${key}`);
            const receteResponse = await fetchWithAuth(API_URLS.galMmGtRecete, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...receteParams,
                olcu_br_bilesen: '1',
                aciklama: getReceteAciklama(key),
                ua_dahil_edilsin: 'evet',
                son_operasyon: 'evet',
                recete_top: 1,
                fire_orani: 0.0004, // Match Excel format
                // Additional fields for better Netsis compatibility - match Excel
                miktar_sabitle: 'H',
                stok_maliyet: 'S',
                fire_mik: '0',
                sabit_fire_mik: '0',
                istasyon_kodu: '',
                hazirlik_suresi: key.includes('01') ? 0 : null,
                uretim_suresi: key.includes('01') ? formattedValue : null, // Use formatted value
                oncelik: '0',
                planlama_orani: '100',
                alt_pol_da_transfer: 'H',
                alt_pol_ambar_cikis: 'H',
                alt_pol_uretim_kaydi: 'H',
                alt_pol_mrp: 'H',
                ic_dis: 'I'
              })
            });
            
            if (receteResponse && receteResponse.ok) {
              console.log(`MMGT reçetesi başarıyla kaydedildi: ${key}`);
            } else {
              console.error(`MMGT reçetesi kaydedilemedi: ${key}`);
            }
          } catch (saveError) {
            console.error(`MMGT reçetesi kaydedilirken hata: ${saveError.message}`);
            // Hataya rağmen devam et
          }
        }
      }
    }
    
    // Sadece 1 YM GT için reçete kaydet - Excel formatıyla tam uyumlu
    if (ymGtId && Object.keys(allRecipes.ymGtRecipe).length > 0) {
      // ymGtStokKodu null ise oluştur
      if (!ymGtStokKodu) {
        const capFormatted = Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0');
        ymGtStokKodu = `YM.GT.${mmGtData.kod_2}.${capFormatted}.${mmGtSequence}`;
        console.log(`YMGT için yedek stok_kodu oluşturuldu: ${ymGtStokKodu}`);
      }
      
      console.log(`YMGT reçeteleri için ID: ${ymGtId}, stok_kodu: ${ymGtStokKodu}, sequence: ${ymGtSequence}`);
      
      // MMGT ve YMGT sequence değerlerini karşılaştır ve gerekirse YMGT'yi güncelle
      if (mmGtSequence !== ymGtSequence && mmGtSequence !== '00') {
        console.error(`UYARI! YMGT sequence (${ymGtSequence}) ile MMGT sequence (${mmGtSequence}) eşleşmiyor!`);
        
        // YMGT'yi MMGT ile aynı sequence'e güncelle
        const capFormatted = Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0');
        const updatedYmGtStokKodu = `YM.GT.${mmGtData.kod_2}.${capFormatted}.${mmGtSequence}`;
        
        try {
          console.warn(`YMGT stok_kodu düzeltiliyor: ${ymGtStokKodu} → ${updatedYmGtStokKodu}`);
          
          await fetchWithAuth(`${API_URLS.galYmGt}/${ymGtId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...generateYmGtDatabaseData(mmGtSequence),
              stok_kodu: updatedYmGtStokKodu
            })
          });
          
          // Güncellenmiş kodu kullan
          ymGtStokKodu = updatedYmGtStokKodu;
          ymGtSequence = mmGtSequence;
          
          console.log(`YMGT stok_kodu güncellendi: ${ymGtStokKodu}`);
        } catch (updateError) {
          console.error(`YMGT güncellenirken hata: ${updateError.message}`);
        }
      }
      
      // Son kontrol: ymGtStokKodu geçerli olmalı
      if (!ymGtStokKodu || !ymGtStokKodu.includes('.')) {
        console.error(`HATA! Geçersiz YMGT stok_kodu: ${ymGtStokKodu}`);
        throw new Error(`Geçersiz YMGT stok_kodu: ${ymGtStokKodu}`);
      }
      
      // YMGT için mevcut tüm reçeteleri kontrol et ve sil
      try {
        // 1. Tüm mevcut reçeteleri getir
        const allRecipesResponse = await fetchWithAuth(`${API_URLS.galYmGtRecete}?ym_gt_id=${ymGtId}`);
        if (allRecipesResponse && allRecipesResponse.ok) {
          const allRecipesData = await allRecipesResponse.json();
          console.log(`${allRecipesData.length} adet YMGT reçetesi bulundu`);
          
          // 2. Her reçeteyi kontrol et, yanlış mamul_kodu içerenleri sil
          for (const recipe of allRecipesData) {
            // mamul_kodu ymGtStokKodu ile aynı değilse sil
            if (recipe.mamul_kodu !== ymGtStokKodu) {
              console.log(`YANLIŞ MAMUL_KODU YMGT reçetesi siliniyor: ID=${recipe.id}, mamul_kodu=${recipe.mamul_kodu}, doğrusu=${ymGtStokKodu}`);
              try {
                await fetchWithAuth(`${API_URLS.galYmGtRecete}/${recipe.id}`, { method: 'DELETE' });
              } catch (deleteError) {
                console.error(`YMGT reçetesi silinemedi: ${deleteError.message}`);
              }
            }
          }
        } else {
          console.log(`YMGT için reçete bulunamadı - 404 hatası olabilir`);
        }
      } catch (error) {
        console.error('YMGT reçeteleri kontrol edilirken hata:', error);
        // Hata durumunda işleme devam et
      }
      
      // Güvenlik için tüm reçeteleri temizle
      await deleteExistingRecipes('ymgt', ymGtId);
      
      console.log(`YMGT REÇETELERİ İÇİN KULLANILACAK MAMUL_KODU: ${ymGtStokKodu} (sequence: ${ymGtSequence})`);
      
      // YM GT'yi bul - oluşturulmuş stok kodu ile
      const existingYmGt = await checkExistingProduct(API_URLS.galYmGt, ymGtStokKodu);
      
      if (existingYmGt) {
        // ÖNEMLİ: Önce reçeteleri sil, her durumda mevcut reçeteleri silip yeniden oluştur
        console.log(`YMGT reçeteleri siliniyor: YMGT ID=${existingYmGt.id}`);
        await deleteExistingRecipes('ymgt', existingYmGt.id);
        
        let siraNo = 1;
        
        // YMGT reçete sıralaması: 1) YM.ST bileşeni (ana YM ST), 2) GLV01 operasyonu, 3) diğer bileşenler
        const recipeEntries = Object.entries(allRecipes.ymGtRecipe);
        const ymStEntry = recipeEntries.find(([key]) => key.includes('YM.ST.') || key === mainYmSt.stok_kodu);
        const operationEntry = recipeEntries.find(([key]) => key === 'GLV01');
        const otherEntries = recipeEntries.filter(([key]) => !key.includes('YM.ST.') && key !== 'GLV01' && key !== mainYmSt.stok_kodu);
        
        // Sırayla ekle
        const orderedEntries = [
          ymStEntry ? [mainYmSt.stok_kodu, ymStEntry[1]] : null, // Ana YM ST'yi kullan
          operationEntry,
          ...otherEntries
        ].filter(Boolean);
        
        for (const [key, value] of orderedEntries) {
          if (value > 0) {
            // Format the value exactly as it would appear in Excel, using points as decimal separators
            let formattedValue = value;
            if (typeof value === 'number') {
              formattedValue = value.toLocaleString('en-US', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 5,
                useGrouping: false // No thousand separators
              });
            }
            
            // Son bir kontrol: ymGtStokKodu'nun sequence'ini doğrula
            const recordSequence = ymGtStokKodu.split('.').pop();
            if (recordSequence !== mmGtSequence) {
              console.error(`YMGT Sequence uyuşmazlığı! Reçete kaydediliyor: ${recordSequence}, olması gereken: ${mmGtSequence}`);
              
              // Sequence farklıysa doğru sequence ile düzelt - ÇOK ÖNEMLİ
              const capFormatted = Math.round(parseFloat(mmGtData.cap) * 100).toString().padStart(4, '0');
              const updatedYmGtStokKodu = `YM.GT.${mmGtData.kod_2}.${capFormatted}.${mmGtSequence}`;
              
              // YMGT veritabanındaki kaydı güncelle
              try {
                console.warn(`YMGT stok_kodu son kez düzeltiliyor: ${ymGtStokKodu} → ${updatedYmGtStokKodu}`);
                
                await fetchWithAuth(`${API_URLS.galYmGt}/${ymGtId}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    ...generateYmGtDatabaseData(mmGtSequence),
                    stok_kodu: updatedYmGtStokKodu
                  })
                });
                
                // Güncellenmiş kodu kullan
                ymGtStokKodu = updatedYmGtStokKodu;
                console.log(`YMGT stok_kodu güncellendi: ${ymGtStokKodu}`);
              } catch (updateError) {
                console.error(`YMGT kaydı güncellenirken hata: ${updateError.message}`);
              }
            }
            
            console.log(`YMGT reçete kaydı: ${existingYmGt.id}, ${ymGtStokKodu}, ${key}, ${formattedValue}`);
            
            // BURADA ÖNEMLİ: YMGT reçeteleri için her zaman doğru sequence'i içeren mamul_kodu kullanmak çok önemli
            console.log(`YMGT REÇETE EKLEME (FIX): mamul_kodu=${ymGtStokKodu}, bilesen_kodu=${key}, ym_gt_id=${existingYmGt.id}`);
            
            // Son bir kez daha kontrol et - YMGT'nin stok_kodu ile tamamıyla aynı olmasını garantile
            const doubleCheckYmGtResponse = await fetchWithAuth(`${API_URLS.galYmGt}/${existingYmGt.id}`);
            if (doubleCheckYmGtResponse && doubleCheckYmGtResponse.ok) {
              const doubleCheckYmGt = await doubleCheckYmGtResponse.json();
              if (doubleCheckYmGt && doubleCheckYmGt.stok_kodu) {
                if (doubleCheckYmGt.stok_kodu !== ymGtStokKodu) {
                  console.warn(`UYARI! YMGT stok_kodu (${doubleCheckYmGt.stok_kodu}) ile reçete mamul_kodu (${ymGtStokKodu}) eşleşmiyor!`);
                  
                  // Tutarsızlığı çöz - stok tablosundaki kodu kullanmak yerine, stok tablosunu düzeltmeyi dene
                  const dbSequence = doubleCheckYmGt.stok_kodu.split('.').pop();
                  if (dbSequence !== mmGtSequence) {
                    // MMGT'den gelen sequence'i kullanmalıyız - veritabanını düzelt!
                    try {
                      console.warn(`YMGT stok tablosundaki kaydı düzeltme girişimi: ${doubleCheckYmGt.stok_kodu} → ${ymGtStokKodu}`);
                      
                      await fetchWithAuth(`${API_URLS.galYmGt}/${existingYmGt.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          ...generateYmGtDatabaseData(mmGtSequence),
                          stok_kodu: ymGtStokKodu
                        })
                      });
                      
                      console.log(`YMGT stok tablosu doğru sequence (${mmGtSequence}) ile güncellendi: ${ymGtStokKodu}`);
                    } catch (error) {
                      console.error(`YMGT stok tablosu güncellenirken hata: ${error.message}`);
                      
                      // Güncellenemezse mevcut veritabanı kodunu kullan
                      ymGtStokKodu = doubleCheckYmGt.stok_kodu;
                      console.log(`YMGT reçetesi için veritabanındaki stok_kodu kullanılacak: ${ymGtStokKodu}`);
                    }
                  } else {
                    // Eşit sequence değerleri, ama farklı stok_kodu - veritabanındaki kodu kullan
                    ymGtStokKodu = doubleCheckYmGt.stok_kodu;
                    console.log(`YMGT reçetesi için veritabanındaki stok_kodu kullanılacak: ${ymGtStokKodu}`);
                  }
                } else {
                  console.log(`ONAY: YMGT stok_kodu ve reçete mamul_kodu eşleşiyor: ${ymGtStokKodu}`);
                }
              } else {
                console.warn(`UYARI: YMGT stok kaydında stok_kodu bulunamadı!`);
              }
            } else {
              console.warn(`UYARI: YMGT stok kaydına erişilemedi!`);
            }
            
            // Tüm parametreleri logla
            const receteParams = {
              ym_gt_id: existingYmGt.id,
              mamul_kodu: ymGtStokKodu, // ÖNEMLİ: Her zaman doğru sequence ile güncel mamul_kodu
              bilesen_kodu: key,
              miktar: formattedValue,
              sira_no: siraNo++,
              operasyon_bilesen: key.includes('01') ? 'Operasyon' : 'Bileşen',
              olcu_br: getOlcuBr(key),
            };
            console.log("YMGT REÇETE PARAMETRE KONTROLÜ:", JSON.stringify(receteParams));
            
            // Başka bir reçete ile çakışma olabilir mi kontrol et
            try {
              const checkResponse = await fetchWithAuth(`${API_URLS.galYmGtRecete}?ym_gt_id=${existingYmGt.id}`);
              if (checkResponse && checkResponse.ok) {
                const existingRecipes = await checkResponse.json();
                const conflictRecipe = existingRecipes.find(r => r.bilesen_kodu === key && r.mamul_kodu !== ymGtStokKodu);
                if (conflictRecipe) {
                  console.error(`ÇAKIŞMA! Farklı mamul_kodu ile YMGT reçete mevcut: ${conflictRecipe.mamul_kodu} (silinecek)`);
                  try {
                    await fetchWithAuth(`${API_URLS.galYmGtRecete}/${conflictRecipe.id}`, { method: 'DELETE' });
                  } catch (deleteError) {
                    console.error(`Çakışan YMGT reçetesi silinemedi: ${deleteError.message}`);
                  }
                }
              }
            } catch (checkError) {
              console.error(`YMGT reçeteleri kontrol edilirken hata: ${checkError.message}`);
              // Hataya rağmen devam et
            }
            
            try {
              console.log(`YMGT reçetesi kaydediliyor: ${existingYmGt.id}, ${ymGtStokKodu}, ${key}`);
              const receteResponse = await fetchWithAuth(API_URLS.galYmGtRecete, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  ...receteParams,
                  olcu_br_bilesen: '1',
                  aciklama: getReceteAciklama(key),
                  recete_top: 1,
                  fire_orani: 0.0004, // Match Excel format
                  ua_dahil_edilsin: 'evet',
                  son_operasyon: 'evet',
                  // Additional fields for better Netsis compatibility - match Excel format
                  miktar_sabitle: 'H',
                  stok_maliyet: 'S',
                  fire_mik: '0',
                  sabit_fire_mik: '0',
                  istasyon_kodu: '',
                  hazirlik_suresi: key.includes('01') ? 0 : null,
                  uretim_suresi: key.includes('01') ? formattedValue : null, // Use formatted value
                  oncelik: '0',
                  planlama_orani: '100',
                  alt_pol_da_transfer: 'H',
                  alt_pol_ambar_cikis: 'H',
                  alt_pol_uretim_kaydi: 'H',
                  alt_pol_mrp: 'H',
                  ic_dis: 'I'
                })
              });
              
              if (receteResponse && receteResponse.ok) {
                console.log(`YMGT reçetesi başarıyla kaydedildi: ${key}`);
              } else {
                console.error(`YMGT reçetesi kaydedilemedi: ${key}`);
              }
            } catch (saveError) {
              console.error(`YMGT reçetesi kaydedilirken hata: ${saveError.message}`);
              // Hataya rağmen devam et
            }
          }
        }
      }
    }
    
    // Tüm YM ST reçetelerini kaydet - Excel formatıyla tam uyumlu
    for (let i = 0; i < ymStIds.length; i++) {
      const ymStId = ymStIds[i];
      const ymSt = [...selectedYmSts, ...autoGeneratedYmSts][i];
      const ymStRecipe = allRecipes.ymStRecipes[i] || {};
      
      await deleteExistingRecipes('ymst', ymStId);
      
      let siraNo = 1;
      
      // YMST reçete sıralaması: 1) FLM bileşeni, 2) TLC01 operasyonu
      const recipeEntries = Object.entries(ymStRecipe);
      const flmEntry = recipeEntries.find(([key]) => key.includes('FLM.'));
      const operationEntry = recipeEntries.find(([key]) => key === 'TLC01');
      
      // Sırayla ekle
      const orderedEntries = [flmEntry, operationEntry].filter(Boolean);
      
      for (const [key, value] of orderedEntries) {
        if (value > 0) {
          // Format the value exactly as it would appear in Excel, using points as decimal separators
          let formattedValue = value;
          if (typeof value === 'number') {
            formattedValue = value.toLocaleString('en-US', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 5,
              useGrouping: false // No thousand separators
            });
          }
          
          try {
            console.log(`YMST reçetesi kaydediliyor: ${ymStId}, ${ymSt.stok_kodu}, ${key}`);
            const receteResponse = await fetchWithAuth(API_URLS.galYmStRecete, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ym_st_id: ymStId,
                mamul_kodu: ymSt.stok_kodu,
                bilesen_kodu: key,
                miktar: formattedValue, // Use formatted value to match Excel
                sira_no: siraNo++,
                operasyon_bilesen: key.includes('01') ? 'Operasyon' : 'Bileşen',
                olcu_br: getOlcuBr(key),
                olcu_br_bilesen: '1',
                aciklama: getReceteAciklama(key),
                recete_top: 1,
                fire_orani: 0.0004, // Match Excel format
                ua_dahil_edilsin: 'evet',
                son_operasyon: 'evet',
                // Additional fields for better Netsis compatibility - match Excel
                miktar_sabitle: 'H',
                stok_maliyet: 'S',
                fire_mik: '0',
                sabit_fire_mik: '0',
                istasyon_kodu: '',
                hazirlik_suresi: key.includes('01') ? 0 : null,
                uretim_suresi: key.includes('01') ? formattedValue : null, // Use formatted value
                oncelik: '0',
                planlama_orani: '100',
                alt_pol_da_transfer: 'H',
                alt_pol_ambar_cikis: 'H',
                alt_pol_uretim_kaydi: 'H',
                alt_pol_mrp: 'H',
                ic_dis: 'I'
              })
            });
            
            if (receteResponse && receteResponse.ok) {
              console.log(`YMST reçetesi başarıyla kaydedildi: ${key}`);
            } else {
              console.error(`YMST reçetesi kaydedilemedi: ${key}`);
            }
          } catch (saveError) {
            console.error(`YMST reçetesi kaydedilirken hata: ${saveError.message}`);
            // Hataya rağmen devam et
          }
        }
      }
    }
  } catch (error) {
    console.error('Reçete kaydetme hatası:', error);
    throw error;
  }
};