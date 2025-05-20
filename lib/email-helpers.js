// email-helpers.js
// E-posta bildirimleri için yardımcı fonksiyonlar (Brevo API ile)

import { fetchWithAuth } from '@/api-config';

/**
 * E-posta gönder
 * @param {Object} emailData - E-posta verileri
 * @param {string|string[]} emailData.to - Alıcı e-posta adresi veya adresleri
 * @param {string} emailData.subject - E-posta konusu
 * @param {string} [emailData.text] - Düz metin formatında e-posta içeriği
 * @param {string} [emailData.html] - HTML formatında e-posta içeriği
 * @param {string} [emailData.from] - Gönderici e-posta adresi (varsayılan: satis@tlcmetal.com.tr)
 * @param {string} [emailData.fromName] - Gönderici adı (varsayılan: TLC Metal Satış)
 * @param {string|string[]} [emailData.cc] - CC alıcıları
 * @param {string|string[]} [emailData.bcc] - BCC alıcıları
 * @param {string} [emailData.replyTo] - Yanıt verilecek e-posta adresi
 * @returns {Promise<Object>} API yanıtı
 */
export const sendEmail = async (emailData) => {
  try {
    if (!emailData.to || (!emailData.text && !emailData.html) || !emailData.subject) {
      throw new Error('Alıcı (to), konu (subject) ve içerik (text veya html) alanları zorunludur');
    }

    const response = await fetchWithAuth('/api/send-email-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'E-posta gönderilirken bir hata oluştu');
    }

    return await response.json();
  } catch (error) {
    console.error('E-posta gönderme hatası:', error);
    throw error;
  }
};

/**
 * Yeni talep bildirimi gönder
 * @param {Object} talep - Talep verileri
 * @param {string[]} recipients - Alıcı e-posta adresleri
 * @returns {Promise<Object>} API yanıtı
 */
export const sendNewRequestNotification = async (talep, recipients = ['uretim@tlcmetal.com.tr']) => {
  const emailTemplate = `
    <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
      <h2 style="color: #3498db;">Yeni Galvanizli Tel Talebi</h2>
      <p>Sayın İlgili,</p>
      <p>Yeni bir galvanizli tel talebi oluşturulmuştur. Lütfen aşağıdaki talep detaylarını inceleyiniz.</p>
      <div style="margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
        <p><strong>Talep Detayları:</strong></p>
        <ul>
          <li>Talep No: ${talep.id}</li>
          <li>Çap: ${talep.cap} mm</li>
          <li>Kaplama: ${talep.kod_2} ${talep.kaplama} g/m²</li>
          <li>Mukavemet: ${talep.min_mukavemet} - ${talep.max_mukavemet} MPa</li>
          <li>Ağırlık: ${talep.kg} kg</li>
          <li>İç Çap: ${talep.ic_cap} cm</li>
          <li>Dış Çap: ${talep.dis_cap} cm</li>
          <li>Tolerans: +${talep.tolerans_plus} mm / -${talep.tolerans_minus} mm</li>
          <li>Unwinding: ${talep.unwinding || 'Anti-Clockwise'}</li>
          ${talep.cast_kont ? `<li>Bağ Miktarı: ${talep.cast_kont}</li>` : ''}
          ${talep.helix_kont ? `<li>Helix Kontrol: ${talep.helix_kont}</li>` : ''}
          ${talep.elongation ? `<li>Elongation: ${talep.elongation}</li>` : ''}
        </ul>
      </div>
      <p>Talebi incelemek ve işlem yapmak için CRM sistemine giriş yapabilirsiniz.</p>
      <p>Saygılarımızla,</p>
      <p><strong>TLC Metal Satış Ekibi</strong></p>
    </div>
  `;

  return sendEmail({
    to: recipients,
    subject: 'Yeni Galvanizli Tel Talebi Oluşturuldu',
    html: emailTemplate,
    text: `Yeni bir galvanizli tel talebi oluşturuldu. Çap: ${talep.cap}mm, Kaplama: ${talep.kod_2} ${talep.kaplama}g/m², Ağırlık: ${talep.kg}kg`
  });
};

/**
 * Talep onay bildirimi gönder
 * @param {Object} talep - Talep verileri
 * @param {string} userEmail - Kullanıcı e-posta adresi
 * @returns {Promise<Object>} API yanıtı
 */
export const sendApprovalNotification = async (talep, userEmail) => {
  const emailTemplate = `
    <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
      <h2 style="color: #3498db;">Talep Onaylandı</h2>
      <p>Sayın Kullanıcı,</p>
      <p>Oluşturduğunuz galvanizli tel talebi <strong style="color: green;">onaylanmıştır</strong>.</p>
      <div style="margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
        <p><strong>Talep Detayları:</strong></p>
        <ul>
          <li>Talep No: ${talep.id}</li>
          <li>Çap: ${talep.cap} mm</li>
          <li>Kaplama: ${talep.kod_2} ${talep.kaplama} g/m²</li>
          <li>Miktar: ${talep.kg || 0} kg</li>
        </ul>
      </div>
      <p>Talebiniz üretim planlamasına alınmıştır.</p>
      <p>Saygılarımızla,</p>
      <p><strong>TLC Metal Satış Ekibi</strong></p>
    </div>
  `;

  return sendEmail({
    to: userEmail,
    subject: 'Galvanizli Tel Talebiniz Onaylandı',
    html: emailTemplate,
    text: `Galvanizli tel talebiniz onaylanmıştır. Çap: ${talep.cap}mm, Kaplama: ${talep.kod_2} ${talep.kaplama}g/m², Ağırlık: ${talep.kg}kg`
  });
};

/**
 * Talep red bildirimi gönder
 * @param {Object} talep - Talep verileri
 * @param {string} userEmail - Kullanıcı e-posta adresi
 * @param {string} rejectionReason - Red sebebi
 * @returns {Promise<Object>} API yanıtı
 */
export const sendRejectionNotification = async (talep, userEmail, rejectionReason) => {
  const emailTemplate = `
    <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
      <h2 style="color: #e74c3c;">Talep Reddedildi</h2>
      <p>Sayın Kullanıcı,</p>
      <p>Oluşturduğunuz galvanizli tel talebi <strong style="color: red;">reddedilmiştir</strong>.</p>
      <div style="margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
        <p><strong>Talep Detayları:</strong></p>
        <ul>
          <li>Talep No: ${talep.id}</li>
          <li>Çap: ${talep.cap} mm</li>
          <li>Kaplama: ${talep.kod_2} ${talep.kaplama} g/m²</li>
          <li>Miktar: ${talep.kg || 0} kg</li>
        </ul>
        <p><strong>Red Sebebi:</strong> ${rejectionReason || 'Belirtilmemiş'}</p>
      </div>
      <p>Detaylı bilgi için lütfen satış departmanıyla iletişime geçiniz.</p>
      <p>Saygılarımızla,</p>
      <p><strong>TLC Metal Satış Ekibi</strong></p>
    </div>
  `;

  return sendEmail({
    to: userEmail,
    subject: 'Galvanizli Tel Talebiniz Reddedildi',
    html: emailTemplate,
    text: `Galvanizli tel talebiniz reddedilmiştir. Red sebebi: ${rejectionReason}`
  });
};

/**
 * Genel bildirim e-postası gönder
 * @param {string} subject - E-posta konusu
 * @param {string} message - E-posta mesajı (HTML formatında)
 * @param {string|string[]} recipients - Alıcı e-posta adresleri
 * @returns {Promise<Object>} API yanıtı 
 */
export const sendGeneralNotification = async (subject, message, recipients) => {
  const emailTemplate = `
    <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
      <h2 style="color: #3498db;">${subject}</h2>
      <div style="margin: 20px 0; line-height: 1.5;">
        ${message}
      </div>
      <p>Saygılarımızla,</p>
      <p><strong>TLC Metal</strong></p>
    </div>
  `;

  return sendEmail({
    to: recipients,
    subject: subject,
    html: emailTemplate,
    text: message.replace(/<[^>]*>?/gm, '') // HTML etiketlerini kaldır
  });
};