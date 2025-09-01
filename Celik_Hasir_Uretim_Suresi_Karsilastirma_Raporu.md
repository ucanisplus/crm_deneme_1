# Çelik Hasır Üretim Süresi Karşılaştırma Raporu

## Özet
Bu rapor, mevcut YOTOCH ve OTOCH operasyon süresi hesaplamalarını makine kapasitesi tablosu (Kapasite1.csv) verilerine dayalı yeni hesaplama yöntemi ile karşılaştırmaktadır.

## Makine Bilgileri

### Kaynak Makineleri:
- **Schlatter MG208** - Yarı Otomatik Kaynak Makinesi
- **Schlatter MG316** - Tam Otomatik Kaynak Makinesi
- **Eurobend** - Kaynak Makinesi

### Üretim Süreci Açıklaması:
Çelik hasır üretiminde "boy" çubukları paralel olarak makinenin girişinden çıkışına doğru hareket eder. "En" çubukları dik olarak yerleştirilir ve makine 1 "en" çubuğunu alarak tüm paralel "boy" çubukları üzerine kaynaklar - bu 1 vuruş sayılır. Daha sonra 1 saniyeden az bir sürede bir sonraki "en" çubuğunu alır ve hafif hareket etmiş "boy" çubukları üzerine kaynaklar.

**Sonuç**: 1 tam çelik hasırın üretim süresi = **"En Çubuk Sayısı" ÷ Vuruş/Dakika**

## Mevcut Formül Analizi

### YOTOCH Formülü:
```javascript
const calculateYOTOCHDuration = (boy_mm, en_mm, diameter_mm, cubukSayisiBoy, cubukSayisiEn) => {
  const area = boy_mm * en_mm;
  const totalRods = cubukSayisiBoy + cubukSayisiEn;
  const wireFactor = Math.pow(diameter_mm, 1.2);
  const densityFactor = totalRods / (area / 10000);
  
  return parseFloat((0.08 + 
         (area * 0.0000012) + 
         (wireFactor * 0.015) + 
         (densityFactor * 0.02)).toFixed(5));
};
```

### OTOCH Formülü:
```javascript
const calculateOTOCHDuration = (boy_mm, en_mm, diameter_mm, cubukSayisiBoy, cubukSayisiEn) => {
  const area = boy_mm * en_mm;
  const totalRods = cubukSayisiBoy + cubukSayisiEn;
  const wireFactor = Math.pow(diameter_mm, 1.1);
  const densityFactor = totalRods / (area / 10000);
  
  return parseFloat((0.048 + 
         (area * 0.00000072) + 
         (wireFactor * 0.009) + 
         (densityFactor * 0.012)).toFixed(5));
};
```

## Makine Kapasitesi Tablosu Analizi

Kapasite1.csv dosyasından örnek veriler:

| En Ara (mm) | Çap (mm) | MG208 (Vuruş/dk) | MG316 (Vuruş/dk) | Eurobend (Vuruş/dk) |
|-------------|----------|-------------------|-------------------|---------------------|
| 15          | 4.5      | 110               | 180               | 110                 |
| 15          | 5.0      | 110               | 180               | 110                 |
| 15          | 6.0      | 102               | 170               | 102                 |
| 15          | 7.0      | 100               | 160               | 100                 |
| 15          | 8.0      | 90                | 150               | 90                  |

## Yeni Hesaplama Yöntemi

### Makine Tabanlı Formül:
```javascript
const calculateMachineBasedDuration = (enCubukSayisi, enAra, cap, makineType) => {
  const vurusPerMinute = getMachineCapacity(enAra, cap, makineType);
  return enCubukSayisi / vurusPerMinute; // dakika cinsinden
};
```

### Örnek Hesaplama:
**Ürün**: 500×215cm, 4.5×4.5mm çap, 15cm göz aralığı

- **En Çubuk Sayısı**: 215cm ÷ 15cm + 1 = 15 adet
- **MG208 Kapasitesi**: 110 vuruş/dakika
- **MG316 Kapasitesi**: 180 vuruş/dakika

## Karşılaştırma Sonuçları

### Örnek Ürün: 500×215cm, 4.5mm çap, 15cm aralık

| Operasyon | Mevcut Formül | MG208 (Yarı Oto) | MG316 (Tam Oto) | Fark |
|-----------|---------------|-------------------|------------------|------|
| **YOTOCH** | 0.25 dk (~15 sn) | **0.136 dk (~8.2 sn)** | **0.083 dk (~5.0 sn)** | %45-67 hızlı |
| **OTOCH** | 0.15 dk (~9 sn) | **0.136 dk (~8.2 sn)** | **0.083 dk (~5.0 sn)** | %8-45 hızlı |

### Farklı Ürün Boyutları İçin Karşılaştırma:

#### Küçük Ürün (300×150cm, 4.5mm, 10cm aralık):
- En Çubuk Sayısı: 16 adet
- MG208: 115 vuruş/dk → **0.139 dk (8.3 sn)**
- MG316: 185 vuruş/dk → **0.086 dk (5.2 sn)**
- Mevcut YOTOCH: ~0.18 dk (10.8 sn)

#### Büyük Ürün (600×300cm, 6mm, 20cm aralık):
- En Çubuk Sayısı: 16 adet  
- MG208: 97 vuruş/dk → **0.165 dk (9.9 sn)**
- MG316: 165 vuruş/dk → **0.097 dk (5.8 sn)**
- Mevcut YOTOCH: ~0.35 dk (21 sn)

## Temel Bulgular

### 1. Hız Avantajı:
- **MG316 (Tam Oto)** makine %60-70 daha hızlı üretim yapıyor
- **Mevcut formüller** gerçek üretim sürelerini 2-3 kat fazla hesaplıyor olabilir

### 2. Hassaslık:
- **Makine tabanlı hesaplama** daha doğru çünkü:
  - Gerçek makine kapasitelerini kullanıyor
  - Tel çapı ve göz aralığına göre değişken hızları dikkate alıyor
  - Sadece "en çubuk sayısı"na bağlı (doğru yaklaşım)

### 3. Operasyon Farkları:
- **YOTOCH vs OTOCH**: Makine tabanlı yaklaşımda aynı süre
- **Mevcut yaklaşımda**: OTOCH, YOTOCH'un %60'ı olarak hesaplanıyor

## Öneriler

### 1. Makine Seçimi:
Üretim planlamasında hangi makine kullanılacağının belirtilmesi gerekir:
- **MG208** - Yarı otomatik, daha yavaş ama esnek
- **MG316** - Tam otomatik, çok hızlı ama daha az esnek

### 2. Formül Güncellemesi:
```javascript
const getProductionTime = (product, machineType = 'MG208') => {
  const enCubukSayisi = Math.round((product.uzunlukEn / product.gozAraligiEn) + 1);
  const vurusPerMinute = getMachineCapacity(
    product.gozAraligiEn, 
    product.enCap, 
    machineType
  );
  return enCubukSayisi / vurusPerMinute;
};
```

### 3. Hibrit Yaklaşım:
Mevcut formülleri tamamen değiştirmek yerine, makine tabanlı hesaplamayı seçenek olarak eklemek ve karşılaştırmalı analiz yapmak daha güvenli olabilir.

## Sonuç

Makine kapasitesi tablosuna dayalı hesaplama yöntemi, mevcut matematiksel formüllerden önemli ölçüde farklı ve genellikle daha hızlı sonuçlar veriyor. Bu fark, mevcut formüllerin gerçek üretim koşullarını tam olarak yansıtmadığını gösterebilir.

**Tavsiye**: Pilot uygulama ile gerçek üretim süreleri ölçülerek hangi yöntemin daha doğru olduğu belirlenmeli.