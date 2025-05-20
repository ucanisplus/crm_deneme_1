// E-posta bildirim testleri (Brevo API ile)
require('dotenv').config();
const SibApiV3Sdk = require('sib-api-v3-sdk');
const defaultClient = SibApiV3Sdk.ApiClient.instance;

// Brevo API key konfigürasyonu
const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY;
const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

/**
 * Test e-postası gönder
 * @param {string} toEmail - Alıcı e-posta adresi
 */
async function sendTestEmail(toEmail) {
  try {
    if (!process.env.BREVO_API_KEY) {
      throw new Error('BREVO_API_KEY çevresel değişkeni bulunamadı. Lütfen .env dosyasını kontrol edin.');
    }

    // E-posta mesajını oluştur
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.subject = 'Brevo Test E-postası';
    sendSmtpEmail.htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
        <h2 style="color: #3498db;">Brevo Bağlantı Testi</h2>
        <p>Bu e-posta, Brevo entegrasyonunuzun doğru çalıştığını doğrulamak için gönderilmiştir.</p>
        <p>Eğer bu e-postayı görüyorsanız, Brevo ayarlarınız başarıyla yapılandırılmıştır.</p>
        <p>Saygılarımızla,</p>
        <p><strong>TLC Metal CRM Sistemi</strong></p>
      </div>
    `;
    sendSmtpEmail.sender = { name: 'TLC Metal CRM', email: 'ucanisplus@gmail.com' };
    sendSmtpEmail.to = [{ email: 'hakannoob@gmail.com' }];
    sendSmtpEmail.textContent = 'Bu bir test e-postasıdır.';

    console.log(`📧 E-posta gönderiliyor: ${toEmail}`);
    const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
    
    console.log('✅ E-posta başarıyla gönderildi:', response);
    
    return response;
  } catch (error) {
    console.error('❌ E-posta gönderme hatası:');
    console.error(error);
    
    if (error.response && error.response.body) {
      console.error('📊 Brevo yanıt detayları:');
      console.error(error.response.body);
    }
    
    throw error;
  }
}

// Komutu çalıştırırken alıcı e-posta adresini argüman olarak alıyoruz
// Örnek: node scripts/test-email.js test@example.com
const recipientEmail = process.argv[2];

if (!recipientEmail) {
  console.error('❌ Lütfen bir alıcı e-posta adresi belirtin.');
  console.log('Kullanım: node scripts/test-email.js alici@ornek.com');
  process.exit(1);
}

// Test e-postasını gönder
sendTestEmail(recipientEmail)
  .then(() => {
    console.log(`✅ Test e-postası başarıyla gönderildi: ${recipientEmail}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test e-postası gönderilemedi:', error.message);
    process.exit(1);
  });