# Emekli: FATCA ve CRS doğrulayıcıları

**Tarih:** 2026-11-28

Bu klasör emekliye ayrıldı. Silinmedi.

Yerine kanonik araç `lib/engine.js` (sürüm 1.3.0) kullanılır. `fatca-validator.js` ve `crs-validator.js` aynı öz beyan sorusuna ayrı cevap üretiyordu. TR TIN'de sağlama yoktu (`abcd` geçebiliyordu). Çoklu mukimlikte tek TIN alanı ikinci ülkeyi sormuyordu. `tin-rules.js` ve `tin-formats.json` bu doğrulayıcıya aitti.

Dosyalar yerinde durur. Yeni kontrol için motoru kullanın. Ortak denetim notu `ortak-metodoloji.md` dosyasındadır.
