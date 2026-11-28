# Konsolidasyon fark tablosu

Tarih: 2026-11-28. Girdiler sentetiktir. Gerçek müşteri yoktur.

Kanonik sonuç `lib/engine.js` 1.3.0 içindir. Diğer üç uygulama bu çalışmadan sonra `archive/` altındadır ve değiştirilmedi.

## Nasıl çalıştırıldı

Aynı olgu dört araca da verildi. Satır senaryoları Python `degerlendir` ve motor `evaluateRow` ile kolon kolon işlendi. JS doğrulayıcılar ve eski HTML tek forma çevrildi: ülke adı "United States" vatandaşlıkta US sayıldı, tarih YYYY-AA-GG yapıldı, hold-mail `E` care-of ve tek adres oldu. Eski HTML'in her kayıtta eklediği F9 ve R5 (kontrol listesi) karardan çıkarıldı; sayfanın kendi kararı da öyledir.

İki sistematik gürültü tablonun çoğunu boyar. CRS doğrulayıcı ve eski HTML, TR TIN'i sağlama ile değil "elle bak" diye işaretler. Beyan tarihi 15.03.2024, bugün 2026-11-28 kabul edilince bir yıldan eski uyarısı da düşer. Bu iki iz, aşağıdaki satırlarda C1/C6 olarak görünür. Sağlama farkı değildir.

Karar sınıfı: Yüksek bulgu **Makul değil**, yalnız Orta **Manuel**, yalnız Düşük veya bulgu yok **Makul**. Tanınmayan müşteri tipi **Manuel / kapsam belirsiz**.

## Özet

45 sentetik senaryo (31 satır, 14 form).

Motor ile Python karar sınıfı 23 satırda aynı, 8 satırda farklıdır. Farklar: yedi serbest metin tüzel/bilinmeyen tip (Python "Makul") ve `TR;DE` tek alanda (Python ülke tanınmadı, motor ikinci ülke için TIN arar).

FATCA doğrulayıcı, CRS doğrulayıcı ve eski HTML, TR sağlama, çoklu TIN, ABD göstergesinin önemi, geçersiz tarih ve tüzel yazımda ayrılır. Ayrıntı tablodadır.

## Motora taşınan doğru kurallar

| Konu | Nerede vardı | Motorda ne oldu | Kaynak |
|---|---|---|---|
| Tüzel yazım listesi ve tanınmayan tip | CRS doğrulayıcı ve eski HTML, `individual`/`entity` değilse hata verir (Makul dönmez). Liste Türkçe unvanları tanımaz. Python de tanımaz ve Makul döner | E01 kapalı liste (tüzel kişi, LTD, A.Ş., anonim şirket, limited, ticari, vakıf, dernek). Tanınmayan tip E03, sonuç Manuel / kapsam belirsiz | IGA Ek I Bölüm IV–V; CRS Bölüm V–VI. Denetim AU-B-001 |
| Her mukimlik için TIN veya neden | Eski HTML `Ülke:TIN` ve eksik ülke için hata. Python üç slot. CRS doğrulayıcı tek TIN | Formda `residenceCountry` ile `taxResidences` birleşir; TIN yalnız birincil ülkeye yazılır. `TR;DE` ayrılır. İkinci ülkede TIN veya A/B/C yoksa C08 | CRS Bölüm I; OECD örnek form, neden A/B/C. AU-B-012 |
| Hold-mail, düzenli talimat, vekil alan adları | Eski HTML ve FATCA doğrulayıcı bu alanları ayrı isimle taşır. Motor kuralı zaten vardı, form köprüsü kaçırıyordu | `address.holdMail`, care-of + tek adres, talimat dizisi ve ABD vekili F06, F07, F08'e bağlandı | IGA Ek I II.B(1) |

TR TCKN/VKN sağlama motorda ve Python'da zaten vardı. CRS doğrulayıcı ve eski HTML'de yoktur. Taşınacak yeni kural değildi. `abcd` ve sağlaması bozuk TCKN için regresyon testi eklendi (AU-B-011).

## Taşınmayan kurallar

| Kural | Neden taşınmadı |
|---|---|
| ABD göstergesi yalnız uyarı, `valid: true` | IGA Ek I II.B(1) göstergeyi yüksek tutar. FATCA doğrulayıcı düşük bırakır (AU-B-002) |
| ABD kişisi beyanında TIN yalnız ikamet ABD ise | IRC 7701(b) ve IGA, ABD kişisinde TIN ister. Doğrulayıcı ikamet ABD değilse atlar (AU-B-003) |
| Herhangi bir cure metni ABD doğumunu kapatır | IGA Ek I II.B(4) öz beyan, ABD dışı pasaport ve CLN/açıklama ister. Serbest metin yetmez (AU-B-004) |
| SSN `000` ve `666` kabul; tiresiz SSN ve EIN ret | IRS/SSA ayrık değerleri ve EIN biçimi. Motor zaten ayırır (AU-B-005) |
| Telefon yalnız `+1`, `00` yok, NANP yok | Motor `00` ve NANP'i zaten okur (AU-B-006) |
| Her forma F9 "manuel gözden geçir" | Her kaydı manuele çevirir. IGA'da böyle bir otomatik kural yok |
| KYC ülkesi yalnız `residenceCountry` ile | KYC, beyan edilen mukimlik kümesindeyse çelişki değildir (AU-B-013). Motor kümeye bakar |
| Neden A, ülkenin TIN verip vermediğine bakılmadan kabul | Motor dokuz ülkede C10 üretir. CRS doğrulayıcı üretmez (AU-B-014) |
| Beyan bir yıldan eskiyse uyarı | 2017 CRS, öz beyanı değişen koşula kadar geçerli sayar. Sabit yıl yoktur |
| 18 yaş altı uyarısı | Çocuk ve vasi bu sürümün kapsamı dışında (`docs/kapsam.md`) |
| Tek isim (mononym) manuel | OECD CRS SSS, tek ismi geçerli sayar (ad NFN). Makullük ret'i değildir |
| `1 212…` öneksiz telefonu ABD saymak | FATCA doğrulayıcının `^\+?1` kalıbı geniştir ve `00` önekini kaçırır. Doğru kural "tanınamadı → manuel" hiçbir araçta yok (AU-B-024). Taşınmadı |
| "Evet, var" gibi evet/hayır | Python ve motor ikisi de sessizce boş sayar. Doğru "okunamadı" kuralı hiçbir uygulamada yok (AU-B-023). Taşınmadı |
| Neden A/C için 9 ülke dışı geniş liste | `tin-rules.js` biçim tablosudur, "ülke TIN verir" tablosu değildir. Satır satır doğrulanmadı (AU-B-018, AU-B-025) |
| F01'de çürütme belgesiyle önem düşürme | Python ve motor aynı. F01 için düşürmenin dayanağı uzmana bırakıldı (AU-B-022). Değiştirilmedi |
| AU-B-039 | Kapsam dışı. Bu depoda karşılığı yok. Dokunulmadı |

## Senaryo tablosu

| Senaryo | Motor 1.3.0 | Python | FATCA JS | CRS JS | Eski HTML | Doğru | Gerekçe |
|---|---|---|---|---|---|---|---|
| P01 temiz | Makul | Makul | Makul | Manuel (C1, C6) | Manuel (C1, C6) | Motor ve Python | Geçerli sentetik TCKN. C1/C6 gürültüsü: eski beyan yılı ve TR'de sağlama yok |
| P02 ABD vatandaş, W-8 ve belge | Manuel (F01) | Manuel (F01) | Manuel (uyarı F1) | Manuel (C1, C6) | Manuel (F1) | Motor ve Python | Gösterge durur, önem bir kademe iner. F01 düşürmesi uzmana bırakıldı |
| P04 ABD doğum, belge yok | Makul değil (F02, F11) | Makul değil (F02, F11) | Manuel (uyarı) | Manuel (C1, C6) | Manuel | Motor ve Python | IGA Ek I II.B: belge yokken gösterge yüksek kalır |
| P05 ABD mukim, TIN yok | Makul değil | Makul değil | Makul değil | Makul değil | Makul değil | Dört araç da ret | TIN'siz ABD mukimliği geçemez |
| P06 telefon `1 212` öneksiz | Makul | Makul | Manuel (F4) | Manuel (C1, C6) | Manuel (F4) | Taşınmadı | Öneksiz numara için "tanınamadı" kuralı yok. Geniş `+?1` kalıbı taşınmadı |
| P07 telefon `001212` | Makul değil (F05) | Makul değil (F05) | Makul | Manuel (C1, C6) | Manuel (R6) | Motor ve Python | `00` uluslararası önektir. FATCA JS bunu ABD telefonu saymaz |
| P09 hold-mail E | Manuel (F08) | Manuel (F08) | Manuel (F7) | Manuel (C1, C6) | Manuel (F7) | Motor, Python, eski HTML | IGA Ek I II.B(1) in-care-of / hold mail |
| P10 hold-mail "Evet, var" | Makul | Makul | Makul | Manuel (C1, C6) | Manuel (C1, C6) | Hiçbiri tam değil | Değer okunamadı; sessiz boş yanlış. Kural hiçbir araçta yok |
| P11 "United States" | Makul değil (F01) | Makul değil (F01) | Manuel (uyarı) | Manuel (C1, C6) | Manuel | Motor ve Python | Ülke adı ABD vatandaşlığıdır; önem yüksek |
| P16 TCKN sağlaması bozuk | Manuel (C13) | Manuel (C13) | Makul | Manuel (C6, sağlama yok) | Manuel (C6, sağlama yok) | Motor ve Python | TCKN kontrol hanesi. `10000000147` geçmez |
| P17 TCKN 0 ile başlar | Manuel (C14) | Manuel (C14) | Makul | Manuel (C6) | Manuel (C6) | Motor ve Python | İlk hane 0 olamaz; yer tutucu |
| P18 ES neden A | Makul (C07 düşük) | Makul (C07) | Makul | Manuel (C1) | Manuel (C1) | Bilinçli sınır | A/C yalnız dokuz ülkede. ES listesi doğrulanmadığı için genişletilmedi |
| P20 TR+DE, DE TIN yok | Makul değil (C08) | Makul değil (C08) | Makul | Manuel (tek TIN) | Makul değil | Motor, Python, eski HTML | Her ülke için TIN veya neden. CRS JS ikinci ülkeyi atlar |
| P20b tek alanda `TR;DE` | Makul değil (C08) | Manuel (C02, C20) | Makul | Makul değil (geçersiz kod) | Makul değil | Motor | İki ülke ayrılınca ikincisinde TIN yok. Python yalnızca "ülke tanınmadı" der |
| P21 tarih 30.02.2026 | Manuel (C19) | Manuel (C19) | Makul | Manuel (C6) | Makul değil (tarih) | Motor, Python, eski HTML | 30 Şubat yoktur. CRS JS `Date` kaydırması tarihi kabul eder |
| P23 AE mukim, adres TR | Makul değil (C17, C18) | Makul değil | Makul | Manuel (adres uyarısı) | Makul değil (R2) | Motor ve Python | OECD CBI/RBI tablosu ve adres başka ülkede |
| P24 `123456789` | Manuel (C14) | Manuel (C14) | Makul | Manuel (C6) | Manuel (C6) | Motor ve Python | Art arda rakam yer tutucudur |
| P25 SSN `000-12-3456` | Makul değil (C13) | Makul değil (C13) | Makul değil (biçim) | Manuel | Makul değil | Motor ve Python | Alan 000 geçersizdir. FATCA JS bu değeri kabul eder; burada ret, ikametin ABD olması yüzündendir |
| P26 EIN `12-3456789` | Makul değil (F09; C14 yer tutucu) | Makul değil | Makul değil (EIN'i ret) | Makul değil | Makul değil | Motor EIN biçimini tanır | EIN `xx-xxxxxxx` geçerlidir. Bu numara yer tutucu olduğu için C14. FATCA JS EIN'i baştan reddeder |
| E04 Tüzel Kişi | Manuel (E01) | Makul | Makul | Makul değil (tip geçersiz) | Makul değil (tip geçersiz) | Motor | Tüzel kişi bireysel Makul olamaz. Diğer JS araçları unvanı tanımaz, yalnız "tip hatalı" der |
| E05 LTD | Manuel (E01) | Makul | Makul | Makul değil (tip) | Makul değil (tip) | Motor | Aynı |
| E06 A.Ş. | Manuel (E01) | Makul | Makul | Makul değil (tip) | Makul değil (tip) | Motor | Aynı |
| E06b Vakıf | Manuel (E01) | Makul | Makul | Makul değil (tip) | Makul değil (tip) | Motor | Aynı |
| E06c Dernek | Manuel (E01) | Makul | Makul | Makul değil (tip) | Makul değil (tip) | Motor | Aynı |
| E06d Ticari | Manuel (E01) | Makul | Makul | Makul değil (tip) | Makul değil (tip) | Motor | Aynı |
| E06e Anonim Şirket | Manuel (E01) | Makul | Makul | Makul değil (tip) | Makul değil (tip) | Motor | Aynı |
| E06f VIP | Manuel / kapsam belirsiz (E03) | Makul | Makul | Makul değil (tip) | Makul değil (tip) | Motor | Tanınmayan tip Makul olamaz. E03 bunu açık yazar |
| E06g tip T | Manuel (E01) | Kapsam dışı | Makul | Manuel | Manuel (R1) | Motor ve Python | Bilinen tüzel kod. FATCA JS tipi yok sayar |
| K2 TIN `abcd` | Manuel (C13) | Manuel (C13) | Makul | Manuel (C6, hata yok) | Manuel (C6, hata yok) | Motor ve Python | `abcd` TCKN/VKN değildir |
| K6 2026-02-30 | Manuel (C19) | Manuel (C19) | Makul | Manuel (C6) | Makul değil | Motor, Python, eski HTML | Ayın 30'u Şubat'ta yok. CRS JS kabul eder |
| K11 CY, CBI, TIN kısa | Manuel (C13, C17) | Manuel (C17) | Makul | Makul değil (C6 biçim) | Manuel (R2, C6) | Motor | CBI/RBI Orta. Kıbrıs TIN uzunluğu `tin-rules` tablosunda 9 karakter; Python 4–20 ile geçirir |
| F-C SSN `000-00-0000` | Makul değil (C14) | (form) | Makul | Makul | Makul değil (F1, C6) | Motor | `000` alanlı SSN geçmez. FATCA JS kabul eder |
| F-E tiresiz `123456789` | Makul değil (C14) | (form) | Makul değil (biçim ret) | Makul değil | Makul değil | Motor yer tutucuyu yakalar | Tiresiz dokuz hane, ardışık rakam. Geçerli tiresiz SSN ayrı kuralla tanınır; bu değer yer tutucudur |
| F-G telefon `001…` | Makul değil (F05) | (form) | Makul | Manuel (C6) | Manuel (R6) | Motor | `00` öneki ABD/NANP telefonudur |
| F-K yalnız hold-mail | Manuel (F08) | (form) | Makul | Manuel (C6) | Manuel (C6) | Motor | FATCA JS yalnız care-of bakar, hold-mail alanını görmez |
| F-Q entity | Manuel (E01) | (form) | Makul | Manuel (C6) | Manuel (R1) | Motor ve eski HTML | Tüzel, bireysel Makul değildir. FATCA JS uyarı vermez |
| C-B `abcd` | Manuel (C13) | (form) | Makul | Manuel (C6) | Manuel (C6) | Motor | TR sağlama |
| K1 `10000000147` | Manuel (C13) | (form) | Makul | Manuel (C6) | Manuel (C6) | Motor | Sağlama hatası hata sayılır, "elle bak" ile geçiştirilmez |
| K3 TR+DE, tek TIN | Makul değil (C08) | (form) | Makul | Manuel (C6) | Makul değil | Motor ve eski HTML | İkinci ülkenin TIN'i veya nedeni yok |
| K4 KYC TR, mukimlik TR ve DE, neden A | Makul değil (C08, C10) | (form) | Makul | Makul değil (C3) | Makul değil (C3) | Motor | KYC, mukimlik kümesinde. Çelişki değildir. DE neden A, Almanya TIN verir. İkinci ülkede neden yok |
| K6 formda 2026-02-30 | Manuel (C19) | (form) | Makul | Manuel (C6) | Makul değil | Motor ve eski HTML | Geçersiz takvim |
| K7 doğum 1985-02-31 | Manuel (C22) | (form) | Makul | Manuel (C6) | Makul değil | Motor ve eski HTML | Geçersiz takvim. CRS JS kabul eder |
| K13 yaş 10 | Makul | (form) | Makul | Manuel (18 yaş) | Manuel (18 yaş) | Motor | 18 yaş uyarısı 2017 CRS makullük maddesi değil. Kapsam dışı |
| C-O beyan 14 ay | Makul | (form) | Makul | Manuel (1 yıl) | Manuel (1 yıl) | Motor | Sabit bir yıl süresi CRS 2017'de yok. Değişen koşul ayrıca K01 |
| K9 DE neden A | Makul değil (C10) | (form) | Makul | Makul | Makul | Motor | OECD neden A: ülke TIN vermez. Almanya verir |

## Denetim maddeleri

- **AU-B-001:** Giderildi. Tüzel yazımlar E01. Tanınmayan tip E03 ve "Manuel / kapsam belirsiz". Makul dönmez.
- **AU-B-011:** Motorda zaten doğruydu. `abcd` ve bozuk TCKN C13 ile kalır. Regresyon testi kilitler. CRS doğrulayıcı ve eski HTML arşivde kaldı; onlara sağlama eklenmedi.
- **AU-B-012:** Giderildi. Üç slot, formdaki ülke listesinin birleşimi ve tek alandaki `TR;DE` her ülke için TIN veya neden arar.
- **AU-B-039:** Kapsam dışı. Dokunulmadı.
