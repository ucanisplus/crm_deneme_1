# E-posta Bildirimi Kullanım Kılavuzu

Bu dokümantasyon, CRM sisteminde e-posta bildirimleri gönderme işlevinin nasıl kullanılacağını açıklar.

## Genel Bakış

E-posta bildirimleri, Resend servisi kullanılarak gönderilir. Bu özellik, kullanıcılara bildirim göndermek, talep onayları, satış durumları ve diğer önemli bilgileri iletmek için kullanılabilir.

## API Endpoint

```
POST https://crm-deneme-backend.vercel.app/api/send-email-notification
```

**Important:** Always use the full backend URL (not a relative path) when calling this endpoint from frontend components.

## İstek Parametreleri

İstek gövdesi JSON formatında olmalı ve aşağıdaki parametreleri içermelidir:

| Parametre | Tip | Zorunlu | Açıklama |
|-----------|-----|---------|----------|
| to | string veya array | Evet | Alıcı e-posta adresi veya adresleri |
| subject | string | Evet | E-posta konusu |
| text | string | Evet (html yoksa) | Düz metin formatında e-posta içeriği |
| html | string | Evet (text yoksa) | HTML formatında e-posta içeriği |
| from | string | Hayır | Gönderici e-posta adresi (varsayılan: satis@tlcmetal.com.tr) |
| cc | string veya array | Hayır | CC alıcıları |
| bcc | string veya array | Hayır | BCC alıcıları |
| replyTo | string | Hayır | Yanıt verilecek e-posta adresi |

## Örnek İstek

```javascript
// Basit bir e-posta gönderme örneği
const sendEmail = async () => {
  try {
    const response = await fetch('/api/send-email-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: 'alici@example.com',
        subject: 'Yeni Talep Bildirimi',
        text: 'Yeni bir galvanizli tel talebi oluşturuldu. Lütfen kontrol ediniz.',
        html: '<p>Yeni bir <strong>galvanizli tel talebi</strong> oluşturuldu. Lütfen kontrol ediniz.</p>',
      }),
    });

    const data = await response.json();
    console.log('E-posta gönderildi:', data);
  } catch (error) {
    console.error('E-posta gönderme hatası:', error);
  }
};
```

## Talep Onay/Red E-postaları Gönderme

Aşağıdaki örnek, talep onaylandığında veya reddedildiğinde e-posta gönderme işlevini gösterir:

```javascript
// Talep onay e-postası gönderme
const sendApprovalEmail = async (talep, userEmail) => {
  try {
    const response = await fetch('/api/send-email-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: userEmail,
        subject: 'Galvanizli Tel Talebiniz Onaylandı',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
            <h2 style="color: #3498db;">Talep Onaylandı</h2>
            <p>Sayın Kullanıcı,</p>
            <p>Oluşturduğunuz galvanizli tel talebi <strong style="color: green;">onaylanmıştır</strong>.</p>
            <div style="margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
              <p><strong>Talep Detayları:</strong></p>
              <ul>
                <li>Talep No: ${talep.id}</li>
                <li>Ürün: ${talep.title || 'Belirtilmemiş'}</li>
                <li>Miktar: ${talep.kg || 0} kg</li>
                <li>Çap: ${talep.cap || 0} mm</li>
                <li>Kod: ${talep.kod_2 || 'Belirtilmemiş'}</li>
              </ul>
            </div>
            <p>Talebiniz üretim planlamasına alınmıştır.</p>
            <p>Saygılarımızla,</p>
            <p><strong>TLC Metal Satış Ekibi</strong></p>
          </div>
        `,
      }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Onay e-postası gönderme hatası:', error);
    throw error;
  }
};

// Talep red e-postası gönderme
const sendRejectionEmail = async (talep, userEmail, rejectionReason) => {
  try {
    const response = await fetch('/api/send-email-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: userEmail,
        subject: 'Galvanizli Tel Talebiniz Reddedildi',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
            <h2 style="color: #e74c3c;">Talep Reddedildi</h2>
            <p>Sayın Kullanıcı,</p>
            <p>Oluşturduğunuz galvanizli tel talebi <strong style="color: red;">reddedilmiştir</strong>.</p>
            <div style="margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
              <p><strong>Talep Detayları:</strong></p>
              <ul>
                <li>Talep No: ${talep.id}</li>
                <li>Ürün: ${talep.title || 'Belirtilmemiş'}</li>
                <li>Miktar: ${talep.kg || 0} kg</li>
                <li>Çap: ${talep.cap || 0} mm</li>
                <li>Kod: ${talep.kod_2 || 'Belirtilmemiş'}</li>
              </ul>
              <p><strong>Red Sebebi:</strong> ${rejectionReason || 'Belirtilmemiş'}</p>
            </div>
            <p>Detaylı bilgi için lütfen satış departmanıyla iletişime geçiniz.</p>
            <p>Saygılarımızla,</p>
            <p><strong>TLC Metal Satış Ekibi</strong></p>
          </div>
        `,
      }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Red e-postası gönderme hatası:', error);
    throw error;
  }
};
```

## Hata İşleme

E-posta gönderimi başarısız olduğunda, API aşağıdaki formatta bir hata yanıtı döndürür:

```json
{
  "error": "E-posta gönderilemedi",
  "details": "Hata mesajı",
  "resendError": {
    // Resend'den dönen hata detayları (mevcutsa)
  }
}
```

## Kurulum ve Yapılandırma

E-posta gönderimini kullanabilmek için, sistem yöneticisinin aşağıdaki adımları tamamlaması gerekir:

1. Resend hesabı oluşturulması
2. API anahtarının alınması
3. `.env` dosyasında `RESEND_API_KEY` değişkeninin ayarlanması
4. Gönderici domain'inin Resend'de doğrulanması

## Önemli Notlar

- E-posta gönderimleri asenkron olarak çalışır ve API yanıtı gönderimlerin tamamlandığı anlamına gelir.
- Büyük miktarda e-posta gönderimi gerekiyorsa, Resend API limitlerine dikkat edilmelidir.
- HTML e-postalar için mobil cihazlarla uyumlu tasarım kullanılması önerilir.
- Domain doğrulaması yapılana kadar test modunda çalışır.