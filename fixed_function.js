  // YM ST'lerin otomatik seçimi - İyileştirilmiş ve veri kaynağını gösteren versiyon
  const autoSelectYmSt = async (values) => {
    try {
      setLoading(true);

      toast.info('YM ST önerileri oluşturuluyor...', { autoClose: 2000 });

      // Mevcut YM ST'leri temizle
      setSelectedYmSt([]);

      // YM ST parametrelerini hesapla
      const params = calculateYmStParameters(values);
      
      // Ürün tipi ve çapına göre YM ST önerileri bul
      const capValue = parseFloat(values.cap);
      const kod2 = values.kod_2;

      // Tüm YM ST'leri yükle (eğer yoksa)
      if (ymStList.length === 0) {
        await loadYmStList();
      }

      // YM ST seçimi için daha detaylı bir algoritma
      let selectedItems = [];
      let ymStLookupList = [...ymStList]; // Var olan listeyi kopyala

      // 1. Önce özel eşleşme tablosunu kontrol et
      const specialMatchMap = {
        // NIT tipi ürünler için özel eşleşmeler
        'YM.GT.NIT.0150.00': 'YM.ST.0142.0600.1006',
        'YM.GT.NIT.0170.00': 'YM.ST.0159.0600.1006',
        'YM.GT.NIT.0245.00': 'YM.ST.0240.0600.1006'
        // ...diğer eşleşmeler
      };

      // YM GT stok kodu
      const ymGtStokKodu = `YM.GT.${kod2}.${parseFloat(values.cap).toFixed(2).replace('.', '').padStart(4, '0')}.00`;
      const specialMatch = specialMatchMap[ymGtStokKodu];
      
      // Özel eşleşme varsa ekle
      if (specialMatch) {
        const matchedYmSt = ymStLookupList.find(item => item.stok_kodu === specialMatch);
        if (matchedYmSt) {
          // Kaynağı belirt - veritabanından alındı
          matchedYmSt.source = 'database';
          matchedYmSt.sourceLabel = 'Veritabanından';
          selectedItems.push(matchedYmSt);
        }
      }

      // 2. Eğer özel eşleşme yoksa veya bulunamadıysa, çap ve türe göre hesapla
      if (selectedItems.length < 3) { // En az 3 öneri yapmaya çalış
        if (kod2 === 'NIT') {
          // Hesaplanmış parametreleri kullan
          const { minCap, maxCap, filmasin, quality } = params;

          // Uygun YM ST'leri bul
          const matches = ymStLookupList.filter(item => {
            const itemCap = parseFloat(item.cap);
            return !isNaN(itemCap) &&
                   itemCap >= minCap &&
                   itemCap <= maxCap &&
                   (!filmasin || item.filmasin === filmasin) &&
                   (!quality || item.quality === quality) &&
                   !selectedItems.some(selected => selected.stok_kodu === item.stok_kodu); // Zaten eklenmiş olanları hariç tut
          });

          // Bulunanları ekle (toplam 3'e kadar)
          if (matches.length > 0) {
            const matchesToAdd = matches.slice(0, 3 - selectedItems.length);
            matchesToAdd.forEach(item => {
              item.source = 'database';
              item.sourceLabel = 'Veritabanından';
            });
            selectedItems = [...selectedItems, ...matchesToAdd];
          }
        } else if (kod2 === 'PAD') {
          // Hesaplanmış parametreleri kullan
          const { minCap, maxCap, filmasin, quality } = params;

          // PAD için hesaplanmış çap aralığında YM ST ara
          const matches = ymStLookupList.filter(item => {
            const itemCap = parseFloat(item.cap);
            // PAD için hesaplanmış çap aralığını kullan
            return !isNaN(itemCap) &&
                   itemCap >= minCap &&
                   itemCap <= maxCap &&
                   (!filmasin || item.filmasin === filmasin) &&
                   (!quality || item.quality === quality) &&
                   !selectedItems.some(selected => selected.stok_kodu === item.stok_kodu); // Zaten eklenmiş olanları hariç tut
          });

          // Bulunanları ekle (toplam 3'e kadar)
          if (matches.length > 0) {
            const matchesToAdd = matches.slice(0, 3 - selectedItems.length);
            matchesToAdd.forEach(item => {
              item.source = 'database';
              item.sourceLabel = 'Veritabanından';
            });
            selectedItems = [...selectedItems, ...matchesToAdd];
          }
        }
      }

      // 3. Hala yeterli YM ST önerisi yoksa (3'ten az), yeni öneriler oluştur
      if (selectedItems.length < 3) {
        // Kaç tane otomaik YM ST önerisi oluşturmak istiyoruz (toplam 3'e tamamla)
        const needCount = 3 - selectedItems.length;
        
        // Auto generating YM ST for remaining spots
        for (let i = 0; i < needCount; i++) {
          // Her yeni öneri için çap değerini biraz daha küçültmek için düzeltme faktörü
          const newItemIndex = selectedItems.filter(item => item.isNew).length;
          const adjustmentFactor = 1.0 - (0.01 * newItemIndex); // Her yeni öneride çapı biraz daha küçült

          // Çap hesaplaması
          const adjustedCap = kod2 === 'NIT' ?
              (capValue * 0.96 * adjustmentFactor).toFixed(2) : // NIT için %4 küçültme + ek küçültme
              (capValue * adjustmentFactor).toFixed(2);         // PAD için minimal küçültme

          // Çap değerlerine göre filmaşin ve kalite belirle
          let filmasin, quality;

          if (capValue < 1.5) {
            filmasin = 550;
            quality = '1006';
          } else if (capValue < 2.5) {
            filmasin = 600;
            quality = '1006';
          } else if (capValue < 4.5) {
            filmasin = 600;
            quality = '1008';
          } else if (capValue < 6.0) {
            filmasin = 700;
            quality = '1010';
          } else if (capValue < 7.0) {
            filmasin = 800;
            quality = '1010';
          } else {
            filmasin = 900;
            quality = '1010';
          }

          // Çap değerini doğru formatta (4 basamaklı) hazırlama
          const formattedStCap = adjustedCap.replace('.', '').padStart(4, '0');

          // Yeni YM ST için stok kodu oluştur
          const stockCode = `YM.ST.${formattedStCap}.${filmasin.toString().padStart(4, '0')}.${quality}`;
          const stockName = `YM Siyah Tel ${formattedStCap} mm HM:${filmasin.toString().padStart(4, '0')}.${quality}`;

          // Özel saha 1 değerini belirle
          let ozelSaha1 = 1;
          if (adjustedCap >= 2 && adjustedCap < 3) ozelSaha1 = 2;
          else if (adjustedCap >= 3 && adjustedCap < 4) ozelSaha1 = 3;
          else if (adjustedCap >= 4 && adjustedCap < 5) ozelSaha1 = 4;
          else if (adjustedCap >= 5 && adjustedCap < 6) ozelSaha1 = 5;
          else if (adjustedCap >= 6 && adjustedCap < 7) ozelSaha1 = 6;
          else if (adjustedCap >= 7 && adjustedCap < 8) ozelSaha1 = 7;
          else if (adjustedCap >= 8) ozelSaha1 = 8;

          // Yeni YM ST oluştur
          const newYmSt = {
            stok_kodu: stockCode,
            cap: adjustedCap,
            filmasin: filmasin,
            quality: quality,
            ozel_saha_1: ozelSaha1,
            stok_adi: stockName,
            isNew: true, // Yeni oluşturulduğunu belirt
            source: 'auto-generated',
            sourceLabel: 'Otomatik oluşturuldu'
          };

          // Eğer aynı stok kodunda eklenmemişse listeye ekle
          if (!selectedItems.some(item => item.stok_kodu === newYmSt.stok_kodu)) {
            selectedItems.push(newYmSt);
          }
        }
      }

      // YM ST önerilerini daha kolay yönetmek için düzenleme
      const suggestions = selectedItems.map((item, index) => ({
        ...item,
        id: item.id || `ym-st-${index}`, // Eğer id yoksa yeni bir id oluştur
        status: 'selected' // Otomatik seçim yapıldığını belirt
      }));

      // Tekrarlanan kayıtları filtrele (stok koduna göre)
      const seenStokKodu = new Set();
      const uniqueSuggestions = [];
      
      suggestions.forEach(item => {
        if (!seenStokKodu.has(item.stok_kodu)) {
          seenStokKodu.add(item.stok_kodu);
          uniqueSuggestions.push(item);
        }
      });
      
      // Seçili YM ST'leri temizle ve yeni önerilerle doldur
      setSelectedYmSt(uniqueSuggestions);

      return uniqueSuggestions;
    } catch (error) {
      console.error('YM ST otomatik seçim hatası:', error);
      setError('YM ST önerileri oluşturulurken bir hata oluştu');
      return [];
    }
  };