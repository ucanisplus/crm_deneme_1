# Brevo (Sendinblue) E-posta Entegrasyonu Kurulum Kılavuzu

Bu dokümantasyon, TLC Metal CRM sisteminde e-posta bildirimleri göndermek için Brevo (eski adıyla Sendinblue) entegrasyonunun nasıl kurulacağını açıklar.

## 1. Brevo Hesabı Oluşturma

1. [Brevo'nun web sitesini](https://www.brevo.com/) ziyaret edin ve yeni bir hesap oluşturun.
2. Hesabınızı doğrulayın ve gerekli tüm ayarları tamamlayın.
3. Ücretsiz plan günlük 300 e-posta gönderimi ile başlar.

## 2. API Anahtarı Oluşturma

1. Brevo kontrol panelinde, sağ üst köşedeki profil simgesine tıklayın ve "SMTP & API" seçeneğini seçin.
2. "API Keys" sekmesini seçin.
3. "Create a New API Key" butonuna tıklayın.
4. API anahtarı için bir isim verin (örn. "TLC Metal CRM").
5. API anahtarınızı oluşturun ve güvenli bir şekilde kaydedin. Bu anahtar yalnızca bir kez gösterilecektir.

## 3. Gönderici E-posta Adresinin Doğrulanması

1. Brevo kontrol panelinde, sol menüde "Senders & IPs" seçeneğine gidin.
2. "Add a New Sender" butonuna tıklayın.
3. Gönderici bilgilerinizi doldurun:
   - From Email Address: `satis@tlcmetal.com.tr` (veya kullanmak istediğiniz adres)
   - From Name: "TLC Metal Satış"
   - Company: "TLC Metal"
   - Address, City, Country: Şirket adres bilgileri
4. "Save" butonuna tıklayın.
5. Doğrulama e-postasını kontrol edin ve e-postadaki bağlantıya tıklayarak adresi doğrulayın.

## 4. .env Dosyasında API Anahtarını Ayarlama

1. Proje kök dizinindeki `.env` dosyasına (yoksa oluşturun) aşağıdaki satırı ekleyin:

```
BREVO_API_KEY=xkeysib-your-brevo-api-key-here
```

2. `.env` dosyasının .gitignore'da olduğundan emin olun (hassas bilgiler GitHub'a gönderilmemelidir).

## 5. Entegrasyonu Test Etme

Brevo entegrasyonunuzu test etmek için, aşağıdaki komutla test scriptini çalıştırabilirsiniz:

```bash
node scripts/test-email.js alici@ornek.com
```

Bu komut, belirttiğiniz e-posta adresine test amaçlı bir e-posta gönderecektir.

## 6. Sorun Giderme

E-posta gönderiminde sorun yaşarsanız, aşağıdaki kontrolleri yapın:

1. API anahtarının doğru olduğundan emin olun
2. Gönderici e-posta adresinin doğrulanmış olduğunu kontrol edin
3. Brevo kontrol panelindeki "Email Logs" bölümünde gönderim durumunu ve hata mesajlarını inceleyin
4. Spam filtreleri nedeniyle e-postalar engellenebilir, spam klasörünü kontrol edin
5. Brevo ücretsiz planında günlük 300 e-posta sınırı vardır, kota aşımı durumunu kontrol edin

## 7. E-posta Şablonları

Sistem, aşağıdaki e-posta bildirim türlerini desteklemektedir:

1. **Yeni Talep Bildirimi**: Yeni bir galvanizli tel talebi oluşturulduğunda üretim ekibine gönderilir.
2. **Talep Onay Bildirimi**: Talep onaylandığında talep sahibine gönderilir.
3. **Talep Red Bildirimi**: Talep reddedildiğinde talep sahibine gönderilir.
4. **Genel Bildirimler**: Diğer bildirimlerin gönderilmesi için kullanılabilir.

Şablonlar, HTML formatında tanımlanmıştır ve `email-helpers.js` dosyasında bulunabilir. Özelleştirmek isterseniz, bu dosyayı düzenleyebilirsiniz.

## 8. Güvenlik Notları

- API anahtarlarını asla kaynak kodunda saklamayın, her zaman çevresel değişkenler kullanın.
- Hassas bilgileri asla e-posta içeriğinde göndermeyin.
- E-posta gönderimlerinde hata yakalamayı ve loglama yapmayı unutmayın.
- SendGrid hesabınızın güvenliğini sağlamak için güçlü bir şifre kullanın ve 2FA (İki Faktörlü Kimlik Doğrulama) etkinleştirin.

## 9. Üretim Ortamına Geçiş

Üretim ortamında Brevo entegrasyonunu kullanmak için:

1. Üretim sunucusunda da `.env` dosyasında BREVO_API_KEY değişkenini ayarlayın.
2. Üretim ortamı için ayrı bir Brevo API anahtarı oluşturmayı düşünebilirsiniz.
3. E-posta gönderim istatistiklerini ve başarısızlıklarını izlemek için bir loglama mekanizması kurun.
4. Üretim ortamında daha fazla e-posta gönderimi gerekiyorsa (günlük 300'den fazla), ücretli plana geçmeyi düşünün.

## 10. E-posta Hizmeti Sağlayıcısını Değiştirme

Gelecekte Brevo yerine başka bir e-posta hizmeti sağlayıcısı kullanmak isterseniz, sadece `/api/send-email-notification` endpoint'ini ve kullandığımız email-helpers.js dosyasını güncellemeniz yeterli olacaktır. Uygulama kodunun geri kalanında herhangi bir değişiklik yapmaya gerek yoktur.

## 11. Brevo Hakkında Ekstra Bilgiler

- Brevo, eski adıyla Sendinblue olarak bilinen bir pazarlama otomasyon ve e-posta gönderim platformudur.
- Ücretsiz planı günlük 300 e-posta gönderimi sağlar, bu da çoğu küçük ve orta ölçekli işletme için yeterlidir.
- Brevo, e-posta gönderiminin yanı sıra SMS, Canlı Sohbet, CRM, WhatsApp ve daha fazla pazarlama aracı içerir.
- Brevo API'si, REST tabanlı basit bir API'dir ve birçok programlama dili için istemci kütüphaneleri bulunur.
- E-posta teslimatı oranları SendGrid'e benzer ve güvenilirdir.