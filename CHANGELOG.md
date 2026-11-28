# Değişiklikler

## 1.3.0 — 2026-11-28

Kanonik araç `lib/engine.js` olarak kaldı. Python makullük testi, ayrı FATCA/CRS doğrulayıcıları ve eski yerel HTML kopyası silinmedi; `archive/` altına alındı.

- Tüzel yazımlar kapalı listeye alındı: tüzel kişi, LTD, A.Ş., anonim şirket, limited şirket, ticari, vakıf, dernek ve aynı anlama gelen yazımlar. Bunlar bireysel kuralla "Makul" çıkmaz; E01 ile manuel incelemeye gider.
- Tanınmayan `musteri_tipi` için yeni kural E03. Sonuç **Manuel / kapsam belirsiz** olur. Gerçek kişi kuralları çalışmaz. Sonuç Makul olamaz.
- Çoklu vergi mukimliğinde her ülke için ayrı TIN veya A/B/C neden kodu aranır. Formda `residenceCountry` ile `taxResidences` birleşir; biri diğerinin yerine geçmez. `TR;DE` gibi tek alandaki ülkeler ayrılır.
- Eski form şeklindeki tek adres hold-mail / care-of, ABD'ye düzenli talimat dizisi ve ABD adresli vekil, mevcut F06, F07 ve F08 kurallarına bağlandı.
- TR TCKN/VKN sağlama algoritması yerinde duruyor. `abcd` ve sağlaması bozuk TCKN geçmez. Buna regresyon testi eklendi.
- Senaryo karşılaştırması `docs/konsolidasyon-fark-tablosu.md` dosyasındadır. Bir yıllık beyan süresi, 18 yaş uyarısı ve doğrulanmamış ülke TIN listesi motora taşınmadı.
