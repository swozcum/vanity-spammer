# 🚀 Vanity Spammer

Bu proje, [@Swozinc](https://www.youtube.com/@Swozinc) tarafından geliştirilen açık kaynaklı ve topluluk destekli bir uygulamadır.

## 📽️ Tanıtım Videosu

[![Tanıtım Videosu](https://img.youtube.com/vi/sEIylcQV85o/maxresdefault.jpg)](https://youtube.com/@Swozinc)

👆 Projeyi daha iyi anlamak için tanıtım videomuzu izleyebilirsiniz.

## ✨ Özellikler

| Özellik | Açıklama |
|---------|----------|
| 🔁 Otomatik Vanity Claim | Vanity URL'yi sürekli deneyerek hedef sunucuya alır |
| 🔐 MFA Fix | Şifre ile MFA akışını otomatik tamamlar ve token'ı yeniler |
| ⏱️ Akıllı Aralık | `interval` değerine göre denemeler arası bekleme yapar |
| 🚦 Rate Limit Koruma | 429 yanıtında `retry_after` süresini bekleyip kaldığı yerden devam eder |
| 🔔 Webhook Bildirimi | Vanity alındığında webhook üzerinden anında bildirim gönderir |
| ⚡ HTTP/2 İstekler | Hızlı ve düşük gecikmeli istekler için HTTP/2 kullanır |

## 🛠️ Kurulum

Node.js (v18 veya üzeri) kurulu olması gerekir.

```bash
npm install
```

veya bağımlılıklar hazırsa doğrudan başlatın:

```bash
node spammer.js
```

## 📖 Kullanım

1. `config.json` dosyasını aç ve bilgileri doldur:
   - **token:** Sunucuda vanity URL'yi değiştirme yetkisi olan hesabın token'i
   - **password:** İlgili hesabın şifresi
   - **server_id:** Vanity URL'nin alınacağı sunucunun ID'si
   - **vanity:** Alınmak istenen vanity URL (ör. `json`)
   - **interval:** Denemeler arası bekleme süresi (saniye)
   - **webhook:** Vanity alındığında bildirim gönderilecek webhook URL'si
   - **webhook_name / webhook_avatar:** Webhook görünen adı ve avatarı

2. `node spammer.js` komutuyla başlat.
3. `[MFA] Yenilendi` çıktısını gördükten sonra denemeler otomatik başlar.
4. Vanity URL alındığında ekranda `Claimed: discord.gg/{vanity}` yazısı görünür ve webhook bildirimi gönderilir.

> 💡 Hesabta **2FA** kapalı olmalıdır.

## 💬 Destek ve Topluluk

Herhangi bir sorunla karşılaşırsanız veya yardım almak isterseniz, destek sunucumuza katılabilirsiniz:

[![Discord Banner](https://api.weblutions.com/discord/invite/json/)](https://discord.gg/json)

## 🪪 Lisans

Bu proje, [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0) ile lisanslanmıştır. Detaylar için `LICENSE` dosyasına göz atabilirsiniz.

## 📄 Sorumluluk Reddi Beyanı

Bu araç yalnızca eğitim amaçlı ve kavram ispatı için hazırlanmıştır. Üçüncü tarafların gerçekleştirdiği yasadışı, beklenmedik eylemlerden ve Kullanım Şartları ihlallerinden sorumlu değilim.

This tool was made for educational purposes and proof of concepts. I'm not accountable for any unlawful, unprecedented action and any violation of ToS administered by a third party.
