# Galvanizli Tel Netsis Kullanım Kılavuzu

Bu dokümanda, Galvanizli Tel Netsis modülünün kullanımı ve özellikleri hakkında detaylı bilgi bulabilirsiniz.

## İçindekiler

1. [Giriş](#giriş)
2. [Talep Seçimi](#talep-seçimi)
3. [MM GT ve YM GT Bilgileri](#mm-gt-ve-ym-gt-bilgileri)
4. [YM ST İşlemleri](#ym-st-işlemleri)
5. [Reçete Düzenleme](#reçete-düzenleme)
6. [Kaydetme İşlemleri](#kaydetme-işlemleri)
7. [Excel Çıktısı](#excel-çıktısı)

## Giriş

Galvanizli Tel Netsis modülü, mamül ve yarı mamül galvanizli tel ürünleri için reçete oluşturma, düzenleme ve Excel çıktısı alma işlemlerini gerçekleştirmenizi sağlar. Bu modül, MM GT (Mamül Galvanizli Tel), YM GT (Yarı Mamül Galvanizli Tel) ve YM ST (Yarı Mamül Siyah Tel) ürünleri arasındaki ilişkileri yönetir.

## Talep Seçimi

1. Ekranın sol üst kısmındaki "Talepler" bölümünden işlem yapmak istediğiniz talebi seçebilirsiniz.
2. Talep seçildiğinde, talep detayları otomatik olarak yüklenir.
3. Hata durumunda, ekranda hata mesajı görüntülenir.

## MM GT ve YM GT Bilgileri

1. Form alanlarını kullanarak MM GT ve YM GT ürün bilgilerini doldurabilirsiniz.
2. Tüm zorunlu alanları (stok kodları, tür, çap, ağırlık vb.) doldurduğunuzdan emin olun.
3. MM GT ve YM GT bilgileri 1:1 ilişkili olup, her MM GT için bir YM GT oluşturulur.

## YM ST İşlemleri

1. YM ST ürünlerini eklemek için "YM ST Ekle" butonunu kullanabilirsiniz.
2. Eklenen her YM ST için bir durum göstergesi görüntülenir:
   - **Veritabanından Alındı**: YM ST veritabanından çekilmiştir.
   - **Oluşturuldu**: YM ST form üzerinde oluşturulmuştur.
   - **Reçetesi Var**: YM ST için reçete oluşturulmuştur.
3. Her YM ST için ayrı bir MM GT kodu oluşturulur ve bu kodlar sıralı numaralar alır.

## Reçete Düzenleme

1. YM ST'yi seçip "Reçete Düzenle" butonuna tıklayarak reçete ekranına geçebilirsiniz.
2. Reçete düzenleme ekranında şu işlemleri yapabilirsiniz:
   - **Otomatik Hesapla**: Seçili YM ST için reçete otomatik olarak hesaplanır.
   - **Tüm Reçeteleri Otomatik Hesapla**: Tüm YM ST'ler için reçeteleri otomatik hesaplar.
   - **Manuel Düzenleme**: Fire oranı, miktar, ölçü birimi ve açıklama gibi reçete detaylarını manuel olarak düzenleyebilirsiniz.
3. Reçete düzenleme işleminizi tamamladığınızda "Geri" butonuna tıklayarak ana ekrana dönebilirsiniz.

## Kaydetme İşlemleri

1. **Veritabanına Kaydet**: Oluşturduğunuz MM GT, YM GT, YM ST ve reçete bilgilerini veritabanına kaydeder.
   - Her YM ST için yeni bir MM GT oluşturulur ve sıralı kodlar atanır.
   - Kayıt başarılı olduğunda bildirim görüntülenir.

2. **Kaydet ve Excel Oluştur**: Veritabanına kayıt işlemini gerçekleştirir ve Excel çıktısı oluşturur.
   - İşlem başarılı olduğunda Excel dosyası indirilir.

## Excel Çıktısı

Excel çıktısı, Netsis'e aktarım için uygun formatta oluşturulur ve şunları içerir:

1. **MM GT Reçetesi**: Tam olarak 8 satırdan oluşur.
   - Birinci satır YM GT bilgilerini içerir.
   - Diğer satırlar ilave bileşenleri içerir.

2. **YM GT Reçetesi**: Tam olarak 4 satırdan oluşur.
   - SM.DESİ.PAK ve GTPKT01 satırları hariç tutulur.
   - Satırlar YM GT'nin üretiminde kullanılan bileşenleri içerir.

3. **YM ST Reçetesi**: Her YM ST için tam olarak 2 satırdan oluşur.
   - Satırlar YM ST'nin üretiminde kullanılan bileşenleri içerir.

## Önemli Notlar

- İşlem yapmadan önce tüm form alanlarını doğru şekilde doldurduğunuzdan emin olun.
- Otomatik hesaplama işlemi fire oranı 3 ve miktar 1.03 değerlerini kullanır.
- Excel çıktısındaki satır sayıları ve formatı, Netsis gereksinimleriyle uyumludur.
- Her YM ST için ayrı bir MM GT oluşturulduğundan, birden fazla YM ST eklediğinizde birden fazla MM GT kodu oluşturulacaktır.