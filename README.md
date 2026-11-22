# FATCA-CRS Müşteri Kontrolü

Tek dosyalık, çevrimdışı çalışan bir ön kontrol aracı. Bir müşterinin FATCA ve CRS beyanını girersiniz; araç **MAKUL**, **MANUEL İNCELEME GEREKİYOR** ya da **MAKUL DEĞİL** sonucunu verir ve hangi belgelerin istenmesi gerektiğini listeler.

**Verilerin hiçbir yere gönderilmez.** Araç tek bir HTML dosyasıdır; tarayıcıda açmanız yeterli.

> **Önemli:** Bu araç bir ön kontroldür, hukuki karar değildir. Sonucu uyum, hukuk ya da vergi uzmanınızın değerlendirmesi yerine koymayın. Kendi kurumunuzun ülke listesi, yasa ve düzenlemeleri esas alınmalıdır.

## Kullanım

1. `FATCA-CRS-Kontrol.html` dosyasını tarayıcıda açın.
2. Müşteri bilgilerini girin: ad soyad, hesap türü, doğum tarihi, beyan tarihi, imza durumu.
3. Vergi ikametgâhı ve TIN bilgilerini girin. TIN yoksa neden kodunu (A, B, C) seçin.
4. Adres, KYC ülkesi ve ABD bağlantılarını işaretleyin.
5. **Kontrol et** düğmesine basın.

## Ne kontrol ediyor

**CRS (OECD)**
- Tamlık: ad, doğum tarihi, imza, beyan tarihi, adres ülkesi, vergi ikametgâhı listesi.
- Tutarlılık: adres ile vergi ikametgâhı, KYC ülkesi ile ikametgâh, TIN ile neden kodunun birlikte girilmemesi.
- TIN: Bu genel sürümde ülke TIN format kuralları yoktur. Tüm TIN'ler elle doğrulanır.
- Neden kodu A: TIN formatı tabloda olan bir ülke için OECD AEOI TIN sayfasından doğrulama.
- CBI/RBI: 13 yüksek riskli ülkeden biri ikametgâh, adres ya da vergi ikametgâhında varsa ek due diligence.
- CRS göstergeleri: telefon ülke kodu (beyan edilen ikametgâhta değilse) ve kurumun ülkesi dışında adres.
- Raporlanabilir ülke: vergi ikametgâhı ülkesi, Türkiye'nin CRS ortak listesinde mi (GİB Yayın 485, 2023, Ek 2).

**FATCA (IRS)**
- ABD vatandaşlığı ya da ikametgâhı, ABD doğum yeri, ABD adresi, ABD telefonu (+1), sabit ödeme talimatı, ABD adresli vekil, care-of adres.
- ABD kişi testi: yeşil kart ya da cari yılda 183+ gün.
- ABD göstergesi varsa ve ABD kişisi beyan edilmediyse hata.

## Kaynaklar

- OECD CRS konsolide metni (2025) ve CRS SSS (Aralık 2025)
- IRS, 26 CFR 1.1471-4 (FATCA)
- GİB, "Finansal Hesap Bilgilerinin Vergi Amaçlı Otomatik Değişimi" rehberi, Yayın 485 (2023), Ek 2
- BNZ, "Reasonableness Test Guide"
- ADGM, "Guidance on Validity and Reasonableness Checks for Self-Certification Forms"
- Telefon ülke kodları: ITU-T E.164 (derlenmiş tablo, doğrulanmalı).

## Sınırlar

- Tamamen format ve tutarlılık kontrolü yapar. TIN'in müşteriye ait olduğunu, kimlik belgesinin gerçekliğini, neden kodu A'nın doğruluğunu doğrulayamaz; bunlar manuel maddedir.
- Ortak ülke listesi 2023 tarihlidir ve güncel değildir. Güncel liste için OECD Automatic Exchange Portal'da Türkiye'yi seçerek kontrol edin.
- Sonuç her zaman bir uzman tarafından onaylanmalıdır. Yüksek değerli hesaplarda ilişki yöneticisinin durumu da değerlendirilmelidir.
- Yerel kurum listeleri ve değişim anlaşmalarının aktivasyonu kurumdan kuruma değişir.
- FATCA kuralları IRS'in tam metninin özetine dayanır; belge ve cure ayrıntıları uzman tarafından doğrulanmalıdır.
- Çift ikametgâh için her ülkeye ayrı TIN alanı yoktur; tek TIN girilir.

## Lisans

MIT. Ayrıntı için [LICENSE](LICENSE).
