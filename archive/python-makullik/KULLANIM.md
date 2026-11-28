# FATCA / CRS Öz Beyan Makullük Testi – Kullanım Kılavuzu

Bu klasör, müşteri öz beyanlarını **kendi bilgisayarınızda, internete bağlanmadan** tarayıp analistin bakması gereken kayıtları işaretleyen küçük bir araçtır.
Banka verisi dışarı çıkmaz: araç yalnızca Python'un yerleşik kütüphanelerini kullanır, hiçbir ağ çağrısı yapmaz, CSV'yi **satır satır** okur (1 milyon satırda bile birkaç on MB RAM; 8 GB'lık bilgisayarda sorun çıkarmaz).

> ⚠️ **Bu araç karar vermez.** "Makul mü?" sorusunda önce bakılacak satırları işaretler. Hukuki görüş değildir; nihai karar kurum politikasına ve uyum yöneticisine aittir. Kuralların gerekçesi ve resmî kaynaklar: [`kurallar.md`](kurallar.md).

## Klasördeki dosyalar

| Dosya | Ne işe yarar |
|---|---|
| `makullik_testi.py` | Asıl araç (Python 3, ek kurulum gerekmez) |
| `kurallar.md` | 31 kuralın tablosu: açıklama, kullanılan alanlar, önem, önerilen aksiyon, kaynaklar |
| `girdi_sablonu.csv` | Boş giriş şablonu (yalnızca başlıklar). Kendi verinizi bu başlıklarla hazırlayabilirsiniz |
| `ornek_veri.csv` | **ÖRNEK (tamamen hayali) veri**, 28 satır; her kuralı en az bir kez tetikler |
| `ornek_cikti.csv`, `ornek_cikti_ozet.txt` | `ornek_veri.csv` üzerinde çalıştırılmış sonuç |
| `esleme_ornek.txt` | Kendi kolon adlarınızı eşlemek için örnek dosya |

---

## 1) Python'u hazırlama (yalnızca ilk sefer)

### Seçenek A – Windows'ta Microsoft Store'dan Python

1. **Başlat** menüsüne `Microsoft Store` yazıp açın, arama kutusuna `Python 3.12` (veya daha yeni) yazın, **Python Software Foundation**'ın uygulamasını **Al/Yükle** ile kurun. (Kurumunuzda Store kapalıysa BT biriminden Python 3.8+ isteyin.)
2. **Başlat** menüsüne `PowerShell` yazıp açın.
3. Kurulumu kontrol edin (tek komut):

```
python --version
```

`Python 3.x.x` yazmalı. `python` bulunamazsa `py --version` deneyin; çalışıyorsa aşağıdaki komutlarda `python` yerine `py` yazın.

### Seçenek B – WSL (Ubuntu)

1. Başlat menüsünden **Ubuntu**'yu açın.
2. Kontrol (tek komut):

```
python3 --version
```

Aşağıdaki komutlarda `python` yerine `python3` yazın. Windows klasörlerinize WSL'den `/mnt/c/Users/KULLANICI/...` yoluyla erişirsiniz.

---

## 2) Klasöre girme

Aşağıdaki yolu kendi klasörünüzle değiştirin. **Her komutu ayrı ayrı yapıştırıp Enter'a basın.**

PowerShell:
```
cd C:\Users\KULLANICI\Belgeler\uyum\fatca-crs
```

WSL:
```
cd /mnt/c/Users/KULLANICI/Belgeler/uyum/fatca-crs
```

## 3) Önce aracı sınayın (örnek veri)

Birim kontrolleri (TCKN/VKN/SSN/DE/NL/GB/FR/AZ/RU/UA doğrulayıcıları ve bazı kurallar) – 12 test, "OK" yazmalı:

```
python makullik_testi.py --test
```

Örnek veriyle deneme çalıştırması:

```
python makullik_testi.py ornek_veri.csv ornek_cikti.csv
```

Ekranda şuna benzer bir satır görürsünüz: `Tamam. 28 satır işlendi | Yüksek: 14, Orta: 10, Düşük: 2 | kapsam dışı: 1, hata: 0`

## 4) Kendi verinizle çalıştırma

1. Verinizi **CSV** olarak dışa aktarın (Excel: *Farklı Kaydet → CSV UTF-8*; sistem çıktısı CP1254/Windows-1254 ise de sorun olmaz – araç UTF-8'i, olmazsa Windows-1254'ü otomatik dener; ayraç `;` `,` `|` veya sekme olabilir, otomatik bulunur).
2. Başlıkların aşağıdaki **standart kolon adlarıyla** aynı olması en kolay yoldur (`girdi_sablonu.csv`). Farklıysa 5. bölüme bakın.
3. Dosyayı bu klasöre koyun (örn. `girdi.csv`) ve çalıştırın:

```
python makullik_testi.py girdi.csv cikti.csv
```

Üretilen dosyalar:

* `cikti.csv` – UTF-8 **BOM'lu** (Excel Türkçe karakterleri doğru açar), ayraç **`;`** (Türkçe Excel'de çift tıkla sütunlara ayrılır). Sütunlar: `satir_no`, anahtar kolonlar (`musteri_no`, `ad_soyad`), `kategori` (FATCA/CRS), `kural_sayisi`, `tetiklenen_kurallar`, `en_yuksek_siddet`, `skor`, `gerekce`, `onerilen_aksiyon`.
* `cikti_ozet.txt` – kural ve önem başına sayılar, eşleşmeyen kolonlar.

İpuçları:

* Sonuçları skora göre sıralamak için Excel'de `skor` sütununu **büyükten küçüğe** sıralayın; `en_yuksek_siddet` sütununa filtre koyabilirsiniz.
* Çıktı dosyası Excel'de **açıksa** yazılamaz; önce kapatın.
* Çıktıya başka kolonlar kopyalamak için: `python makullik_testi.py girdi.csv cikti.csv --anahtar musteri_no,ad_soyad,vatandaslik` (yalnızca standart kolon adları kopyalanabilir; kendi kolon adlarınız için önce 5. bölümdeki eşlemeyi yapın).
* Excel'de virgül-ayraçlı çıktı isterseniz: `--cikti-ayrac ,`
* Test tarihini sabitlemek için (öz beyan tarihi ileri tarihli kontrolü): `--bugun 2026-11-27`
* İşiniz bitince çıktıları ve girdi kopyalarını kurum politikasına uygun şekilde silin; çıktı kişisel veri içerir (yalnızca anahtar kolonlar ve kural gerekçeleri, ama yine de).

## 5) Kendi kolon adlarınızı eşleme

Sisteminizin başlıkları standart adlardan farklıysa, `esleme_ornek.txt` dosyasını kopyalayıp düzenleyin (Not Defteri yeterli, **UTF-8** kaydedin). Her satır:

```
standart_kolon = SİZİN_KOLON_ADI
```

Örnek: `vatandaslik = Uyruk`. Büyük/küçük harf, Türkçe karakter, boşluk ve `_` farkı önemsizdir. Sonra eşleme dosyasını verin:

```
python makullik_testi.py girdi.csv cikti.csv --esleme esleme.txt
```

Araç ekranda **eşleşmeyen standart kolonları** uyarı olarak yazar. **Önemli:** Eşleşmeyen bir kolonun kuralları sessizce "veri yok" gibi davranır; örneğin `abd_degil_ozbeyan` ve `abd_olmama_belge` yoksa ABD göstergesi olan her satırda F11 tetiklenir; `tin_yok_nedeni_1` yoksa TIN'i boş her satır C08 olur. Bu yüzden uyarı listesini mutlaka okuyun.

Hiçbir standart kolon eşleşmezse araç "HATA: Hiçbir standart kolon eşleşmedi" der; ayraç/başlık kontrolü yapın (`--ayrac ;` ile ayracı zorlayabilirsiniz).

### Standart kolonlar

Boş bırakılabilir; boşsa ilgili kural çalışmaz (aksi belirtilmedikçe). Ülke alanları **ISO-2 kod** (TR, US, DE …), ISO-3 (TUR) veya yaygın ad (Türkiye, ABD, Almanya) olabilir. E/H alanları: `E`/`H` (Evet/Hayır, 1/0, true/false da kabul).

| Kolon | Açıklama |
|---|---|
| `musteri_no` | Müşteri numarası (çıktıya kopyalanır) |
| `ad_soyad` | Ad soyad (çıktıya kopyalanır) |
| `musteri_tipi` | `G` = gerçek kişi (varsayılan), `T`/`Tüzel`/`Kurum` = tüzel → **kapsam dışı** işaretlenir |
| `vatandaslik` | Uyruk(lar); birden fazlaysa `;` ile: `TR;US` |
| `dogum_ulkesi` | Doğum ülkesi |
| `ikamet_adresi_ulke` | İkamet adresi ülkesi |
| `posta_adresi_ulke` | Posta/yazışma adresi ülkesi (ABD posta kutusu dahil) |
| `tek_adres_care_of_hold_mail` | E/H: Kayıtlı tek adres in-care-of / posta tutma mı? |
| `telefon_1`, `telefon_2`, `telefon_3` | Telefonlar; `+90 5xx…`, `0090…`, `05xx…` biçimleri okunur |
| `mukimlik_ulke_1` / `tin_1` / `tin_yok_nedeni_1` | 1. vergi mukimliği ülkesi, TIN, TIN yoksa neden kodu (A/B/C) |
| `mukimlik_ulke_2` / `tin_2` / `tin_yok_nedeni_2` | 2. mukimlik (varsa) |
| `mukimlik_ulke_3` / `tin_3` / `tin_yok_nedeni_3` | 3. mukimlik (varsa) |
| `tin_yok_aciklama` | Neden B için müşterinin yazılı açıklaması (var/yok önemli) |
| `abd_hesabina_duzenli_talimat` | E/H: ABD'deki hesaba düzenli ödeme talimatı |
| `vekil_imza_yetkilisi_adres_ulke` | Vekil/imza yetkilisinin adres ülkesi (birden fazlaysa `;`) |
| `abd_degil_ozbeyan` | E/H: ABD vatandaşı/mukimi olmadığına dair öz beyan (W-8BEN vb.) var mı |
| `abd_olmama_belge` | E/H: ABD dışı statüyü gösteren belge (pasaport, CLN, ikamet belgesi…) var mı |
| `ozbeyan_tarihi` | `GG.AA.YYYY` veya `YYYY-AA-GG` |

Ek özellik: Aynı klasöre `cbi_rbi_listesi.txt` koyarsanız (her satıra bir ISO-2 kod, `#` yorum) OECD CBI/RBI listesi onunla değiştirilir (güncel liste için `kurallar.md` bölüm 2.3).

---

## 6) Sınırlamalar (lütfen okuyun)

1. **Karar aracı değildir**; yanlış-pozitif ve yanlış-negatif üretebilir. Kural yokluğu "sorun yok" demek değildir.
2. **Yalnızca gerçek kişi** hesapları; tüzel müşteriler/Controlling Person/çocuk-vasi hesapları test edilmez.
3. **Bakiye eşikleri, yeni/mevcut hesap ayrımı, değişen koşul** mantığı yoktur; her satıra aynı kurallar uygulanır.
4. **TIN kontrolleri yalnızca biçim/kontrol hanesidir**; numaranın o kişiye ait olduğunu veya kayıtlı olduğunu doğrulamaz. TCKN/VKN/DE/RU/UA algoritmaları kamuya açık tariflere göre yazıldı ve bilinen örneklerle sınandı; resmî GİB/NVİ/BZSt belgesiyle ayrıca doğrulanmadı. US EIN ön ek geçerliliği, UK UTR kontrol hanesi, FR/AZ kontrol hanesi denetlenmez.
5. **Telefon kodu:** `+1` ABD'ye özgü değildir (Kanada/Karayipler). `05xx`/`5xx` numaralar TR varsayılır. Tanınmayan numaralar yok sayılır.
6. **CBI/RBI listesi** OECD'nin 27.11.2026'da okunan tablosuna dayanır ve değişebilir; BAE/Kıbrıs gibi yaygın ülkelerde çok sayıda satır işaretlenebilir.
7. **Neden C kuralı (C12) sezgiseldir**; hangi ülkenin TIN toplanmasını zorunlu kıldığı OECD AEOI portalından ayrıca kontrol edilmelidir.
8. **Kural metinleri 2017 OECD CRS metni ve IGA Annex I'e göre** yazıldı; sonraki OECD güncellemeleri ve Türkiye'ye özgü GİB tebliğ/rehber ayrıntıları kodlanmadı. GİB rehberinin PDF'si bu çalışmada doğrudan açılamadığı için (bkz. `kurallar.md` K9) kendi bilgisayarınızda ayrıca kontrol edin.
9. Ülke alanları için ISO-3166 listesi gömülüdür; tanınmayan değerler `C02` üretir. Ülke katılımcı/raporlanabilir mi kontrolü yoktur.
10. Çıktıya yalnızca eşlenebilmiş standart kolonlar kopyalanır (`--anahtar`); eşleşmeyen anahtar kolon çıktıda yer almaz. Hücre başı `=`, `+`, `@` ile başlayan metinlere Excel formül enjeksiyonuna karşı başına `'` eklenir.
11. Performans: örnek ölçüm (Linux, tek çekirdek) ≈ 17.000 satır/sn, ≈ 12 MB RAM (1 milyon satır ≈ 1 dakika).

## 7) Sorun giderme

| Mesaj / durum | Çözüm |
|---|---|
| `python` tanınmıyor | `py` veya `python3` deneyin; Store'dan Python'u kurun, PowerShell'i kapatıp açın |
| `HATA: Girdi dosyası bulunamadı` | `cd` ile doğru klasörde olduğunuzu kontrol edin; dosya adını tırnak içinde yazın: `"girdi dosyam.csv"` |
| Türkçe karakterler bozuk | Çıktıyı **çift tıklayarak** açın (BOM var); girdiyi UTF-8 veya Windows-1254 kaydedin |
| Çıktı tek sütunda görünüyor | Excel'de *Veri → Metin/CSV'den* ile ayraç olarak noktalı virgül seçin veya `--cikti-ayrac ,` kullanın |
| `HATA: Dosyaya yazılamadı` | Çıktı dosyası Excel'de açık; kapatın |
| Her satırda F11 / C08 çıkıyor | İlgili kolonlar eşleşmemiştir; ekrandaki UYARI satırına bakın |
