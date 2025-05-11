// Updated createReceteExcel function with proper row counts
// Replace the existing createReceteExcel function with this implementation

const createReceteExcel = async (mmGt, ymGt, ymStList) => {
  // Excel workbook oluştur
  const workbook = new ExcelJS.Workbook();

  // ============== MM GT REÇETE SAYFASI (9 SATIR) ==============
  const mmGtReceteSheet = workbook.addWorksheet('MM GT REÇETE');

  // MM GT REÇETE başlıkları
  mmGtReceteSheet.columns = [
    { header: 'Mamul Kodu', key: 'mamul_kodu', width: 22 },
    { header: 'Reçete Top.', key: 'recete_top', width: 12 },
    { header: 'Fire Oranı (%)', key: 'fire_orani', width: 12 },
    { header: 'Oto.Reç.', key: 'oto_rec', width: 10 },
    { header: 'Ölçü Br.', key: 'olcu_br', width: 10 },
    { header: 'Sıra No', key: 'sira_no', width: 10 },
    { header: 'Operasyon Bileşen', key: 'operasyon_bilesen', width: 18 },
    { header: 'Bileşen Kodu', key: 'bilesen_kodu', width: 18 },
    { header: 'Ölçü Br. - Bileşen', key: 'olcu_br_bilesen', width: 18 },
    { header: 'Miktar', key: 'miktar', width: 10 },
    { header: 'Açıklama', key: 'aciklama', width: 35 },
    { header: 'Miktar Sabitle', key: 'miktar_sabitle', width: 15 },
    { header: 'Stok/Maliyet', key: 'stok_maliyet', width: 15 },
    { header: 'Fire Mik.', key: 'fire_mik', width: 10 },
    { header: 'Sabit Fire Mik.', key: 'sabit_fire_mik', width: 15 },
    { header: 'İstasyon Kodu', key: 'istasyon_kodu', width: 15 },
    { header: 'Hazırlık Süresi', key: 'hazirlik_suresi', width: 15 },
    { header: 'Üretim Süresi', key: 'uretim_suresi', width: 15 },
    { header: 'Ü.A.Dahil Edilsin', key: 'ua_dahil_edilsin', width: 18 },
    { header: 'Son Operasyon', key: 'son_operasyon', width: 15 },
    { header: 'Öncelik', key: 'oncelik', width: 10 },
    { header: 'Planlama Oranı', key: 'planlama_orani', width: 15 },
    { header: 'Alternatif Politika - D.A.Transfer Fişi', key: 'alt_pol_da_transfer', width: 30 },
    { header: 'Alternatif Politika - Ambar Ç. Fişi', key: 'alt_pol_ambar_cikis', width: 30 },
    { header: 'Alternatif Politika - Üretim S.Kaydı', key: 'alt_pol_uretim_kaydi', width: 30 },
    { header: 'Alternatif Politika - MRP', key: 'alt_pol_mrp', width: 22 },
    { header: 'İÇ/DIŞ', key: 'ic_dis', width: 10 }
  ];

  try {
    // Veritabanından MM GT reçete verilerini almayı dene
    const mmGtReceteRes = await fetchWithAuth(`${API_URLS.galMmGtRecete}?mm_gt_id=${mmGt.id}`);
    let mmGtReceteData = [];
    
    if (mmGtReceteRes && mmGtReceteRes.ok) {
      const data = await mmGtReceteRes.json();
      if (Array.isArray(data) && data.length > 0) {
        mmGtReceteData = data;
      }
    }
    
    // Eğer veritabanından veri alınamadıysa veya yeterli değilse, reçeteyi oluştur
    const mmGtStokKodu = mmGt.stok_kodu || `MM.GT.${formValues.kod_2}.${parseFloat(formValues.cap).toFixed(2).replace('.', '').padStart(4, '0')}.00`;
    
    if (mmGtReceteData.length >= 9) {
      // Veritabanından yeterli satır varsa direkt olarak ekle
      mmGtReceteData.forEach(item => {
        mmGtReceteSheet.addRow({
          mamul_kodu: item.mamul_kodu,
          recete_top: item.recete_top,
          fire_orani: item.fire_orani,
          oto_rec: item.oto_rec || "",
          olcu_br: item.olcu_br,
          sira_no: item.sira_no,
          operasyon_bilesen: item.operasyon_bilesen,
          bilesen_kodu: item.bilesen_kodu,
          olcu_br_bilesen: item.olcu_br_bilesen,
          miktar: item.miktar,
          aciklama: item.aciklama || "",
          miktar_sabitle: item.miktar_sabitle || "",
          stok_maliyet: item.stok_maliyet || "",
          fire_mik: item.fire_mik || "",
          sabit_fire_mik: item.sabit_fire_mik || "",
          istasyon_kodu: item.istasyon_kodu || "",
          hazirlik_suresi: item.hazirlik_suresi || "",
          uretim_suresi: item.uretim_suresi || "",
          ua_dahil_edilsin: item.ua_dahil_edilsin || "evet",
          son_operasyon: item.son_operasyon || "evet",
          oncelik: item.oncelik || "",
          planlama_orani: item.planlama_orani || "",
          alt_pol_da_transfer: item.alt_pol_da_transfer || "",
          alt_pol_ambar_cikis: item.alt_pol_ambar_cikis || "",
          alt_pol_uretim_kaydi: item.alt_pol_uretim_kaydi || "",
          alt_pol_mrp: item.alt_pol_mrp || "",
          ic_dis: item.ic_dis || ""
        });
      });
    } else {
      // 9 satırlı MM GT reçetesi oluştur
      
      // 1. Satır - Yarı Mamul - YM GT
      mmGtReceteSheet.addRow({
        mamul_kodu: mmGtStokKodu,
        recete_top: 'Evet',
        fire_orani: 0,
        oto_rec: '',
        olcu_br: 'KG',
        sira_no: 10,
        operasyon_bilesen: 'Yarı Mamul',
        bilesen_kodu: ymGt.stok_kodu,
        olcu_br_bilesen: 'KG',
        miktar: 1,
        aciklama: 'Galvanizli Tel Üretimi',
        miktar_sabitle: '',
        stok_maliyet: '',
        fire_mik: '',
        sabit_fire_mik: '',
        istasyon_kodu: '',
        hazirlik_suresi: '',
        uretim_suresi: '',
        ua_dahil_edilsin: 'Evet',
        son_operasyon: 'Hayır',
        oncelik: '',
        planlama_orani: '',
        alt_pol_da_transfer: '',
        alt_pol_ambar_cikis: '',
        alt_pol_uretim_kaydi: '',
        alt_pol_mrp: '',
        ic_dis: ''
      });
      
      // 2. Satır - AMB.PALET
      mmGtReceteSheet.addRow({
        mamul_kodu: mmGtStokKodu,
        recete_top: 'Hayır',
        fire_orani: 0,
        oto_rec: '',
        olcu_br: 'KG',
        sira_no: 20,
        operasyon_bilesen: 'Hammadde',
        bilesen_kodu: 'AMB.PALET',
        olcu_br_bilesen: 'AD',
        miktar: 0.0013,
        aciklama: 'Palet',
        ua_dahil_edilsin: 'Evet',
        son_operasyon: 'Hayır'
      });
      
      // 3. Satır - AMB.TAKOZ.100x100
      mmGtReceteSheet.addRow({
        mamul_kodu: mmGtStokKodu,
        recete_top: 'Hayır',
        fire_orani: 0,
        oto_rec: '',
        olcu_br: 'KG',
        sira_no: 30,
        operasyon_bilesen: 'Hammadde',
        bilesen_kodu: 'AMB.TAKOZ.100x100',
        olcu_br_bilesen: 'AD',
        miktar: 0.01,
        aciklama: 'Ahşap Takoz',
        ua_dahil_edilsin: 'Evet',
        son_operasyon: 'Hayır'
      });
      
      // 4. Satır - AMB.KAP.BANDI
      mmGtReceteSheet.addRow({
        mamul_kodu: mmGtStokKodu,
        recete_top: 'Hayır',
        fire_orani: 0,
        oto_rec: '',
        olcu_br: 'KG',
        sira_no: 40,
        operasyon_bilesen: 'Hammadde',
        bilesen_kodu: 'AMB.KAP.BANDI',
        olcu_br_bilesen: 'AD',
        miktar: 1,
        aciklama: 'Kağıt Bant',
        ua_dahil_edilsin: 'Evet',
        son_operasyon: 'Hayır'
      });
      
      // 5. Satır - AMB.TAHTA.195x195x18
      mmGtReceteSheet.addRow({
        mamul_kodu: mmGtStokKodu,
        recete_top: 'Hayır',
        fire_orani: 0,
        oto_rec: '',
        olcu_br: 'KG',
        sira_no: 50,
        operasyon_bilesen: 'Hammadde',
        bilesen_kodu: 'AMB.TAHTA.195x195x18',
        olcu_br_bilesen: 'AD',
        miktar: 0.001,
        aciklama: 'Tahta Kapak',
        ua_dahil_edilsin: 'Evet',
        son_operasyon: 'Hayır'
      });
      
      // 6. Satır - AMB.STRECFILM
      mmGtReceteSheet.addRow({
        mamul_kodu: mmGtStokKodu,
        recete_top: 'Hayır',
        fire_orani: 0,
        oto_rec: '',
        olcu_br: 'KG',
        sira_no: 60,
        operasyon_bilesen: 'Hammadde',
        bilesen_kodu: 'AMB.STRECFILM',
        olcu_br_bilesen: 'AD',
        miktar: 0.13,
        aciklama: 'Streç Film',
        ua_dahil_edilsin: 'Evet',
        son_operasyon: 'Hayır'
      });
      
      // 7. Satır - AMB.ÇEMBER
      mmGtReceteSheet.addRow({
        mamul_kodu: mmGtStokKodu,
        recete_top: 'Hayır',
        fire_orani: 0,
        oto_rec: '',
        olcu_br: 'KG',
        sira_no: 70,
        operasyon_bilesen: 'Hammadde',
        bilesen_kodu: 'AMB.ÇEMBER',
        olcu_br_bilesen: 'KG',
        miktar: 0.1,
        aciklama: 'PP Çember',
        ua_dahil_edilsin: 'Evet',
        son_operasyon: 'Hayır'
      });
      
      // 8. Satır - AMB.TOKA
      mmGtReceteSheet.addRow({
        mamul_kodu: mmGtStokKodu,
        recete_top: 'Hayır',
        fire_orani: 0,
        oto_rec: '',
        olcu_br: 'KG',
        sira_no: 80,
        operasyon_bilesen: 'Hammadde',
        bilesen_kodu: 'AMB.TOKA',
        olcu_br_bilesen: 'AD',
        miktar: 4,
        aciklama: 'PP Çember Tokası',
        ua_dahil_edilsin: 'Evet',
        son_operasyon: 'Hayır'
      });
      
      // 9. Satır - AMB.SHRINK
      mmGtReceteSheet.addRow({
        mamul_kodu: mmGtStokKodu,
        recete_top: 'Hayır',
        fire_orani: 0,
        oto_rec: '',
        olcu_br: 'KG',
        sira_no: 90,
        operasyon_bilesen: 'Hammadde',
        bilesen_kodu: mmGt.amb_shrink || 'AMB.SHRİNK.200*160CM',
        olcu_br_bilesen: 'AD',
        miktar: 1,
        aciklama: 'Shrink Naylon',
        ua_dahil_edilsin: 'Evet',
        son_operasyon: 'Evet'
      });
    }
  } catch (error) {
    console.warn('MM GT Reçete Excel oluşturma hatası:', error);
    // Hata durumunda minimum bir satır ekle
    const mmGtStokKodu = mmGt.stok_kodu || `MM.GT.${formValues.kod_2}.${parseFloat(formValues.cap).toFixed(2).replace('.', '').padStart(4, '0')}.00`;
    mmGtReceteSheet.addRow({
      mamul_kodu: mmGtStokKodu,
      recete_top: 'Evet',
      fire_orani: 0,
      olcu_br: 'KG',
      sira_no: 10,
      operasyon_bilesen: 'Yarı Mamul',
      bilesen_kodu: ymGt.stok_kodu,
      olcu_br_bilesen: 'KG',
      miktar: 1,
      aciklama: 'Galvanizli Tel Üretimi',
      ua_dahil_edilsin: 'Evet',
      son_operasyon: 'Evet'
    });
  }

  // ============== YM GT REÇETE SAYFASI (4 SATIR) ==============
  const ymGtReceteSheet = workbook.addWorksheet('YM GT REÇETE');

  // YM GT REÇETE başlıkları - aynı başlıkları kullan
  ymGtReceteSheet.columns = [...mmGtReceteSheet.columns];

  try {
    // Veritabanından YM GT reçete verilerini almayı dene
    const ymGtReceteRes = await fetchWithAuth(`${API_URLS.galYmGtRecete}?ym_gt_id=${ymGt.id}`);
    let ymGtReceteData = [];
    
    if (ymGtReceteRes && ymGtReceteRes.ok) {
      const data = await ymGtReceteRes.json();
      if (Array.isArray(data) && data.length > 0) {
        // SM.DESİ.PAK ve GTPKT01 satırlarını hariç tut
        ymGtReceteData = data.filter(item => 
          item.bilesen_kodu !== 'SM.DESİ.PAK' && 
          item.bilesen_kodu !== 'GTPKT01'
        );
      }
    }
    
    // YM GT Stok Kodu
    const ymGtStokKodu = ymGt.stok_kodu || `YM.GT.${formValues.kod_2}.${parseFloat(formValues.cap).toFixed(2).replace('.', '').padStart(4, '0')}.00`;
    
    if (ymGtReceteData.length >= 4) {
      // Veritabanından yeterli satır varsa (SM.DESİ.PAK ve GTPKT01 hariç) direkt olarak ekle
      ymGtReceteData.forEach(item => {
        ymGtReceteSheet.addRow({
          mamul_kodu: item.mamul_kodu,
          recete_top: item.recete_top,
          fire_orani: item.fire_orani || 0,
          oto_rec: item.oto_rec || "",
          olcu_br: item.olcu_br,
          sira_no: item.sira_no,
          operasyon_bilesen: item.operasyon_bilesen,
          bilesen_kodu: item.bilesen_kodu,
          olcu_br_bilesen: item.olcu_br_bilesen,
          miktar: item.miktar,
          aciklama: item.aciklama || "",
          miktar_sabitle: item.miktar_sabitle || "",
          stok_maliyet: item.stok_maliyet || "",
          fire_mik: item.fire_mik || "",
          sabit_fire_mik: item.sabit_fire_mik || "",
          istasyon_kodu: item.istasyon_kodu || "",
          hazirlik_suresi: item.hazirlik_suresi || "",
          uretim_suresi: item.uretim_suresi || "",
          ua_dahil_edilsin: item.ua_dahil_edilsin || "evet",
          son_operasyon: item.son_operasyon || "evet",
          oncelik: item.oncelik || "",
          planlama_orani: item.planlama_orani || "",
          alt_pol_da_transfer: item.alt_pol_da_transfer || "",
          alt_pol_ambar_cikis: item.alt_pol_ambar_cikis || "",
          alt_pol_uretim_kaydi: item.alt_pol_uretim_kaydi || "",
          alt_pol_mrp: item.alt_pol_mrp || "",
          ic_dis: item.ic_dis || ""
        });
      });
    } else {
      // 4 satırlı YM GT reçetesi oluştur - SM.DESİ.PAK ve GTPKT01 OLMADAN
      
      // 1. Satır - YM ST (Siyah Tel)
      ymGtReceteSheet.addRow({
        mamul_kodu: ymGtStokKodu,
        recete_top: 'Evet',
        fire_orani: 2,
        oto_rec: '',
        olcu_br: 'KG',
        sira_no: 10,
        operasyon_bilesen: 'Hammadde',
        bilesen_kodu: ymStList && ymStList.length > 0 ? ymStList[0].stok_kodu : 'YM.ST.TEMP',
        olcu_br_bilesen: 'KG',
        miktar: 1.02,
        aciklama: 'Siyah Tel',
        miktar_sabitle: '',
        stok_maliyet: '',
        fire_mik: '',
        sabit_fire_mik: '',
        istasyon_kodu: '',
        hazirlik_suresi: '',
        uretim_suresi: '',
        ua_dahil_edilsin: 'Evet',
        son_operasyon: 'Hayır',
        oncelik: '',
        planlama_orani: '',
        alt_pol_da_transfer: '',
        alt_pol_ambar_cikis: '',
        alt_pol_uretim_kaydi: '',
        alt_pol_mrp: '',
        ic_dis: ''
      });
      
      // 2. Satır - Çinko
      ymGtReceteSheet.addRow({
        mamul_kodu: ymGtStokKodu,
        recete_top: 'Hayır',
        fire_orani: 0,
        oto_rec: '',
        olcu_br: 'KG',
        sira_no: 20,
        operasyon_bilesen: 'Hammadde',
        bilesen_kodu: 'HM.CINKO.99970',
        olcu_br_bilesen: 'KG',
        miktar: parseFloat(formValues.kaplama || 60) * 0.01,
        aciklama: 'Çinko',
        ua_dahil_edilsin: 'Evet',
        son_operasyon: 'Hayır'
      });
      
      // 3. Satır - NH4Cl (Nışadır)
      ymGtReceteSheet.addRow({
        mamul_kodu: ymGtStokKodu,
        recete_top: 'Hayır',
        fire_orani: 0,
        oto_rec: '',
        olcu_br: 'KG',
        sira_no: 30,
        operasyon_bilesen: 'Hammadde',
        bilesen_kodu: 'HM.NH4CL',
        olcu_br_bilesen: 'KG',
        miktar: 0.025,
        aciklama: 'Nışadır',
        ua_dahil_edilsin: 'Evet',
        son_operasyon: 'Hayır'
      });
      
      // 4. Satır - WAX (Parafin)
      ymGtReceteSheet.addRow({
        mamul_kodu: ymGtStokKodu,
        recete_top: 'Hayır',
        fire_orani: 0,
        oto_rec: '',
        olcu_br: 'KG',
        sira_no: 40,
        operasyon_bilesen: 'Hammadde',
        bilesen_kodu: 'HM.WAX',
        olcu_br_bilesen: 'KG',
        miktar: 0.001,
        aciklama: 'Parafin',
        ua_dahil_edilsin: 'Evet',
        son_operasyon: 'Evet'
      });
    }
  } catch (error) {
    console.warn('YM GT Reçete Excel oluşturma hatası:', error);
    
    // Hata durumunda minimum bir satır ekle
    const ymGtStokKodu = ymGt.stok_kodu || `YM.GT.${formValues.kod_2}.${parseFloat(formValues.cap).toFixed(2).replace('.', '').padStart(4, '0')}.00`;
    ymGtReceteSheet.addRow({
      mamul_kodu: ymGtStokKodu,
      recete_top: 'Evet',
      fire_orani: 2,
      olcu_br: 'KG',
      sira_no: 10,
      operasyon_bilesen: 'Hammadde',
      bilesen_kodu: ymStList && ymStList.length > 0 ? ymStList[0].stok_kodu : 'YM.ST.TEMP',
      olcu_br_bilesen: 'KG',
      miktar: 1.02,
      aciklama: 'Siyah Tel',
      ua_dahil_edilsin: 'Evet',
      son_operasyon: 'Evet'
    });
  }

  // ============== YM ST REÇETE SAYFASI (2 SATIR) ==============
  const ymStReceteSheet = workbook.addWorksheet('YM ST REÇETE');

  // YM ST REÇETE başlıkları - aynı başlıkları kullan
  ymStReceteSheet.columns = [...mmGtReceteSheet.columns];

  // Her YM ST için ayrı reçete satırları
  for (const ymSt of ymStList) {
    try {
      let ymStReceteData = [];
      
      // Veritabanına kaydedilmiş YM ST'ler için reçete verilerini al
      if (ymSt.id) {
        const ymStReceteRes = await fetchWithAuth(`${API_URLS.galYmStRecete}?ym_st_id=${ymSt.id}`);
        if (ymStReceteRes && ymStReceteRes.ok) {
          const data = await ymStReceteRes.json();
          if (Array.isArray(data) && data.length > 0) {
            ymStReceteData = data;
          }
        }
      }
      
      // YM ST stok kodu
      const ymStStokKodu = ymSt.stok_kodu || `YM.ST.${parseFloat(ymSt.cap).toFixed(2).replace('.', '').padStart(4, '0')}.${ymSt.filmasin || '0600'}.${ymSt.quality || '1006'}`;
      
      if (ymStReceteData.length >= 2) {
        // Veritabanından yeterli satır varsa direkt olarak ekle
        ymStReceteData.forEach(item => {
          ymStReceteSheet.addRow({
            mamul_kodu: item.mamul_kodu,
            recete_top: item.recete_top,
            fire_orani: item.fire_orani || 0,
            oto_rec: item.oto_rec || "",
            olcu_br: item.olcu_br,
            sira_no: item.sira_no,
            operasyon_bilesen: item.operasyon_bilesen,
            bilesen_kodu: item.bilesen_kodu,
            olcu_br_bilesen: item.olcu_br_bilesen,
            miktar: item.miktar,
            aciklama: item.aciklama || "",
            miktar_sabitle: item.miktar_sabitle || "",
            stok_maliyet: item.stok_maliyet || "",
            fire_mik: item.fire_mik || "",
            sabit_fire_mik: item.sabit_fire_mik || "",
            istasyon_kodu: item.istasyon_kodu || "",
            hazirlik_suresi: item.hazirlik_suresi || "",
            uretim_suresi: item.uretim_suresi || "",
            ua_dahil_edilsin: item.ua_dahil_edilsin || "",
            son_operasyon: item.son_operasyon || "",
            oncelik: item.oncelik || "",
            planlama_orani: item.planlama_orani || "",
            alt_pol_da_transfer: item.alt_pol_da_transfer || "",
            alt_pol_ambar_cikis: item.alt_pol_ambar_cikis || "",
            alt_pol_uretim_kaydi: item.alt_pol_uretim_kaydi || "",
            alt_pol_mrp: item.alt_pol_mrp || "",
            ic_dis: item.ic_dis || ""
          });
        });
      } else {
        // 2 satırlı YM ST reçetesi oluştur
        
        // 1. Satır - Filmaşin
        ymStReceteSheet.addRow({
          mamul_kodu: ymStStokKodu,
          recete_top: 'Evet',
          fire_orani: 3,
          oto_rec: '',
          olcu_br: 'KG',
          sira_no: 10,
          operasyon_bilesen: 'Hammadde',
          bilesen_kodu: `HM.FILMASIN.${ymSt.filmasin || '0600'}.${ymSt.quality || '1006'}`,
          olcu_br_bilesen: 'KG',
          miktar: 1.03,
          aciklama: 'Filmaşin',
          miktar_sabitle: '',
          stok_maliyet: '',
          fire_mik: '',
          sabit_fire_mik: '',
          istasyon_kodu: '',
          hazirlik_suresi: '',
          uretim_suresi: '',
          ua_dahil_edilsin: 'Evet',
          son_operasyon: 'Hayır',
          oncelik: '',
          planlama_orani: '',
          alt_pol_da_transfer: '',
          alt_pol_ambar_cikis: '',
          alt_pol_uretim_kaydi: '',
          alt_pol_mrp: '',
          ic_dis: ''
        });
        
        // 2. Satır - H2SO4 (Sülfürik Asit)
        ymStReceteSheet.addRow({
          mamul_kodu: ymStStokKodu,
          recete_top: 'Hayır',
          fire_orani: 0,
          oto_rec: '',
          olcu_br: 'KG',
          sira_no: 20,
          operasyon_bilesen: 'Hammadde',
          bilesen_kodu: 'HM.H2SO4',
          olcu_br_bilesen: 'KG',
          miktar: 0.01,
          aciklama: 'Sülfürik Asit',
          ua_dahil_edilsin: 'Evet',
          son_operasyon: 'Evet'
        });
      }
    } catch (error) {
      console.warn(`YM ST Reçete Excel oluşturma hatası (${ymSt.stok_kodu}):`, error);
      
      // Hata durumunda minimum bir satır ekle
      const ymStStokKodu = ymSt.stok_kodu || `YM.ST.${parseFloat(ymSt.cap).toFixed(2).replace('.', '').padStart(4, '0')}.${ymSt.filmasin || '0600'}.${ymSt.quality || '1006'}`;
      ymStReceteSheet.addRow({
        mamul_kodu: ymStStokKodu,
        recete_top: 'Evet',
        fire_orani: 3,
        olcu_br: 'KG',
        sira_no: 10,
        operasyon_bilesen: 'Hammadde',
        bilesen_kodu: `HM.FILMASIN.${ymSt.filmasin || '0600'}.${ymSt.quality || '1006'}`,
        olcu_br_bilesen: 'KG',
        miktar: 1.03,
        aciklama: 'Filmaşin',
        ua_dahil_edilsin: 'Evet',
        son_operasyon: 'Evet'
      });
    }
  }
  
  // Stil ayarları
  [mmGtReceteSheet, ymGtReceteSheet, ymStReceteSheet].forEach(sheet => {
    // Başlık satırı stilleri
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, size: 11 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFCCCCCC' }
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // Kenarlık ekle
    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };

        if (rowNumber > 1) {
          cell.alignment = { vertical: 'middle' };
        }
      });
    });
  });

  // Excel dosyasını kaydet
  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `Recete_${mmGt.stok_kodu ? mmGt.stok_kodu.replace(/\./g, '_') : 'new_recipe'}.xlsx`);

  return true;
};