// pages/api/send-email-notification.js
// Brevo (Sendinblue) API ile e-posta gönderme servisi
import SibApiV3Sdk from 'sib-api-v3-sdk';

export default async function handler(req, res) {
  // Sadece POST isteklerini işle
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Sadece POST metodu desteklenmektedir' });
  }

  try {
    // Brevo API anahtarını kontrol et
    const BREVO_API_KEY = process.env.BREVO_API_KEY;
    if (!BREVO_API_KEY) {
      console.error('BREVO_API_KEY çevresel değişkeni bulunamadı.');
      return res.status(500).json({ error: 'E-posta servisi yapılandırılmamış' });
    }

    // İstek gövdesini al
    const {
      to,
      subject,
      text,
      html,
      from = 'ucanisplus@gmail.com',
      fromName = 'TLC Metal CRM',
      cc,
      bcc,
      replyTo
    } = req.body;

    // Zorunlu alanları kontrol et
    if (!to || (!text && !html) || !subject) {
      return res.status(400).json({
        error: 'Geçersiz e-posta verileri',
        details: 'Alıcı (to), konu (subject) ve içerik (text veya html) alanları zorunludur'
      });
    }

    // Brevo API client'ını yapılandır
    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    const apiKey = defaultClient.authentications['api-key'];
    apiKey.apiKey = BREVO_API_KEY;
    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

    // Alıcıları düzenle (string veya dizi olabilir)
    const recipients = Array.isArray(to) 
      ? to.map(email => ({ email })) 
      : [{ email: to }];

    // CC alıcıları (isteğe bağlı)
    const ccRecipients = cc ? (Array.isArray(cc) 
      ? cc.map(email => ({ email })) 
      : [{ email: cc }]) : [];

    // BCC alıcıları (isteğe bağlı)
    const bccRecipients = bcc ? (Array.isArray(bcc) 
      ? bcc.map(email => ({ email })) 
      : [{ email: bcc }]) : [];

    // E-posta gönderim nesnesi oluştur
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = html || '';
    sendSmtpEmail.textContent = text || '';
    sendSmtpEmail.sender = { name: fromName, email: from };
    sendSmtpEmail.to = recipients;
    
    // İsteğe bağlı alanlar
    if (ccRecipients.length > 0) sendSmtpEmail.cc = ccRecipients;
    if (bccRecipients.length > 0) sendSmtpEmail.bcc = bccRecipients;
    if (replyTo) sendSmtpEmail.replyTo = { email: replyTo };

    console.log(`📧 E-posta gönderiliyor: ${subject} -> ${to}`);

    // E-postayı gönder
    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('✅ E-posta başarıyla gönderildi:', result);

    // Başarılı yanıt döndür
    return res.status(200).json({
      success: true,
      messageId: result.messageId,
      message: 'E-posta başarıyla gönderildi'
    });
  } catch (error) {
    console.error('❌ E-posta gönderme hatası:', error);
    
    // Brevo API'den hata detayları varsa logla
    if (error.response && error.response.body) {
      console.error('📊 Brevo yanıt detayları:', error.response.body);
      
      return res.status(500).json({
        error: 'E-posta gönderilemedi',
        details: error.message,
        brevoError: error.response.body
      });
    }

    // Genel hata durumu
    return res.status(500).json({
      error: 'E-posta gönderilemedi',
      details: error.message
    });
  }
}