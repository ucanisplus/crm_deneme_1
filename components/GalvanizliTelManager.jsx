  
  // Veritabanına kaydetme işlemi
  const handleSaveToDatabase = async () => {
    try {
      setLoading(true);
      
      if (!mmGtData || !ymGtData || selectedYmSt.length === 0 || !receteData) {
        throw new Error('Kaydedilecek veri eksik');
      }
      
      // Sıra numarası al
      const capValue = parseFloat(formValues.cap);
      const formattedCap = capValue.toFixed(2).replace('.', '').padStart(4, '0');
      
      const seqResponse = await fetchWithAuth(
        `${API_URLS.galSequence}/next?kod_2=${formValues.kod_2}&cap=${capValue}`
      );
      
      if (!seqResponse || !seqResponse.ok) {
        throw new Error(`Sıra numarası alınamadı: ${seqResponse?.status}`);
      }
      
      const seqData = await seqResponse.json();
      console.log("Sıra numarası:", seqData);
      
      // MM GT stok kodunu güncelle
      const formattedSeq = seqData.formatted_sequence;
      const mmGtStockCode = `GT.${formValues.kod_2}.${formattedCap}.${formattedSeq}`;
      
      // MM GT oluştur
      const mmGtPayload = {
        stok_kodu: mmGtStockCode,
        aciklama: mmGtData.description,
        cap: capValue,
        kod_2: formValues.kod_2,
        kaplama: formValues.kaplama,
        min_mukavemet: formValues.min_mukavemet,
        max_mukavemet: formValues.max_mukavemet,
        tolerans_plus: formValues.tolerans_plus,
        tolerans_minus: formValues.tolerans_minus,
        ic_cap: formValues.ic_cap,
        dis_cap: formValues.dis_cap,
        kg: formValues.kg,
        unwinding: formValues.unwinding,
        shrink: formValues.shrink
      };
      
      console.log("MM GT kaydediliyor:", mmGtPayload);
      const mmGtResponse = await fetchWithAuth(API_URLS.galMmGt, {
        method: 'POST',
        body: JSON.stringify(mmGtPayload)
      });
      
      if (!mmGtResponse || !mmGtResponse.ok) {
        throw new Error(`MM GT kaydedilemedi: ${mmGtResponse?.status}`);
      }
      
      const mmGtResult = await mmGtResponse.json();
      console.log("MM GT kaydedildi:", mmGtResult);
      
      // YM GT oluştur
      const ymGtStockCode = `YM.${formValues.kod_2}.${formattedCap}.01`;
      const ymGtPayload = {
        stok_kodu: ymGtStockCode,
        aciklama: ymGtData.description,
        mm_gt_id: mmGtResult.id,
        cap: capValue,
        kod_2: formValues.kod_2,
        kaplama: formValues.kaplama,
        min_mukavemet: formValues.min_mukavemet,
        max_mukavemet: formValues.max_mukavemet,
        tolerans_plus: formValues.tolerans_plus,
        tolerans_minus: formValues.tolerans_minus,
        ic_cap: formValues.ic_cap,
        dis_cap: formValues.dis_cap,
        kg: formValues.kg,
        unwinding: formValues.unwinding,
        shrink: formValues.shrink
      };
      
      console.log("YM GT kaydediliyor:", ymGtPayload);
      const ymGtResponse = await fetchWithAuth(API_URLS.galYmGt, {
        method: 'POST',
        body: JSON.stringify(ymGtPayload)
      });
      
      if (!ymGtResponse || !ymGtResponse.ok) {
        throw new Error(`YM GT kaydedilemedi: ${ymGtResponse?.status}`);
      }
      
      const ymGtResult = await ymGtResponse.json();
      console.log("YM GT kaydedildi:", ymGtResult);
      
      // YM ST'leri kaydet
      const ymStResults = [];
      for (const ymSt of selectedYmSt) {
        // Zaten veritabanında var mı kontrol et
        if (ymSt.id && ymSt.source === 'database') {
          console.log("YM ST zaten veritabanında var:", ymSt);
          ymStResults.push(ymSt);
          
          // MM GT - YM ST ilişkisini oluştur
          await fetchWithAuth(API_URLS.galMmGtYmSt, {
            method: 'POST',
            body: JSON.stringify({
              mm_gt_id: mmGtResult.id,
              ym_st_id: ymSt.id,
              sira: ymStResults.length
            })
          });
          
          continue;
        }
        
        // Yeni YM ST oluştur
        const ymStStockCode = `YM.ST.${formValues.kod_2}.${formattedCap}.${ymStResults.length + 1}`.padEnd(2, '0');
        const ymStPayload = {
          stok_kodu: ymStStockCode,
          aciklama: `YM.ST.${formValues.kod_2} Ø${formValues.cap.toFixed(2)} ${formValues.min_mukavemet}-${formValues.max_mukavemet}N/MM²`,
          cap: capValue,
          kod_2: formValues.kod_2,
          kaplama: 0, // YM ST için kaplama değeri 0
          min_mukavemet: formValues.min_mukavemet,
          max_mukavemet: formValues.max_mukavemet,
          tolerans_plus: formValues.tolerans_plus,
          tolerans_minus: formValues.tolerans_minus,
          ic_cap: formValues.ic_cap,
          dis_cap: formValues.dis_cap,
          kg: formValues.kg,
          unwinding: formValues.unwinding,
          shrink: formValues.shrink
        };
        
        console.log("YM ST kaydediliyor:", ymStPayload);
        const ymStResponse = await fetchWithAuth(API_URLS.galYmSt, {
          method: 'POST',
          body: JSON.stringify(ymStPayload)
        });
        
        if (!ymStResponse || !ymStResponse.ok) {
          throw new Error(`YM ST kaydedilemedi: ${ymStResponse?.status}`);
        }
        
        const ymStResult = await ymStResponse.json();
        console.log("YM ST kaydedildi:", ymStResult);
        ymStResults.push(ymStResult);
        
        // MM GT - YM ST ilişkisini oluştur
        await fetchWithAuth(API_URLS.galMmGtYmSt, {
          method: 'POST',
          body: JSON.stringify({
            mm_gt_id: mmGtResult.id,
            ym_st_id: ymStResult.id,
            sira: ymStResults.length
          })
        });
      }
      
      // Reçeteleri kaydet
      // MM GT Reçetesi
      for (const item of receteData.mmGtRecete) {
        const mmGtRecetePayload = {
          mm_gt_id: mmGtResult.id,
          stok_kodu: item.stockCode,
          stok_adi: item.stockName,
          miktar: item.amount,
          birim: item.unit,
          sira: item.sira
        };
        
        await fetchWithAuth(API_URLS.galMmGtRecete, {
          method: 'POST',
          body: JSON.stringify(mmGtRecetePayload)
        });
      }
      
      // YM GT Reçetesi
      for (const item of receteData.ymGtRecete) {
        const ymGtRecetePayload = {
          ym_gt_id: ymGtResult.id,
          stok_kodu: item.stockCode,
          stok_adi: item.stockName,
          miktar: item.amount,
          birim: item.unit,
          sira: item.sira
        };
        
        await fetchWithAuth(API_URLS.galYmGtRecete, {
          method: 'POST',
          body: JSON.stringify(ymGtRecetePayload)
        });
      }
      
      // Her bir YM ST için reçete kaydet
      for (let i = 0; i < ymStResults.length; i++) {
        const ymSt = ymStResults[i];
        const receteItems = receteData.ymStRecete[ymSt.id || 'temp'] || [];
        
        for (const item of receteItems) {
          const ymStRecetePayload = {
            ym_st_id: ymSt.id,
            stok_kodu: item.stockCode,
            stok_adi: item.stockName,
            miktar: item.amount,
            birim: item.unit,
            sira: item.sira
          };
          
          await fetchWithAuth(API_URLS.galYmStRecete, {
            method: 'POST',
            body: JSON.stringify(ymStRecetePayload)
          });
        }
      }
      
      setLoading(false);
      toast.success('Veriler başarıyla kaydedildi');
      
      // Formu sıfırla
      clearForm();
      return true;
    } catch (error) {
      handleError(`Veritabanına kaydetme hatası: ${error.message}`, error);
      return false;
    }
  };
  
  // Formu temizle
  const clearForm = () => {
    setFormValues({
      cap: '',
      kod_2: 'NIT',
      kaplama: '',
      min_mukavemet: '',
      max_mukavemet: '',
      tolerans_plus: '',
      tolerans_minus: '',
      ic_cap: '',
      dis_cap: '',
      kg: '',
      unwinding: false,
      shrink: false
    });
    
    setMmGtData(null);
    setYmGtData(null);
    setSelectedYmSt([]);
    setReceteData(null);
    setIsEditMode(false);
    setDataExist(false);
    setError(null);
  };
  
  // "Otomatik Hesapla" butonu için işleyici
  const handleAutoCalculateYmSt = async () => {
    try {
      if (!formValues || !formValues.cap || !formValues.kod_2) {
        toast.error('Hesaplama için çap ve kod_2 değerleri gerekli');
        return;
      }
      
      setLoading(true);
      
      // YM ST'leri otomatik seç
      const selectedItems = await autoSelectYmSt(formValues);
      
      if (selectedItems && selectedItems.length > 0) {
        // Seçilen YM ST'lerin kaynağını belirt
        const itemsWithSource = selectedItems.map(item => ({
          ...item,
          source: item.source || 'auto-generated',
          sourceLabel: item.sourceLabel || 'Otomatik oluşturuldu'
        }));
        
        setSelectedYmSt(itemsWithSource);
        toast.success('YM ST değerleri otomatik olarak hesaplandı');
      } else {
        toast.error('YM ST değerleri hesaplanamadı');
      }
      
      setLoading(false);
    } catch (error) {
      handleError(`YM ST hesaplama hatası: ${error.message}`, error);
    }
  };
  
  // Form değişikliklerini işle
  const handleFormChange = (field, value) => {
    // Sayısal değerlerde virgülü noktaya çevir
    if (['cap', 'kaplama', 'min_mukavemet', 'max_mukavemet', 'tolerans_plus', 'tolerans_minus', 'ic_cap', 'dis_cap', 'kg'].includes(field)) {
      value = normalizeInputValue(value);
    }
    
    setFormValues(prev => ({
      ...prev,
      [field]: value
    }));
    
    // İhtiyaç duyulan hesaplamaları yap
    if (field === 'cap' || field === 'kod_2') {
      // Çap değişince MM GT önizlemesini güncelle
      const updatedValues = {
        ...formValues,
        [field]: value
      };
      
      const preview = createMmGtPreview(updatedValues);
      setMmGtData(preview);
      
      // YM GT önizlemesini de güncelle
      const ymGtPreview = createYmGtPreview(updatedValues, preview);
      setYmGtData(ymGtPreview);
    }
  };
  
  // Talepler için görüntüleme işleyicisi
  const handleViewTalepDetails = async (talepId) => {
    setSelectedTalepId(talepId);
    
    try {
      const talepData = await fetchTalepDetails(talepId);
      
      if (talepData) {
        setSelectedTalep(talepData);
        setShowTalepDetailModal(true);
      }
    } catch (error) {
      handleError(`Talep detayları yüklenirken hata oluştu: ${error.message}`, error);
    }
  };
  
  // Talep onaylama işleyicisi
  const handleApproveTalep = async () => {
    if (!selectedTalepId) {
      toast.error('İşlenecek talep seçilmedi');
      return;
    }
    
    try {
      const success = await approveTalep(selectedTalepId);
      
      if (success) {
        setShowTalepDetailModal(false);
        setSelectedTalep(null);
        setSelectedTalepId(null);
      }
    } catch (error) {
      handleError(`Talep onaylanırken hata oluştu: ${error.message}`, error);
    }
  };
  
  // Talep reddetme modalını göster
  const handleShowRejectModal = () => {
    if (!selectedTalepId) {
      toast.error('İşlenecek talep seçilmedi');
      return;
    }
    
    setShowRejectModal(true);
  };
  
  // Talep reddetme işleyicisi
  const handleRejectTalep = async () => {
    if (!selectedTalepId) {
      toast.error('İşlenecek talep seçilmedi');
      return;
    }
    
    if (!rejectionReason) {
      toast.error('Reddetme sebebi belirtmelisiniz');
      return;
    }
    
    try {
      const success = await rejectTalep(selectedTalepId, rejectionReason);
      
      if (success) {
        setShowRejectModal(false);
        setShowTalepDetailModal(false);
        setSelectedTalep(null);
        setSelectedTalepId(null);
        setRejectionReason('');
      }
    } catch (error) {
      handleError(`Talep reddedilirken hata oluştu: ${error.message}`, error);
    }
  };
  
  // Talep filtrelerini değiştirme işleyicisi
  const handleTalepFilterChange = (field, value) => {
    setTalepFilter(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Filtrelenmiş talep öğeleri
  useEffect(() => {
    if (talepList.length > 0) {
      filterTalepItems();
    }
  }, [talepList, talepFilter]);
  
  // Talep öğelerini filtrele
  const filterTalepItems = () => {
    const { status, search } = talepFilter;
    const searchTerm = search.toLowerCase();
    
    const filteredData = talepList.filter(item =>
      (status === 'all' || item.status === status) &&
      (!searchTerm ||
        (item.cap && item.cap.toString().includes(searchTerm)) ||
        (item.kod_2 && item.kod_2.toLowerCase().includes(searchTerm)))
    );
    
    setFilteredTalepItems(filteredData);
  };
  
  // Bileşen yüklendiğinde talepleri getir
  useEffect(() => {
    fetchTalepList();
  }, [fetchTalepList]);
  
  // Arama isteği gönder
  const handleSearch = async () => {
    try {
      setLoading(true);
      
      let url = API_URLS.galMmGt;
      const params = new URLSearchParams();
      
      if (searchParams.kod_2) {
        params.append('kod_2', searchParams.kod_2);
      }
      
      if (searchParams.cap) {
        params.append('cap', searchParams.cap);
      }
      
      if (params.toString()) {
        url = `${url}?${params.toString()}`;
      }
      
      const response = await fetchWithAuth(url);
      
      if (!response || !response.ok) {
        throw new Error(`Arama başarısız: ${response?.status}`);
      }
      
      const data = await response.json();
      
      setSearchResults(data);
      setShowSearchResults(true);
      setLoading(false);
    } catch (error) {
      handleError(`Arama hatası: ${error.message}`, error);
    }
  };
  
  // Arama parametrelerini değiştirme işleyicisi
  const handleSearchParamChange = (field, value) => {
    setSearchParams(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Seçilen kayıt için düzenleme moduna geç
  const handleEditItem = async (item) => {
    try {
      setIsEditMode(true);
      setDataExist(true);
      
      // MM GT verilerini yükle
      const mmGtValues = {
        cap: parseFloat(item.cap) || 0,
        kod_2: item.kod_2 || '',
        kaplama: parseInt(item.kaplama) || 0,
        min_mukavemet: parseInt(item.min_mukavemet) || 0,
        max_mukavemet: parseInt(item.max_mukavemet) || 0,
        tolerans_plus: parseFloat(item.tolerans_plus) || 0,
        tolerans_minus: parseFloat(item.tolerans_minus) || 0,
        ic_cap: parseInt(item.ic_cap) || 0,
        dis_cap: parseInt(item.dis_cap) || 0,
        kg: parseInt(item.kg) || 0,
        unwinding: item.unwinding || false,
        shrink: item.shrink || false
      };
      
      setFormValues(mmGtValues);
      
      // MM GT verilerini ayarla
      const mmGtData = {
        id: item.id,
        stockCode: item.stok_kodu,
        description: item.aciklama,
        cap: parseFloat(item.cap) || 0,
        kod_2: item.kod_2 || '',
        kaplama: parseInt(item.kaplama) || 0,
        minMukavemet: parseInt(item.min_mukavemet) || 0,
        maxMukavemet: parseInt(item.max_mukavemet) || 0,
        toleransPlus: parseFloat(item.tolerans_plus) || 0,
        toleransMinus: parseFloat(item.tolerans_minus) || 0,
        icCap: parseInt(item.ic_cap) || 0,
        disCap: parseInt(item.dis_cap) || 0,
        kg: parseInt(item.kg) || 0,
        unwinding: item.unwinding || false,
        shrink: item.shrink || false
      };
      
      setMmGtData(mmGtData);
      
      // İlişkili YM GT verilerini yükle
      const ymGtResponse = await fetchWithAuth(`${API_URLS.galYmGt}?mm_gt_id=${item.id}`);
      
      if (ymGtResponse && ymGtResponse.ok) {
        const ymGtData = await ymGtResponse.json();
        
        if (ymGtData.length > 0) {
          const ymGt = ymGtData[0];
          
          setYmGtData({
            id: ymGt.id,
            stockCode: ymGt.stok_kodu,
            description: ymGt.aciklama,
            mmGtId: ymGt.mm_gt_id,
            cap: parseFloat(ymGt.cap) || 0,
            kod_2: ymGt.kod_2 || '',
            kaplama: parseInt(ymGt.kaplama) || 0,
            minMukavemet: parseInt(ymGt.min_mukavemet) || 0,
            maxMukavemet: parseInt(ymGt.max_mukavemet) || 0,
            toleransPlus: parseFloat(ymGt.tolerans_plus) || 0,
            toleransMinus: parseFloat(ymGt.tolerans_minus) || 0,
            icCap: parseInt(ymGt.ic_cap) || 0,
            disCap: parseInt(ymGt.dis_cap) || 0,
            kg: parseInt(ymGt.kg) || 0,
            unwinding: ymGt.unwinding || false,
            shrink: ymGt.shrink || false
          });
          
          // İlişkili YM GT reçetelerini yükle
          const ymGtReceteResponse = await fetchWithAuth(`${API_URLS.galYmGtRecete}?ym_gt_id=${ymGt.id}`);
          
          if (ymGtReceteResponse && ymGtReceteResponse.ok) {
            const ymGtReceteData = await ymGtReceteResponse.json();
            
            // Bu aşamada reçete verilerini setReceteData ile ayarlayabilirsiniz
          }
        }
      }
      
      // İlişkili MM GT-YM ST ilişkilerini yükle
      const mmGtYmStResponse = await fetchWithAuth(`${API_URLS.galMmGtYmSt}?mm_gt_id=${item.id}`);
      
      if (mmGtYmStResponse && mmGtYmStResponse.ok) {
        const mmGtYmStData = await mmGtYmStResponse.json();
        
        if (mmGtYmStData.length > 0) {
          // İlişkili YM ST'leri yükle
          const ymStIds = mmGtYmStData.map(relation => relation.ym_st_id);
          
          const ymStIdsParam = ymStIds.join(',');
          const ymStResponse = await fetchWithAuth(`${API_URLS.galYmSt}?ids=${ymStIdsParam}`);
          
          if (ymStResponse && ymStResponse.ok) {
            const ymStData = await ymStResponse.json();
            
            // YM ST'leri formatlayıp set et
            const formattedYmSts = ymStData.map(ymSt => ({
              id: ymSt.id,
              stockCode: ymSt.stok_kodu,
              description: ymSt.aciklama,
              cap: parseFloat(ymSt.cap) || 0,
              kod_2: ymSt.kod_2 || '',
              kaplama: parseInt(ymSt.kaplama) || 0,
              minMukavemet: parseInt(ymSt.min_mukavemet) || 0,
              maxMukavemet: parseInt(ymSt.max_mukavemet) || 0,
              toleransPlus: parseFloat(ymSt.tolerans_plus) || 0,
              toleransMinus: parseFloat(ymSt.tolerans_minus) || 0,
              icCap: parseInt(ymSt.ic_cap) || 0,
              disCap: parseInt(ymSt.dis_cap) || 0,
              kg: parseInt(ymSt.kg) || 0,
              unwinding: ymSt.unwinding || false,
              shrink: ymSt.shrink || false,
              source: 'database',
              sourceLabel: 'Veritabanından'
            }));
            
            setSelectedYmSt(formattedYmSts);
          }
        }
      }
      
      // Düzenleme moduna geç ve ana sekmeye dön
      setActiveTab('main');
      setShowSearchResults(false);
    } catch (error) {
      handleError(`Kayıt yüklenirken hata oluştu: ${error.message}`, error);
    }
  };
  
  // Yeni talep oluştur
  const handleCreateTalep = async () => {
    try {
      if (!mmGtData) {
        toast.error('Talep oluşturmak için önce hesaplama yapmalısınız');
        return;
      }
      
      setLoading(true);
      
      // Talep verisi oluştur
      const talepData = {
        title: `Galvanizli Tel Talebi: ${formValues.kod_2} Ø${formValues.cap}`,
        description: `${formValues.kod_2} Ø${formValues.cap} ${formValues.kaplama}GR/M² ${formValues.min_mukavemet}-${formValues.max_mukavemet}N/MM² Tel Talebi`,
        created_by: user?.id || 'system',
        status: 'pending',
        data: {
          cap: formValues.cap,
          kod_2: formValues.kod_2,
          kaplama: formValues.kaplama,
          min_mukavemet: formValues.min_mukavemet,
          max_mukavemet: formValues.max_mukavemet,
          tolerans_plus: formValues.tolerans_plus,
          tolerans_minus: formValues.tolerans_minus,
          ic_cap: formValues.ic_cap,
          dis_cap: formValues.dis_cap,
          kg: formValues.kg,
          unwinding: formValues.unwinding,
          shrink: formValues.shrink
        }
      };
      
      // Talebi gönder
      const response = await fetchWithAuth(API_URLS.galSalRequests, {
        method: 'POST',
        body: JSON.stringify(talepData)
      });
      
      if (!response || !response.ok) {
        throw new Error(`Talep oluşturulamadı: ${response?.status}`);
      }
      
      const result = await response.json();
      console.log("Talep oluşturuldu:", result);
      
      setLoading(false);
      toast.success('Talep başarıyla oluşturuldu');
      
      // Talep listesini güncelle ve talepler sekmesine geç
      await fetchTalepList();
      setActiveTab('talepler');
    } catch (error) {
      handleError(`Talep oluşturma hatası: ${error.message}`, error);
    }
  };
  
  // "Kaydet ve Excel Oluştur" butonu için işleyici
  const handleSaveAndCreateExcel = async () => {
    try {
      // Önce veritabanına kaydet
      const saveSuccess = await handleSaveToDatabase();
      
      if (saveSuccess) {
        // Sonra Excel oluştur
        await createReceteExcel();
      }
    } catch (error) {
      handleError(`Kaydetme ve Excel oluşturma hatası: ${error.message}`, error);
    }
  };
  
  // MM GT, YM GT ve YM ST'leri otomatik hesapla
  const handleCalculateAll = async () => {
    try {
      if (!formValues || !formValues.cap || !formValues.kod_2) {
        toast.error('Hesaplama için çap ve kod_2 değerleri gerekli');
        return;
      }
      
      setLoading(true);
      
      // Tüm hesaplamaları yap
      await processAutomaticCalculations(formValues);
      
      setLoading(false);
      toast.success('Tüm değerler başarıyla hesaplandı');
    } catch (error) {
      handleError(`Hesaplama hatası: ${error.message}`, error);
    }
  };
  
  // UI Render
  return (
    <MainLayout3>
      <div className="container mx-auto py-4">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-gray-800">Galvanizli Tel Yönetimi</CardTitle>
            <CardDescription>
              Galvanizli tel hesaplama, stok kodu oluşturma ve reçete yönetimi
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="main">Ana İşlemler</TabsTrigger>
                <TabsTrigger value="talepler">Talepler {talepCount.pending > 0 && `(${talepCount.pending})`}</TabsTrigger>
                <TabsTrigger value="search">Arama</TabsTrigger>
              </TabsList>
              
              {/* Ana İşlemler Sekmesi */}
              <TabsContent value="main">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Sol Kolon - Form */}
                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Galvanizli Tel Bilgileri</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="cap">Çap (mm)</Label>
                              <Input
                                id="cap"
                                value={formValues.cap}
                                onChange={e => handleFormChange('cap', e.target.value)}
                                placeholder="örn. 2,50"
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="kod_2">Kod 2</Label>
                              <Select
                                value={formValues.kod_2}
                                onValueChange={value => handleFormChange('kod_2', value)}
                              >
                                <SelectTrigger id="kod_2">
                                  <SelectValue placeholder="Kod 2 seçin" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="NIT">NIT</SelectItem>
                                  <SelectItem value="ZN-P">ZN-P</SelectItem>
                                  <SelectItem value="SY">SY</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="kaplama">Kaplama (gr/m²)</Label>
                              <Input
                                id="kaplama"
                                value={formValues.kaplama}
                                onChange={e => handleFormChange('kaplama', e.target.value)}
                                placeholder="örn. 200"
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="kg">Ağırlık (kg)</Label>
                              <Input
                                id="kg"
                                value={formValues.kg}
                                onChange={e => handleFormChange('kg', e.target.value)}
                                placeholder="örn. 500"
                              />
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="min_mukavemet">Min. Mukavemet (N/mm²)</Label>
                              <Input
                                id="min_mukavemet"
                                value={formValues.min_mukavemet}
                                onChange={e => handleFormChange('min_mukavemet', e.target.value)}
                                placeholder="örn. 450"
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="max_mukavemet">Max. Mukavemet (N/mm²)</Label>
                              <Input
                                id="max_mukavemet"
                                value={formValues.max_mukavemet}
                                onChange={e => handleFormChange('max_mukavemet', e.target.value)}
                                placeholder="örn. 600"
                              />
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="tolerans_plus">Tolerans + (mm)</Label>
                              <Input
                                id="tolerans_plus"
                                value={formValues.tolerans_plus}
                                onChange={e => handleFormChange('tolerans_plus', e.target.value)}
                                placeholder="örn. 0,05"
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="tolerans_minus">Tolerans - (mm)</Label>
                              <Input
                                id="tolerans_minus"
                                value={formValues.tolerans_minus}
                                onChange={e => handleFormChange('tolerans_minus', e.target.value)}
                                placeholder="örn. 0,05"
                              />
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="ic_cap">İç Çap (mm)</Label>
                              <Input
                                id="ic_cap"
                                value={formValues.ic_cap}
                                onChange={e => handleFormChange('ic_cap', e.target.value)}
                                placeholder="örn. 800"
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="dis_cap">Dış Çap (mm)</Label>
                              <Input
                                id="dis_cap"
                                value={formValues.dis_cap}
                                onChange={e => handleFormChange('dis_cap', e.target.value)}
                                placeholder="örn. 1200"
                              />
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="unwinding"
                                checked={formValues.unwinding}
                                onCheckedChange={checked => handleFormChange('unwinding', checked)}
                              />
                              <Label htmlFor="unwinding">Çözülme</Label>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="shrink"
                                checked={formValues.shrink}
                                onCheckedChange={checked => handleFormChange('shrink', checked)}
                              />
                              <Label htmlFor="shrink">Shrink</Label>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-between">
                        <Button
                          variant="outline"
                          onClick={clearForm}
                        >
                          Temizle
                        </Button>
                        
                        <Button
                          onClick={handleCalculateAll}
                          disabled={loading || !formValues.cap || !formValues.kod_2}
                        >
                          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Calculator className="h-4 w-4 mr-2" />}
                          Hesapla
                        </Button>
                      </CardFooter>
                    </Card>
                    
                    {/* MM GT Önizlemesi */}
                    {mmGtData && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">MM GT Önizleme</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <Label className="text-xs">Stok Kodu</Label>
                                <div className="font-mono text-sm">{mmGtData.stockCode}</div>
                              </div>
                              <div className="col-span-2">
                                <Label className="text-xs">Stok Adı</Label>
                                <div className="text-sm">{mmGtData.description}</div>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-4 gap-2">
                              <div>
                                <Label className="text-xs">Çap</Label>
                                <div className="text-sm">{mmGtData.cap.toFixed(2)}</div>
                              </div>
                              <div>
                                <Label className="text-xs">Kaplama</Label>
                                <div className="text-sm">{mmGtData.kaplama}</div>
                              </div>
                              <div>
                                <Label className="text-xs">Mukavemet</Label>
                                <div className="text-sm">{mmGtData.minMukavemet}-{mmGtData.maxMukavemet}</div>
                              </div>
                              <div>
                                <Label className="text-xs">Tolerans</Label>
                                <div className="text-sm">±{mmGtData.toleransPlus}</div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    
                    {/* YM GT Önizlemesi */}
                    {ymGtData && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">YM GT Önizleme</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <Label className="text-xs">Stok Kodu</Label>
                                <div className="font-mono text-sm">{ymGtData.stockCode}</div>
                              </div>
                              <div className="col-span-2">
                                <Label className="text-xs">Stok Adı</Label>
                                <div className="text-sm">{ymGtData.description}</div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                  
                  {/* Sağ Kolon - YM ST ve Aksiyonlar */}
                  <div className="space-y-4">
                    {/* YM ST Seçimi */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">YM ST Seçimi</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <Button
                            className="w-full"
                            onClick={handleAutoCalculateYmSt}
                            disabled={loading || !formValues.cap || !formValues.kod_2}
                          >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Calculator className="h-4 w-4 mr-2" />}
                            Otomatik Hesapla
                          </Button>
                          
                          <div className="border rounded-md p-2">
                            <h4 className="text-sm font-semibold mb-2">Seçili YM ST'ler</h4>
                            
                            {selectedYmSt.length > 0 ? (
                              <div className="space-y-2 max-h-40 overflow-y-auto">
                                {selectedYmSt.map((ymSt, index) => (
                                  <div key={ymSt.id || index} className="border rounded-md p-2">
                                    <YmStStatusIndicator ymSt={ymSt} />
                                    <div className="mt-1">
                                      <div className="font-mono text-xs">{ymSt.stockCode}</div>
                                      <div className="text-sm">{ymSt.description}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-sm text-gray-500 italic">Henüz YM ST seçilmedi</div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Reçete ve İşlem Butonları */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">İşlemler</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <Button
                            className="w-full bg-green-600 hover:bg-green-700"
                            onClick={handleSaveToDatabase}
                            disabled={loading || !mmGtData || !ymGtData || selectedYmSt.length === 0 || !receteData}
                          >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                            Veritabanına Kaydet
                          </Button>
                          
                          <Button
                            className="w-full bg-blue-600 hover:bg-blue-700"
                            onClick={createReceteExcel}
                            disabled={loading || !mmGtData || !ymGtData || selectedYmSt.length === 0 || !receteData}
                          >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                            Excel Oluştur
                          </Button>
                          
                          <Button
                            className="w-full"
                            onClick={handleSaveAndCreateExcel}
                            disabled={loading || !mmGtData || !ymGtData || selectedYmSt.length === 0 || !receteData}
                          >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <><Save className="h-4 w-4 mr-1" /><Download className="h-4 w-4 mr-1" /></>}
                            Kaydet ve Excel Oluştur
                          </Button>
                          
                          <Button
                            className="w-full bg-gray-600 hover:bg-gray-700"
                            onClick={handleCreateTalep}
                            disabled={loading || !mmGtData}
                          >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
                            Talep Oluştur
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Hata Mesajı */}
                    {error && (
                      <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md flex items-start">
                        <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 text-red-500" />
                        <div className="text-sm">{error}</div>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
              
              {/* Talepler Sekmesi */}
              <TabsContent value="talepler">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Galvanizli Tel Talepleri</CardTitle>
                    <div className="flex items-center space-x-2">
                      <Select
                        value={talepFilter.status}
                        onValueChange={value => handleTalepFilterChange('status', value)}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Durum Filtresi" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tüm Talepler</SelectItem>
                          <SelectItem value="pending">Bekleyen</SelectItem>
                          <SelectItem value="approved">Onaylanan</SelectItem>
                          <SelectItem value="rejected">Reddedilen</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Input
                        placeholder="Arama..."
                        value={talepFilter.search}
                        onChange={e => handleTalepFilterChange('search', e.target.value)}
                        className="max-w-sm"
                      />
                      
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={fetchTalepList}
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Yenile
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="flex items-center justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                      </div>
                    ) : filteredTalepItems.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Çap</TableHead>
                            <TableHead>Kod</TableHead>
                            <TableHead>Kaplama</TableHead>
                            <TableHead>Mukavemet</TableHead>
                            <TableHead>Durum</TableHead>
                            <TableHead>Tarih</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredTalepItems.map(talep => {
                            const talepData = talep.data || {};
                            
                            return (
                              <TableRow key={talep.id}>
                                <TableCell className="font-medium">{talepData.cap}</TableCell>
                                <TableCell>{talepData.kod_2}</TableCell>
                                <TableCell>{talepData.kaplama}</TableCell>
                                <TableCell>
                                  {talepData.min_mukavemet}-{talepData.max_mukavemet}
                                </TableCell>
                                <TableCell>
                                  <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                                    talep.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                    talep.status === 'approved' ? 'bg-green-100 text-green-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {talep.status === 'pending' ? 'Bekliyor' :
                                     talep.status === 'approved' ? 'Onaylandı' :
                                     'Reddedildi'}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {new Date(talep.created_at).toLocaleString('tr-TR', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit',
                                  })}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleViewTalepDetails(talep.id)}
                                  >
                                    Görüntüle
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        Görüntülenecek talep bulunamadı.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Arama Sekmesi */}
              <TabsContent value="search">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Galvanizli Tel Arama</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-end space-x-4">
                        <div className="space-y-2 flex-1">
                          <Label htmlFor="search-kod-2">Kod 2</Label>
                          <Select
                            value={searchParams.kod_2}
                            onValueChange={value => handleSearchParamChange('kod_2', value)}
                          >
                            <SelectTrigger id="search-kod-2">
                              <SelectValue placeholder="Kod 2 seçin" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">Tümü</SelectItem>
                              <SelectItem value="NIT">NIT</SelectItem>
                              <SelectItem value="ZN-P">ZN-P</SelectItem>
                              <SelectItem value="SY">SY</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2 flex-1">
                          <Label htmlFor="search-cap">Çap (mm)</Label>
                          <Input
                            id="search-cap"
                            value={searchParams.cap}
                            onChange={e => handleSearchParamChange('cap', e.target.value)}
                            placeholder="örn. 2,50"
                          />
                        </div>
                        
                        <Button
                          onClick={handleSearch}
                          disabled={loading}
                        >
                          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                          Ara
                        </Button>
                      </div>
                      
                      {showSearchResults && (
                        <div className="mt-4">
                          {searchResults.length > 0 ? (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Stok Kodu</TableHead>
                                  <TableHead>Açıklama</TableHead>
                                  <TableHead>Çap</TableHead>
                                  <TableHead>Kod</TableHead>
                                  <TableHead></TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {searchResults.map(item => (
                                  <TableRow key={item.id}>
                                    <TableCell className="font-mono">{item.stok_kodu}</TableCell>
                                    <TableCell>{item.aciklama}</TableCell>
                                    <TableCell>{item.cap}</TableCell>
                                    <TableCell>{item.kod_2}</TableCell>
                                    <TableCell>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEditItem(item)}
                                      >
                                        <Edit className="h-4 w-4 mr-1" />
                                        Düzenle
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          ) : (
                            <div className="text-center py-8 text-gray-500">
                              Arama kriterlerinize uygun sonuç bulunamadı.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
      
      {/* Talep Detayları Modalı */}
      <Dialog open={showTalepDetailModal} onOpenChange={setShowTalepDetailModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Talep Detayları</DialogTitle>
            <DialogDescription>
              {selectedTalep?.title || 'Talep bilgileri'}
            </DialogDescription>
          </DialogHeader>
          
          {selectedTalep && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-semibold">Durum</h4>
                  <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                    selectedTalep.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    selectedTalep.status === 'approved' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {selectedTalep.status === 'pending' ? 'Bekliyor' :
                     selectedTalep.status === 'approved' ? 'Onaylandı' :
                     'Reddedildi'}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-semibold">Oluşturulma Tarihi</h4>
                  <p>{new Date(selectedTalep.created_at).toLocaleString('tr-TR')}</p>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Talep Detayları</h4>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Çap:</span> {selectedTalep.data?.cap}
                  </div>
                  <div>
                    <span className="font-medium">Kod 2:</span> {selectedTalep.data?.kod_2}
                  </div>
                  <div>
                    <span className="font-medium">Kaplama:</span> {selectedTalep.data?.kaplama}
                  </div>
                  <div>
                    <span className="font-medium">Mukavemet:</span> {selectedTalep.data?.min_mukavemet}-{selectedTalep.data?.max_mukavemet}
                  </div>
                  <div>
                    <span className="font-medium">Tolerans:</span> +{selectedTalep.data?.tolerans_plus} / -{selectedTalep.data?.tolerans_minus}
                  </div>
                  <div>
                    <span className="font-medium">Ağırlık:</span> {selectedTalep.data?.kg} kg
                  </div>
                </div>
              </div>
              
              {selectedTalep.status === 'pending' && (
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={handleShowRejectModal}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Reddet
                  </Button>
                  
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={handleApproveTalep}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Onayla
                  </Button>
                </DialogFooter>
              )}
              
              {selectedTalep.status === 'rejected' && selectedTalep.rejection_reason && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md">
                  <h4 className="text-sm font-semibold mb-1">Reddetme Sebebi</h4>
                  <p className="text-sm">{selectedTalep.rejection_reason}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Reddetme Modalı */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Talebi Reddet</DialogTitle>
            <DialogDescription>
              Lütfen reddetme sebebini belirtin.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Reddetme Sebebi</Label>
              <textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                className="w-full border rounded-md p-2 h-32"
                placeholder="Reddetme sebebini buraya yazın..."
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRejectModal(false)}
            >
              İptal
            </Button>
            
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={handleRejectTalep}
              disabled={!rejectionReason}
            >
              <X className="h-4 w-4 mr-2" />
              Reddet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout3>
  );
};

export default GalvanizliTelManager;