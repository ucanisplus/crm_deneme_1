# Profil Hesaplama Entegrasyonu

Bu belge, PanelCitHesaplama bileşenine "Profil Hesaplama" sekmesinin nasıl entegre edileceğini açıklamaktadır.

## 1. Genel Bakış

Entegrasyon şu bileşenleri içerir:

1. `ProfilHesaplama.jsx` - Yeni profil hesaplama işlevselliğini içeren bağımsız bileşen
2. `GalvanizliSecimPopup.jsx` - "Hesapla" düğmelerine eklenecek galvanizli/galvanizsiz seçimi için açılır pencere
3. `PanelCitHesaplama.jsx` - Ana bileşene yapılacak değişiklikler

## 2. Entegrasyon Adımları

### 2.1. Yeni Bileşenleri Ekleyin

İlk olarak, oluşturulan yeni bileşenlerin `components/` dizinine eklendiğinden emin olun:
- `components/ProfilHesaplama.jsx`
- `components/GalvanizliSecimPopup.jsx`

### 2.2. PanelCitHesaplama.jsx'e Yapılacak Değişiklikler

1. İlk olarak, yeni bileşenlerimizi içe aktarın:

```jsx
import ProfilHesaplama from './ProfilHesaplama';
import GalvanizliSecimPopup from './GalvanizliSecimPopup';
```

2. Gerekli state değişkenlerini ekleyin:

```jsx
const [showGalvanizliPopup, setShowGalvanizliPopup] = useState(false);
const [popupAction, setPopupAction] = useState(null);
const [galvanizliSecimi, setGalvanizliSecimi] = useState(true);
```

3. Galvanizli seçimi için bir işlev ekleyin:

```jsx
// Galvanizli/Galvanizsiz seçimi için popup işlevi
const handleHesaplaClick = (action) => {
  setPopupAction(action);
  setShowGalvanizliPopup(true);
};

// Popup'tan gelen seçimi işleme
const handleGalvanizliSecim = (isGalvanizli) => {
  setGalvanizliSecimi(isGalvanizli);
  setShowGalvanizliPopup(false);
  
  // Seçime göre işlemi yap
  if (popupAction === 'main-panel') {
    calculateCosts(true); // Ana panel hesaplama
  } else if (popupAction === 'special-panel') {
    calculateCosts(false); // Özel panel hesaplama
  }
};
```

4. "Hesapla" düğmelerini güncelleyin:

Ana panel listesindeki Hesapla düğmesi:
```jsx
<button
  onClick={() => handleHesaplaClick('main-panel')}
  disabled={calculating || filteredPanelList.length === 0}
  className="flex items-center px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md shadow transition-colors"
>
  <Calculator className="mr-1 h-4 w-4" />
  Hesapla
</button>
```

Özel panel giriş ekranındaki Hesapla düğmesi:
```jsx
<button
  onClick={() => handleHesaplaClick('special-panel')}
  disabled={calculating || ozelPanelList.length === 0}
  className="flex items-center px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md shadow transition-colors"
>
  <Calculator className="mr-1 h-4 w-4" />
  Hesapla
</button>
```

5. calculateCosts fonksiyonunu güncelleyin (galvanizliSecimi parametresini ekleyin):

```jsx
const calculateCosts = async (isPanelList = true) => {
  setCalculating(true);
  setShowResults(false);
  setShowSalesView(false);
  setResultFilter({
    currency: 'all',
    unit: 'all',
    type: 'all'
  });

  try {
    // ... mevcut kodun başlangıcı

    // Performans iyileştirmesi: önce tüm hesaplamaları hafızada yap
    // galvanizliSecimi'ni hesaplamalara dahil et
    const results = performClientSideCalculations(panelsToCalculate, galvanizliSecimi);

    // ... mevcut kodun devamı
  }
  // ... mevcut kodun geri kalanı
};
```

6. performClientSideCalculations fonksiyonunu güncelleyin (galvanizliSecimi parametresini ekleyin):

```jsx
const performClientSideCalculations = (panelsToCalculate, isGalvanizli = true) => {
  // ... mevcut kodun başlangıcı
  
  // Galvanizli tel kullanımını seçime göre belirle
  const galvanizTelKg = isGalvanizli ? safeParseFloat(panelCitDegiskenler.galvanizli_tel_ton_usd) / 1000 : // Galvanizli fiyat
                                       safeParseFloat(profilDegiskenler.galvanizsiz_profil_kg_usd) / 1000; // Galvanizsiz fiyat
  
  // ... hesaplamalarda galvanizTelKg'yi kullan
  
  // ... mevcut kodun devamı
};
```

7. Sekme yapısını güncelleyin:

```jsx
<Tabs 
  defaultValue={activeTab}
  onValueChange={setActiveTab}
  className="w-full"
>
  <TabsList className="mb-4">
    <TabsTrigger value="main-panel">
      Ana Panel Listesi
    </TabsTrigger>
    <TabsTrigger value="special-panel">
      Özel Panel Girişi
    </TabsTrigger>
    {/* Yeni Profil Hesaplama Sekmesi */}
    <TabsTrigger value="profil-hesaplama">
      Profil Hesaplama
    </TabsTrigger>
    <TabsTrigger value="results">
      Hesap Sonuçları
    </TabsTrigger>
  </TabsList>
  
  {/* Ana Panel Listesi İçeriği */}
  <TabsContent value="main-panel">
    {/* Mevcut Ana Panel Listesi içeriği */}
  </TabsContent>
  
  {/* Özel Panel Girişi İçeriği */}
  <TabsContent value="special-panel">
    {/* Mevcut Özel Panel Girişi içeriği */}
  </TabsContent>
  
  {/* Yeni Profil Hesaplama Sekmesi İçeriği */}
  <TabsContent value="profil-hesaplama">
    <ProfilHesaplama 
      genelDegiskenler={genelDegiskenler} 
      profilDegiskenler={profilDegiskenler}
      fetchGenelDegiskenler={() => fetchSectionData('genel')}
      fetchProfilDegiskenler={() => fetchSectionData('profil')}
    />
  </TabsContent>
  
  {/* Hesap Sonuçları İçeriği */}
  <TabsContent value="results">
    {/* Mevcut Hesap Sonuçları içeriği */}
  </TabsContent>
</Tabs>
```

8. Açılır pencereyi bileşen JSX'ine ekleyin:

```jsx
{/* Galvanizli/Galvanizsiz Seçim Popup'ı */}
<GalvanizliSecimPopup
  isOpen={showGalvanizliPopup}
  onClose={() => setShowGalvanizliPopup(false)}
  onSelect={handleGalvanizliSecim}
  title="Tel Tipi Seçimi"
  description="Hesaplamada hangi tel tipi kullanılsın?"
/>
```

## 3. Test ve Doğrulama

Entegrasyonu tamamladıktan sonra, aşağıdaki adımları kullanarak test edin:

1. Uygulamayı başlatın: `npm run dev`
2. PanelCitHesaplama sayfasına gidin
3. Sekme çubuğunda "Profil Hesaplama" sekmesinin görünüp görünmediğini kontrol edin
4. Ana Panel Listesi ve Özel Panel Girişi sekmeleri içindeki "Hesapla" düğmelerini tıklandığında galvanizli/galvanizsiz seçim açılır penceresinin görünüp görünmediğini kontrol edin
5. Profil Hesaplama sekmesinde:
   - Yeni profil ekleyebildiğinizi kontrol edin
   - Profil özelliklerini düzenleyebildiğinizi kontrol edin
   - Hesapla düğmesinin çalışıp çalışmadığını kontrol edin
   - Excel'e aktarma düğmesinin çalışıp çalışmadığını kontrol edin

## 4. Bilinen Sorunlar ve Sınırlamalar

- Yeni baştan bir Tabs yapısı oluşturulduğu için, orijinal PanelCitHesaplama.jsx dosyasını düzenlerken mevcut sekme yapısını dikkatle incelemek ve değişiklikleri buna göre uyarlamak gerekebilir.
- Galvanizli/Galvanizsiz seçiminin mevcut formüllerde doğru şekilde kullanıldığından emin olmak için hesaplama mantığı dikkatlice incelenmelidir.

## 5. Daha Fazla Geliştirme

Gelecekteki geliştirmeler şunları içerebilir:

1. Profil Hesaplama sonuçlarının veritabanına kaydedilmesi
2. Önceden hesaplanmış profillerin yüklenmesi
3. Daha gelişmiş filtre ve sıralama seçenekleri
4. Toplu işlem yetenekleri (birden çok profilin tek seferde hesaplanması)