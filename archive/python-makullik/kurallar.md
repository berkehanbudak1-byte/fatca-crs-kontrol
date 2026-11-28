# FATCA / CRS Öz Beyan Makullük Testi – Kural Seti

> **Sürüm:** 1.0 – 27.11.2026 · **Kural sayısı:** 31 (11 FATCA + 20 CRS)
> **Kapsam:** Gerçek kişi (bireysel) müşterilerin FATCA/CRS öz beyanları. Tüzel müşteriler (Aktif/Pasif NFE, Controlling Person) bu sürümde **kapsam dışıdır**.
> Kural kataloğunun tek kaynağı `makullik_testi.py` içindeki `RULES` sözlüğüdür; bu tablo oradan üretilmiştir (`python makullik_testi.py --test` komutu her kural ID'sinin bu dosyada bulunduğunu da kontrol eder).

## 0. Nasıl okunmalı?

* Bu araç **karar vermez**; *"öz beyanı makul mü?"* sorusunda analistin önce bakması gereken satırları işaretler. Nihai değerlendirme (belgesiz hesap, raporlama, müşteri iletişimi) kurum politikasına ve uyum yöneticisine aittir. Hukuki görüş değildir.
* **Önem (Yüksek / Orta / Düşük)** = kuralın doğurduğu inceleme önceliği. Satırın genel önemi, tetiklenen kuralların **en yükseğidir**.
* **Skor (0-100)** = tetiklenen her *kural* için Yüksek 30, Orta 10, Düşük 3 puanın toplamı (üst sınır 100). Sadece sıralama içindir.
* FATCA kuralları F01-F07'de, hesap sahibinden **hem** "ABD dışı statü öz beyanı (W-8BEN vb.)" **hem** "ABD dışı statüyü gösteren belge" kaydı varsa önem **bir kademe düşer** (IGA Annex I, çürütme belgeleri); kural yine görünür kalır, çünkü belgenin içeriği analist tarafından gözle doğrulanmalıdır.
* Tetiklenen satırlarda gerekçe metnine **kişisel veri kopyalanmaz** (yalnızca ülke kodu, alan adı, kural bilgisi yazılır).

## 1. FATCA kuralları (ABD göstergeleri – "U.S. indicia")

Dayanak: Türkiye–ABD Model 1 IGA, **Annex I, Bölüm II.B(1)** (ABD vatandaşı/mukimi tespiti; ABD doğum yeri; güncel ABD ikamet/posta adresi (posta kutusu dahil); güncel ABD telefonu; ABD'deki hesaba düzenli talimat; ABD adresli kişiye verilmiş vekâlet/imza yetkisi; tek adres olarak in-care-of/hold-mail) [K1] ve eşdeğer ABD yönetmeliği 26 CFR §1.1471-4(c)(5)(iv)(B)(1)(i)-(vii) [K4]. IGA'ya göre ABD adresi/telefonu/talimat gibi göstergelerde çürütme için **öz beyan (W-8 veya benzeri) + ABD dışı statüyü kanıtlayan belge** gerekir; ABD doğum yerinde ayrıca **Certificate of Loss of Nationality (CLN) veya makul açıklama** gerekir [K1].

| ID | Kural | Açıklama | Kullanılan alanlar | Önem | Önerilen analist aksiyonu | Kaynak |
|---|---|---|---|---|---|---|
| F01 | ABD vatandaşlığı / ABD uyruğu beyanı | Uyruk alanında ABD yer alıyor (ABD vatandaşı/mukimi göstergesi). | `vatandaslik`, `abd_degil_ozbeyan`, `abd_olmama_belge` | Yüksek | ABD kişisi (Specified U.S. Person) olarak değerlendirin; W-9/ABD TIN alın veya ABD vatandaşlığından çıkış belgesi (CLN) / makul açıklama kaydı isteyin. | K1, K4 |
| F02 | ABD doğum yeri | Doğum ülkesi ABD (net ABD doğum yeri göstergesi). | `dogum_ulkesi`, `abd_degil_ozbeyan`, `abd_olmama_belge` | Yüksek | ABD dışı statü öz beyanı (W-8BEN vb.) + CLN veya ABD vatandaşlığı edinilmediğine dair makul açıklama ve kanıt belgesi alın; yoksa ABD hesabı olarak ele alın. | K1, K4 |
| F03 | ABD ikamet adresi | Güncel ikamet adresi ABD'de. | `ikamet_adresi_ulke`, `abd_degil_ozbeyan`, `abd_olmama_belge` | Yüksek | ABD vatandaşı/mukimi olmadığına dair öz beyan (W-8BEN) ve ABD dışı statüyü kanıtlayan belge alın; kayıt adresini doğrulayın. | K1, K4 |
| F04 | ABD posta adresi / posta kutusu | Güncel posta adresi ABD'de (ABD posta kutusu dahil). | `posta_adresi_ulke`, `abd_degil_ozbeyan`, `abd_olmama_belge` | Yüksek | F03 ile aynı: ABD dışı statü öz beyanı + belge; posta adresi gerçekten kullanılıyor mu teyit edin. | K1, K4 |
| F05 | ABD telefon numarası (+1) | +1 alan kodlu telefon var. +1 hem ABD hem Kanada/Karayipler (NANP) için geçerlidir. Tek telefon ise Yüksek, ABD dışı telefon da varsa Orta; Kanada/Karayip mukimliği beyanı varsa bir kademe düşer. | `telefon_1`, `telefon_2`, `telefon_3`, `mukimlik_ulke_1..3` | Yüksek | Numaranın gerçekten ABD'ye ait olup olmadığını teyit edin; ABD ise ABD dışı statü öz beyanı + belge isteyin. | K1, K4 |
| F06 | ABD'deki hesaba düzenli ödeme talimatı | Hesaptan ABD'de tutulan bir hesaba düzenli (tekrarlayan) ödeme talimatı var. | `abd_hesabina_duzenli_talimat`, `abd_degil_ozbeyan`, `abd_olmama_belge` | Yüksek | Talimatı doğrulayın; ABD dışı statü öz beyanı + belge alın; talimatın amacını (aile, kira vb.) kayda geçirin. | K1, K4 |
| F07 | ABD adresli vekil / imza yetkilisi | Geçerli vekâletname veya imza yetkisi ABD adresli bir kişiye verilmiş. | `vekil_imza_yetkilisi_adres_ulke`, `abd_degil_ozbeyan`, `abd_olmama_belge` | Yüksek | Hesap sahibinden ABD dışı statü öz beyanı + belge alın; vekilin ABD kişisi olması hesap sahibini tek başına ABD kişisi yapmaz, kayda geçirin. | K1, K4 |
| F08 | Tek adres olarak 'in-care-of' / 'hold mail' | Hesap sahibi için kayıtlı TEK adres 'in-care-of' veya 'posta tutma' adresi. | `tek_adres_care_of_hold_mail` | Orta | Gerçek ikamet/posta adresini ve vergi mukimliğini yeniden teyit edin; ABD ile bağlantıyı sorgulayın. | K1, K4, K5 |
| F09 | ABD vergi mukimliği beyanı | Öz beyanda vergi mukimliği ülkelerinden biri ABD. | `mukimlik_ulke_1..3` | Yüksek | ABD TIN (SSN/ITIN/EIN) alındığından emin olun; FATCA raporlama sürecine (GİB bildirimi) alınıp alınmadığını kontrol edin. | K1, K2 |
| F10 | ABD TIN biçiminde vergi numarası (SSN/ITIN/EIN) | Vergi numarası alanlarında ABD SSN/ITIN/EIN biçiminde bir numara var (mukimlik ABD olmasa bile). | `tin_1..3`, `mukimlik_ulke_1..3` | Yüksek | ABD ile bağlantıyı netleştirin; mukimlik beyanı ile ABD TIN arasındaki çelişkiyi açıklatın. | K1, K8 |
| F11 | ABD göstergesi var, çürütücü belge kaydı yok | F01-F07'den en az biri tetiklendi ve hem ABD dışı statü öz beyanı hem belge kaydı birlikte mevcut değil. | `F01-F07 sonuçları`, `abd_degil_ozbeyan`, `abd_olmama_belge` | Yüksek | Müşteriden belgeleri talep edin (süre: kurum politikası); belge gelmezse hesabı ABD hesabı varsayımıyla işleyip uyum yöneticisine eskale edin. | K1, K4 |

**Not (F05):** +1 alan kodu ABD'ye özgü değildir; Kanada ve birçok Karayip ülkesiyle (NANP) paylaşılır. Bu nedenle kural, numarayı ABD kanıtı olarak değil *"teyit edilecek gösterge"* olarak ele alır. ABD yönetmeliği "tek telefon olsun olmasın" ABD numarasını gösterge sayar [K4]; IGA'da ise (Annex I, II.B.4(b)/(d)) yalnızca telefon ABD ise ya da ABD dışı numara da varsa farklı belge yolu tanımlanmıştır [K1] — kuralın Yüksek/Orta ayrımı bu farkı yansıtır.

## 2. CRS kuralları (öz beyan makullük testi)

Dayanak: OECD CRS Yorumu, IV. Bölüm (Yeni Bireysel Hesaplar), **"Reasonableness of self-certifications", par. 22-25** [K5]: Hesap açılışında FI, öz beyanı hesap açılışında elde ettiği bilgiler ve AML/KYC belgeleri ışığında **"incorrect or unreliable olduğunu bilmiyor veya bilmesi gerekmiyorsa"** makul sayar. Resmî örnekler: (1) öz beyandaki adres ülkesi AML/KYC belgesindekiyle çelişirse; (2) öz beyandaki adres, mukim olunduğu iddia edilen ülkede değilse → **makullük testi başarısız**; bu durumda ya geçerli yeni öz beyan ya da *makul açıklama + belge* (öğrenci, öğretmen/stajyer, diplomat/konsolosluk personeli, sınır işçisi/şoför vb.) alınmalıdır [K5]. FI'dan vergi mevzuatının bağımsız hukuki analizi beklenmez [K5].

| ID | Kural | Açıklama | Kullanılan alanlar | Önem | Önerilen analist aksiyonu | Kaynak |
|---|---|---|---|---|---|---|
| C01 | Vergi mukimliği beyanı yok | Hiçbir vergi mukimliği ülkesi beyan edilmemiş; öz beyan eksik/kullanılamaz. | `mukimlik_ulke_1..3` | Yüksek | Öz beyan formunu yeniden alın; alınamazsa kurum prosedürüne göre belgesiz hesap sürecini başlatın. | K5 |
| C02 | Geçersiz / tanınmayan ülke kodu | Ülke alanı ISO 3166 kodu (veya bilinen ülke adı) olarak tanınmadı. | `mukimlik_ulke_1..3`, `vatandaslik`, `ikamet_adresi_ulke`, `posta_adresi_ulke`, `dogum_ulkesi` | Orta | Kayıt hatasını düzeltin (ISO-2 kod kullanın); doğru ülke teyit edilmeden makullük sonucu güvenilmez. | K5 |
| C03 | İkamet adresi ülkesi beyan edilen mukimlik ülkeleri arasında yok | OECD CRS Yorumu IV. Bölüm 24. paragraf Örnek 2: adres, mukim olunduğu iddia edilen ülkede değilse öz beyan makullük testinde başarısızdır. | `ikamet_adresi_ulke`, `mukimlik_ulke_1..3` | Yüksek | Makul açıklama + belge alın (öğrenci, diplomat, sınır işçisi vb.) veya geçerli yeni öz beyan alın; açıklamayı kayda geçirin. | K5 |
| C04 | Posta adresi ülkesi beyan edilen mukimlik ülkeleri arasında yok | Posta adresi ülkesi, beyan edilen mukimlik ülkelerinden hiçbiri değil. | `posta_adresi_ulke`, `mukimlik_ulke_1..3` | Orta | Posta adresinin nedenini sorun; çoklu mukimlik ihtimalini değerlendirin; gerekirse öz beyanı güncelleyin. | K5 |
| C05 | İkamet adresi ülkesi boş | İkamet adresi ülkesi kayıtlı değil; adres-mukimlik karşılaştırması yapılamıyor. | `ikamet_adresi_ulke` | Orta | KYC kaydındaki adresi tamamlayın; sonra testi yeniden çalıştırın. | K5 |
| C06 | Telefon ülke kodu mukimlik ülkeleriyle uyuşmuyor | Tanınan telefon ülke kodlarının hiçbiri beyan edilen mukimlik ülkeleriyle örtüşmüyor (tek başına kanıt değildir). | `telefon_1..3`, `mukimlik_ulke_1..3` | Düşük | Başka göstergelerle birlikte değerlendirin; tek başına ise bilgi amaçlıdır. | K5 |
| C07 | Uyruk, mukimlik ülkeleriyle uyuşmuyor | Hiçbir uyruk, beyan edilen mukimlik ülkelerinden biri değil (yurtdışında mukim vatandaşlarda sık görülür). | `vatandaslik`, `mukimlik_ulke_1..3` | Düşük | Bilgi amaçlı; diğer kurallarla birlikte tetiklendiyse mukimlik gerekçesini sorun. | K5 |
| C08 | TIN eksik ve 'TIN yok' neden kodu da yok | Beyan edilen mukimlik ülkesi için vergi kimlik numarası yok ve A/B/C neden kodu verilmemiş. | `tin_n`, `tin_yok_nedeni_n` | Yüksek | TIN veya geçerli neden kodu (A/B/C) alın; makul çabayı (reasonable efforts) kayda geçirin. | K5, K7 |
| C09 | Geçersiz 'TIN yok' neden kodu | Neden kodu A, B veya C dışında bir değer. | `tin_yok_nedeni_n` | Orta | Kodu A/B/C'ye göre düzeltin; geçerli açıklama alın. | K7 |
| C10 | Neden A seçilmiş ama ülke TIN veriyor | Neden A = 'ülke mukimlerine TIN vermez'. TR, US, DE, NL, GB, FR, AZ, RU, UA TIN/işlevsel eşdeğer verir; beyan çelişkili. | `tin_yok_nedeni_n`, `mukimlik_ulke_n` | Yüksek | TIN'i (veya işlevsel eşdeğerini: ulusal kimlik no vb.) müşteriden isteyin; OECD AEOI portalındaki ülke sayfasını kontrol edin. | K7, K8 |
| C11 | Neden B seçilmiş ama açıklama yok | Neden B (TIN alınamıyor) için formda açıklama zorunludur; açıklama alanı boş. | `tin_yok_nedeni_n`, `tin_yok_aciklama` | Orta | Müşteriden TIN'i neden alamadığına dair yazılı açıklama alın. | K7 |
| C12 | Neden C seçilmiş ama ülke TIN toplanmasını gerektirebilir (sezgisel) | Neden C yalnızca ülke mevzuatı TIN toplanmasını gerektirmiyorsa seçilebilir. Bu kural sezgiseldir: TR, US, DE, NL, GB, FR, AZ, RU, UA için tetiklenir. | `tin_yok_nedeni_n`, `mukimlik_ulke_n` | Orta | OECD AEOI portalında ilgili ülkenin TIN toplama zorunluluğunu kontrol edin; gerekirse TIN isteyin. | K7, K8 |
| C13 | TIN biçimi/sağlama (checksum) hatalı | Ülkeye özgü biçim veya kontrol hanesi hatalı (TR TCKN/VKN, US SSN/ITIN/EIN, DE, NL, GB, FR, AZ, RU, UA; diğer ülkelerde genel uzunluk/karakter kontrolü). | `tin_n`, `mukimlik_ulke_n` | Orta | Müşteriden belge (vergi levhası/ kimlik/ vergi bildirimi) ile numarayı doğrulatın; yazım hatasını düzeltin. | K8, K9 |
| C14 | Yer tutucu / sahte görünümlü TIN | TIN '000000000', '123456789', tek rakam tekrarı veya 'YOK/N/A' gibi yer tutucu değer. | `tin_n` | Orta | Gerçek TIN'i alın veya geçerli neden kodunu kullanın. | K8 |
| C15 | Aynı TIN birden fazla ülke için girilmiş | Aynı numara farklı mukimlik ülkeleri için kullanılmış. | `tin_1..3`, `mukimlik_ulke_1..3` | Orta | Her ülke için ayrı TIN alın; kopyalama hatası olup olmadığını kontrol edin. | K8 |
| C16 | Çoklu vergi mukimliği | İki veya daha fazla vergi mukimliği ülkesi beyan edilmiş. | `mukimlik_ulke_1..3` | Düşük | Bilgi amaçlı: her mukimlik ülkesi için raporlama ve TIN eksiksizliğini doğrulayın. | K5 |
| C17 | OECD CBI/RBI yüksek riskli yargı alanında mukimlik | Beyan edilen mukimlik, OECD'nin potansiyel yüksek riskli CBI/RBI listesindeki yargı alanlarından biri (Panama için yalnızca belirli izin kartları risklidir: Düşük). | `mukimlik_ulke_1..3` | Orta | OECD'nin önerdiği ek soruları sorun: CBI/RBI ile mi edinildi, başka ülkede oturum hakkı, başka ülkede 90 günden fazla kalış, hangi ülkede vergi beyannamesi verildi. | K6 |
| C18 | CBI/RBI mukimliği + adres başka ülkede | Mukimlik yalnızca CBI/RBI listesindeki bir yargı alanında beyan edilmiş, ikamet/posta adresi başka ülkede: OECD'nin tarif ettiği kötüye kullanım göstergesi. | `mukimlik_ulke_1..3`, `ikamet_adresi_ulke`, `posta_adresi_ulke` | Yüksek | Öz beyana güvenmeden önce ek doğrulama yapın (vergi beyannamesi verilen ülke, gün sayısı); gerekirse yeni öz beyan ve belge alın. | K5, K6 |
| C19 | Öz beyan tarihi eksik / geçersiz / ileri tarihli | Öz beyan tarihi boş, okunamadı veya bugünden sonra. | `ozbeyan_tarihi` | Orta | Öz beyan belgesini bulun veya yeniden alın; tarih kaydını düzeltin. | K5 |
| C20 | TIN/neden kodu var ama mukimlik ülkesi yok | Bir satırda TIN veya neden kodu dolu, ancak ilgili ülke boş. | `mukimlik_ulke_n`, `tin_n`, `tin_yok_nedeni_n` | Orta | Eksik ülke bilgisini tamamlayın (veri girişi hatası olabilir). | K5 |

### 2.1 "TIN yok" neden kodları (A / B / C)

OECD örnek öz beyan formuna göre [K7]:

| Kod | Anlamı (OECD formu) | Araçtaki kontrol |
|---|---|---|
| **A** | Mukimlik ülkesi mukimlerine TIN **vermiyor** | TIN veren ülkelerde (TR, US, DE, NL, GB, FR, AZ, RU, UA) A seçilmişse **C10 (Yüksek)** |
| **B** | Hesap sahibi TIN'i başka şekilde **alamıyor** (formda *neden* açıklanmalı) | Açıklama (`tin_yok_aciklama`) boşsa **C11 (Orta)** |
| **C** | **TIN gerekmiyor** (yalnızca ülke mevzuatı TIN toplanmasını gerektirmiyorsa seçilebilir) | Yukarıdaki ülkeler için **C12 (Orta, sezgisel)** |
| diğer | – | **C09 (Orta)** |

TIN de neden kodu da yoksa **C08 (Yüksek)**. TIN eksikliğinde FI'nın "makul çaba" (reasonable efforts) göstermesi beklenir [K5, Bölüm I Yorumu par. 28 – "reasonable efforts" tanımı]; makul çabanın kaydı analist sorumluluğundadır.

### 2.2 Ülke bazlı TIN biçim / kontrol hanesi kuralları (C13)

| Ülke | Kabul edilen biçim | Kontrol | Kaynak / güvence düzeyi |
|---|---|---|---|
| **TR** | 11 hane **TCKN** (ilk hane ≠ 0) veya 10 hane **VKN** | TCKN: d10 = ((d1+d3+d5+d7+d9)×7 − (d2+d4+d6+d8)) mod 10; d11 = (d1..d10 toplamı) mod 10. VKN: i=0..8 için t=(d[i]+(9−i)) mod 10; r=(t×2^(9−i)) mod 9 (t≠0 ve r=0 ise r=9); kontrol = (10 − Σr mod 10) mod 10 | Yapı (3 hane alfa grup kodu + 6 hane sıra + 1 kontrol; 11 haneli ulusal kimlik no TIN yerine kullanılır): OECD Türkiye TIN formu [K8]. **Sağlama algoritmaları kamuya açık ve bu çalışmada bilinen örnek numaralarla sınanmıştır; resmî GİB/NVİ belgesi olarak doğrulanmamıştır.** Resmî teyit: GİB "VKN doğrulama" [K10] |
| **US** | SSN `xxx-xx-xxxx`, ITIN `9xx-xx-xxxx`, EIN `xx-xxxxxxx` | SSN: alan ≠ 000/666, grup ≠ 00, seri ≠ 0000. ITIN: 9 ile başlar, grup 50-65, 70-88, 90-92, 94-99. EIN: yalnızca biçim (ön ek geçerliliği denetlenmez) | Biçimler: OECD ABD TIN formu [K8]; ITIN grup aralıkları ve SSN ayrıksı değerleri IRS/SSA'nın kamuya açık kuralları (bu çalışmada ayrıca web'den doğrulanmadı) |
| **DE** | 11 hane (IdNr) | İlk hane ≠ 0; ilk 10 hanede tam bir rakam 2-3 kez, ardışık 3 aynı rakam yok; ISO 7064 MOD 11,10 kontrol hanesi | "11 hane = 10 + 1 kontrol hanesi": OECD Almanya formu [K8]; ayrıntılı algoritma BZSt'nin kamuya açık tarifidir, örnek numaralarla sınanmıştır, OECD formunda yer almaz |
| **NL** | 9 hane (BSN) | (N1×9+…+N8×2) mod 11 = N9 (kalan 10 ise geçersiz) | Algoritma doğrudan OECD Hollanda formunda [K8] |
| **GB** | UTR 10 hane **veya** NINO `LL999999L` | NINO: son harf A-D; ilk harf D,F,I,Q,U,V olamaz; ikinci harf D,F,I,O,Q,U,V olamaz; BG, GB, KN, NK, NT, TN, ZZ ön ekleri atanmaz | Biçimler: OECD İngiltere formu [K8]; harf kısıtları HMRC kuralları (bu çalışmada ayrıca doğrulanmadı) |
| **FR** | 13 hane (SPI), ilk hane 0-3 | Yalnız biçim | OECD Fransa formu [K8] |
| **AZ** | 10 hane VÖEN (son hane 1 = tüzel, 2 = gerçek) **veya** 7 karakter PIN/FİN (harf+rakam, "O" harfi yok) | Yalnız biçim | OECD Azerbaycan formu [K8] |
| **RU** | 10 hane (tüzel) / 12 hane (gerçek kişi) INN | İki kontrol hanesi algoritması (ağırlıklı mod 11) | Yapı: OECD Rusya formu [K8]; algoritma kamuya açık, örneklerle sınanmıştır |
| **UA** | 10 hane RNOKPP; 8 hane EDRPOU (yalnız uzunluk) | RNOKPP: ağırlıklar −1,5,7,9,4,6,10,5,7; kontrol = (Σ mod 11) mod 10 | Yapı: OECD Ukrayna formu [K8]; algoritma kamuya açık, örnek numarayla sınanmıştır |
| Diğerleri | 4-20 harf/rakam | Yalnız genel uzunluk/karakter | Ülke formatı bilinmiyorsa ağır kontrol yapılmaz; OECD AEOI portalına bakın [K8] |

Önemli: Bu kontroller **yalnızca yazım/biçim hatasını** yakalar; numaranın gerçekten o kişiye ait olduğunu veya vergi idaresinde kayıtlı olduğunu **doğrulamaz**.

### 2.3 OECD CBI/RBI "potansiyel yüksek riskli" yargı alanları (C17/C18)

OECD, kişisel gelir vergisi oranının **%10'un altında** (yurtdışı finansal varlıklar için) olduğu ve **yılda en az 90 gün fiziksel bulunma** şartı aramayan CBI/RBI şemalarını potansiyel yüksek riskli sayar; FI'lar CRS öz beyanına güvenip güvenemeyeceğini değerlendirirken bu analizi dikkate almalıdır ve şu soruları sorabilir: *CBI/RBI ile mi edindiniz? Başka ülkede oturum hakkınız var mı? Önceki yıl başka bir ülkede 90 günden fazla kaldınız mı? Hangi ülke(ler)de gelir vergisi beyannamesi verdiniz?* [K6].

Araçtaki varsayılan liste (OECD sayfasına gömülü tablo, sürüm 2; 27.11.2026'da alındı) [K6]:

| Yargı alanı (ISO-2) | OECD tablosundaki şemalar |
|---|---|
| Antigua ve Barbuda (AG) | Citizenship by Investment; Permanent Residence Certificate |
| Bahamalar (BS) | Economic Permanent Residency |
| Bahreyn (BH) | Residence by Investment |
| Barbados (BB) | Special Entry and Residence Permit |
| Kıbrıs (CY) | Citizenship by Investment (Scheme for Naturalisation of Investors in Cyprus by Exception); Residence by Investment |
| Dominika (DM) | Citizenship by Investment |
| Grenada (GD) | Citizenship by Investment |
| Saint Kitts ve Nevis (KN) | Citizenship by Investment |
| Saint Lucia (LC) | Citizenship by Investment |
| Seyşeller (SC) | Type 1 Investor Visa |
| Turks ve Caicos (TC) | 3 farklı Permanent Residence Certificate programı |
| Birleşik Arap Emirlikleri (AE) | Residence by Investment |
| Vanuatu (VU) | Development Support Programme; Self-Funded Visa; Land-Owner Visa; Investor Visa |
| Panama (PA) – *kısmi* | Yalnızca ID kartında "PRP-FOR", "PRP-SEP", "PRP-PA" referans kodu bulunan izinler (OECD sayfasındaki ayrı tablo) → araçta **Düşük** |

**Uyarılar:** (1) Liste OECD tarafından **sürekli güncellenir**; kullanmadan önce OECD sayfasını kontrol edin. İsterseniz aynı klasöre `cbi_rbi_listesi.txt` (her satıra bir ISO-2 kod, `#` yorum) koyarak listeyi değiştirebilirsiniz. (2) Bazı ikincil kaynaklar OECD tablosunun daha dar olduğunu (yalnızca 5 Doğu Karayip ülkesinin vatandaşlık programları + Vanuatu) yazıyor; resmî sayfaya gömülü tablo ise yukarıdaki geniş içeriği veriyor — çelişki varsa **OECD sayfası esas alınmalıdır**. (3) BAE ve Kıbrıs, Türkiye'deki müşteri tabanında yaygındır; C17 bu yüzden çok sayıda satırı işaretleyebilir (Orta). Hesap sahibinin gerçekten BAE/Kıbrıs'ta yaşadığını gösteren belge/adres varsa analist kapatabilir. (4) Liste şemaları yargı alanı düzeyinde işaretler; OECD'ye göre asıl riskli olan, belgenin ilgili CBI/RBI şeması kapsamında verilmiş olmasıdır.

### 2.4 Telefon ülke kodu ve ülke adı normalizasyonu

* Telefon: `+`/`00` önekli numaralar uluslararası okunur; `05xx…` veya 10 haneli `5xx…` numaralar **TR (+90)** varsayılır; tanınmayan biçimler yok sayılır (kural tetiklenmez).
* Ülke alanları ISO-2 (TR), ISO-3 (TUR) veya yaygın Türkçe/İngilizce adlarla (Türkiye, ABD, Almanya …) girilebilir; tanınmayanlar **C02** üretir. `UK` → `GB` kabul edilir.

## 3. Önerilen genel aksiyon sırası

1. **Yüksek:** Müşteriyi arayın/yazın; öz beyanı ve belgeleri yenileyin; politika süresi içinde sonuç alınamazsa uyum yöneticisine eskale edin (belgesiz hesap / raporlama kararı sizde değil, kurum sürecindedir).
2. **Orta:** Kayıt doğruluğunu (adres, TIN, kod) KYC kaynağında kontrol edin; gerekirse müşteriden teyit alın.
3. **Düşük:** Bilgi amaçlı; diğer göstergelerle birlikte değerlendirin.

## 4. Kaynaklar ve doğrulama durumu

Aşağıdaki bağlantılar **27.11.2026'da** kontrol edildi. "Açıldı" = içerik erişilip okundu; diğer durumlar ayrıca belirtildi.

| Kod | Kaynak | Durum |
|---|---|---|
| K1 | ABD–Türkiye FATCA Model 1 IGA (imza 29.07.2015): <https://home.treasury.gov/system/files/131/FATCA-Agreement-Turkey-7-29-2015.pdf> | Açıldı; Annex I, II.B(1) ve çürütme belgeleri metni okundu |
| K2 | U.S. Treasury – FATCA anlaşmaları sayfası (Türkiye: Model 1, "In Force 6-14-2021"): <https://home.treasury.gov/policy-issues/tax-policy/foreign-account-tax-compliance-act> | Açıldı |
| K3 | IRS – FATCA governments (Model 1 IGA açıklaması): <https://www.irs.gov/businesses/corporations/fatca-governments> | Açıldı |
| K4 | 26 CFR §1.1471-4 (FFI agreement; (c)(5)(iv)(B)(1) ABD göstergeleri): <https://www.law.cornell.edu/cfr/text/26/1.1471-4> · eCFR: <https://www.ecfr.gov/current/title-26/chapter-I/subchapter-A/part-1/subject-group-ECFR88a2d1b64bcecd8/section-1.1471-4> | Cornell LII açıldı ve madde metni okundu; eCFR bağlantısı HTTP 200 verdi (içerik okunmadı) |
| K5 | OECD, *Standard for Automatic Exchange of Financial Account Information in Tax Matters, 2nd ed.* (CRS + Yorumlar): <https://www.oecd.org/content/dam/oecd/en/publications/reports/2017/03/standard-for-automatic-exchange-of-financial-account-information-in-tax-matters-second-edition_g1g73eb6/9789264267992-en.pdf> | PDF açıldı; IV. Bölüm Yorumu par. 22-25, III. Bölüm B(2) göstergeleri okundu. *Not:* 2017 baskısıdır. OECD'nin CRS'i sonradan değiştirdiği (2023 "CRS 2.0" çalışması) bilinmektedir; bu çalışmada ayrıca doğrulanmadı — araç 2017 metnine göre yazıldı, güncel konsolide metni kontrol edin. |
| K6 | OECD – Residence/Citizenship by investment schemes: <https://www.oecd.org/en/topics/sub-issues/international-standards-on-tax-transparency/residence-citizenship-by-investment.html> · tablo verisi: <https://datawrapper.dwcdn.net/nPm3m/2/dataset.csv> | OECD sayfası bu çalışmada kullanılan sunucudan doğrudan açılamadı (HTTP 403); sayfa metni 17.11.2026 tarihli Internet Archive kopyasından, tablo ise OECD sayfasına gömülü Datawrapper veri dosyasından okundu |
| K7 | OECD örnek bireysel öz beyan formu (Neden A/B/C): <https://www.oecd.org/content/dam/oecd/en/topics/policy-issue-focus/aeoi/crs_individual_self-cert_form.pdf> | Açıldı |
| K8 | OECD AEOI portalı – TIN bilgi formları. Ülke PDF'leri: [TR](https://www.oecd.org/content/dam/oecd/en/topics/policy-issue-focus/aeoi/turkiye-tin.pdf), [DE](https://www.oecd.org/content/dam/oecd/en/topics/policy-issue-focus/aeoi/germany-tin.pdf), [NL](https://www.oecd.org/content/dam/oecd/en/topics/policy-issue-focus/aeoi/netherlands-tin.pdf), [FR](https://www.oecd.org/content/dam/oecd/en/topics/policy-issue-focus/aeoi/france-tin.pdf), [US](https://www.oecd.org/content/dam/oecd/en/topics/policy-issue-focus/aeoi/united-states-tin.pdf), [AZ](https://www.oecd.org/content/dam/oecd/en/topics/policy-issue-focus/aeoi/azerbaijan-tin.pdf), [RU](https://www.oecd.org/content/dam/oecd/en/topics/policy-issue-focus/aeoi/russia-tin.pdf), [UA](https://www.oecd.org/content/dam/oecd/en/topics/policy-issue-focus/aeoi/ukraine-tin.pdf), [GB](https://www.oecd.org/content/dam/oecd/en/topics/policy-issue-focus/aeoi/uk-tin.pdf). Portal: <https://www.oecd.org/en/networks/global-forum-tax-transparency/resources/aeoi-implementation-portal/tax-identification-numbers.html> | Ülke PDF'leri açıldı ve "TIN Structure" bölümleri okundu; portal ana sayfası bu sunucudan HTTP 403 verdi (içeriği arama sonucunda görüldü) |
| K9 | GİB – *Finansal Hesap Bilgilerinin Vergi Amaçlı Otomatik Değişimi Rehberi*: <https://cdn.gib.gov.tr/api/gibportal-file/file/getFileResources?objectKey=arsiv%2Fmevzuat%2Fuluslararasi_mevzuat%2Ffinansalrehber2023.pdf> · GİB FATCA SSS: <https://cdn.gib.gov.tr/api/gibportal-file/file/getFileResources?objectKey=arsiv%2Fmevzuat%2Fuluslararasi_mevzuat%2FBilgi_Degisimi%2Ffatcasorular.pdf> | **PDF'ler doğrudan açılamadı** (bu sunucudan bağlantı kurulamadı, web aracı 504 verdi). Bağlantılar ve içerik özeti (bildirimi GİB'e yapılır, GİB ilgili ülkeye iletir; paylaşılan veri: ad, adres, mukimlik ülkesi ve VKN, doğum yeri/tarihi, hesap no/bakiye, gelirler; hesap hareket detayı paylaşılmaz) yalnızca web arama sonucundan teyit edildi. **Kendi bilgisayarınızda bağlantıyı açıp kontrol edin.** |
| K10 | GİB – Vergi Kimlik Numarası Doğrulama (e-Devlet): <https://turkiye.gov.tr/gib-intvrg-vergi-kimlik-numarasi-dogrulama> | Bağlantı HTTP 200 verdi; sayfa içeriği/oturum gereksinimi incelenmedi |

## 5. Varsayımlar ve sınırlar (özet)

* Kurallar **2017 OECD CRS metni** ve IGA Annex I'in **bireysel hesap** hükümlerine göre kodlanmıştır; Türkiye'nin iç mevzuatındaki (GİB tebliğ/rehberleri) ayrıntılar ve kurumunuzun iç politikası ayrıca kontrol edilmelidir.
* IGA'daki **hesap bakiyesi eşikleri** (Lower/High Value), **yeni vs. mevcut hesap** ayrımı ve **"değişen koşul" (change in circumstances)** mantığı kodlanmamıştır; araç tüm satırlara aynı kuralları uygular.
* CRS'in "mukimlik göstergeleri" (Bölüm III.B(2): mukimlik, adres, telefon, düzenli talimat, vekil, hold-mail) yalnızca öz beyanın **makullük** kontrolünde kullanılan alanlar kadarıyla ele alınmıştır; mevcut hesapların gösterge-tabanlı incelemesinin tam karşılığı değildir.
* Ülke → "mukimlik ülkesi katılımcı/raporlanabilir mi?" kontrolü yoktur (araç çevrimdışıdır, katılımcı listesi gömülü değildir).
* Tüzel müşteriler, kontrol eden kişiler ve çocuk/vasi hesapları kapsam dışıdır.
