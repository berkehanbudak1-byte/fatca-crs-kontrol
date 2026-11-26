# FATCA-CRS Müşteri Kontrolü

Tek dosyalık (statik), çevrimdışı çalışan bir ön kontrol aracı. Bir müşterinin FATCA ve CRS beyanını girersiniz; araç **MAKUL**, **MANUEL İNCELEME GEREKİYOR** ya da **MAKUL DEĞİL** sonucunu verir ve hangi belgelerin istenmesi gerektiğini listeler.

**Verilerin hiçbir yere gönderilmez.** Mantık tarayıcıda çalışır; form sunucuya post edilmez.

> **Önemli:** Bu araç bir ön kontroldür, hukuki / vergi / uyum kararı veya tavsiyesi değildir. Sonucu uyum, hukuk ya da vergi uzmanınızın değerlendirmesi yerine koymayın. Kendi kurumunuzun ülke listesi, yasa ve düzenlemeleri esas alınmalıdır.

## Yerel açma

**Dosya olarak:** `FATCA-CRS-Kontrol.html` dosyasını tarayıcıda açın.  
(`file://` ile açılırsa `data/crs-partners.json` yüklenemez; yerleşik 2023 yedek liste kullanılır.)

**Statik sunucu (önerilen):**

```bash
python3 -m http.server 4123
# veya: npm start
```

Ardından <http://127.0.0.1:4123/> (veya `/FATCA-CRS-Kontrol.html`) adresini açın.

## Statik barındırma

Herhangi bir statik host yeterlidir (GitHub Pages, Netlify, nginx, S3, Cursor publish vb.):

1. Depoyu olduğu gibi yayınlayın (`index.html` ana sayfaya yönlendirir).
2. `FATCA-CRS-Kontrol.html` ve `data/crs-partners.json` aynı origin altında kalsın.
3. HTTPS önerilir; uygulama yine de istemci tarafında çalışır ve form verisi göndermez.

## Kullanım

1. Müşteri bilgilerini girin: ad soyad, hesap türü, doğum tarihi, beyan tarihi, imza durumu.
2. Vergi ikametgâhı ve TIN bilgilerini girin. TIN yoksa neden kodunu (A, B, C) seçin.
3. Adres, KYC ülkesi ve ABD bağlantılarını işaretleyin.
4. **Kontrol et** düğmesine basın.

## Ülke listesini güncelleme

`data/crs-partners.json` dosyasını düzenleyin:

- `countries`: ISO 3166-1 alpha-2 kodları
- `meta.as_of`: liste tarihi (`YYYY-MM` veya benzeri)
- `meta.needs_refresh`: güncel ise `false` yapın
- `meta.source`: kaynağı not edin

Güncel resmi kaynaklar:

- GİB bildirim yapılan ülke listesi / rehber
- [OECD Automatic Exchange Portal — exchange relationships](https://www.oecd.org/tax/automatic-exchange/international-framework-for-the-crs/exchange-relationships/)

> OECD “katılımcı ülke” taahhüdü tek başına raporlanabilirlik demek değildir; kurumun yerel listesi ve aktif değişim anlaşması esas alınır. Bu depodaki 2023 GİB Ek 2 listesi **yenilenmelidir** (`needs_refresh: true`).

## Ne kontrol ediyor

**CRS (OECD)**
- Tamlık: ad, doğum tarihi, imza, beyan tarihi, adres ülkesi, vergi ikametgâhı listesi.
- Tutarlılık: adres ile vergi ikametgâhı, KYC ülkesi ile ikametgâh, TIN ile neden kodunun birlikte girilmemesi.
- TIN: Bu genel sürümde ülke TIN format kuralları yoktur. Tüm TIN'ler elle doğrulanır.
- Neden kodu A: tabloda formatı olan bir ülke için OECD AEOI TIN sayfasından doğrulama (genel sürümde tablo boş).
- CBI/RBI: 13 yüksek riskli ülkeden biri ikametgâh, adres ya da vergi ikametgâhında varsa ek due diligence.
- CRS göstergeleri: telefon ülke kodu ve kurumun ülkesi dışında adres.
- Raporlanabilir ülke (R9): `data/crs-partners.json` veya yerleşik 2023 yedek.

**FATCA (IRS)**
- ABD vatandaşlığı / ikametgâhı, doğum yeri, adres, telefon (+1), sabit ödeme, vekil, care-of.
- ABD kişi testi: yeşil kart ya da cari yılda 183+ gün.
- ABD göstergesi varken ABD kişisi beyan edilmemişse hata / uyarı.

## Kardeş depolardan birleştirilenler

Kanonik ürün bu depodur. İncelenen yakın kopyalar:

| Depo | Not |
|------|-----|
| `fatca-crs-kontrol-tool` | Aynı HTML + üçüncü taraf TIN tablosu; genel sürüme TIN kodu alınmadı (lisans belirsizliği). |
| `crs-beyan-kontrol` | Modüler CRS doğrulayıcı / metodoloji; kurallar buradaki motorla hizalı. |
| `fatca-crs-makululuk` | Ayrı FATCA doğrulayıcı; F1–F9 zaten bu araçta. |
| `makululuk-tool` | Excel ön kontrol; web UI’ye taşınacak ek kural yoktu. |

## Kaynaklar

- OECD CRS konsolide metni ve CRS SSS
- IRS, 26 CFR 1.1471-4 (FATCA)
- GİB, "Finansal Hesap Bilgilerinin Vergi Amaçlı Otomatik Değişimi" rehberi, Yayın 485 (2023), Ek 2
- BNZ, "Reasonableness Test Guide"
- ADGM, "Guidance on Validity and Reasonableness Checks for Self-Certification Forms"
- Telefon ülke kodları: ITU-T E.164 (derlenmiş tablo, doğrulanmalı)

## Sınırlar

- Format ve tutarlılık ön kontrolüdür; TIN sahipliği, belge gerçekliği veya neden kodu A doğruluğu kanıtlanmaz.
- Ortak / raporlanabilir ülke listesi 2023 yedeğidir ve güncellenmelidir.
- Sonuç her zaman uzman onayı ister; yüksek değerli hesaplarda ilişki yöneticisi bilgisi de değerlendirilmelidir.
- FATCA kuralları IRS metninin özetine dayanır.
- Çift ikametgâh için her ülkeye ayrı TIN alanı yoktur; tek TIN girilir.

## Lisans

MIT. Ayrıntı için [LICENSE](LICENSE).
