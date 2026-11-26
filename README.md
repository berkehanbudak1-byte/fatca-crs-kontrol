# FATCA / CRS öz beyan kontrolü

Bir müşterinin öz beyanını girersiniz. Araç üç şeyden birini söyler: **Makul**, **Makul değil** veya **Manuel inceleme**. Makul değilse hangi belgeyi isteyeceğinizi listeler.

Bu bir ön kontroldür. Hukuki görüş değildir. Veri tarayıcıdan dışarı gitmez.

Kuralların kaynak paragrafı `docs/kapsam.md` dosyasındadır.

## Açmak

Ek program gerekmez. `FATCA-CRS-Kontrol.html` dosyasını çift tıklayın.

Ülke listesini dosyadan okutmak isterseniz, bu klasörde sırayla şunu çalıştırın:

```text
python -m http.server 4123
```

`python` bulunamazsa şu komutu deneyin:

```text
py -m http.server 4123
```

Sonra tarayıcıda şu adresi açın:

```text
http://127.0.0.1:4123/
```

## Tek müşteri

1. Ad, doğum tarihi, beyan tarihi ve imzayı girin.
2. Vergi mukimliğini yazın. TIN varsa TIN'i, yoksa A, B veya C nedenini seçin. B ise nedenini yazın.
3. İkamet adresinin ülkesini ve telefonu girin.
4. ABD bağlantısı varsa ilgili kutuyu işaretleyin.
5. **Kontrol et** düğmesine basın.

**Örnek doldur** sentetik bir kayıt koyar. Üzerinde gerçek müşteri yoktur.

Sağ üstteki **English** düğmesi ekranı İngilizce yapar. Kural metni de seçilen dile döner.

## Toplu kontrol

Sayfanın altındaki **Toplu kontrol** kutusuna CSV yapıştırın. Ayraç noktalı virgül veya virgül olabilir. **Sonuç CSV indir** dosyası Türk Excel içindir: UTF-8 (BOM) ve noktalı virgül.

Örnek dosya `examples/ornek-musteriler.csv` içindedir. Satırların adında **ÖRNEK VERİ** yazar. Gerçek müşteri yapıştırmayın.

Node.js kuruluysa aynı dosyayı komutla da işleyebilirsiniz:

```text
node scripts/toplu-kontrol.js examples/ornek-musteriler.csv examples/ornek-sonuc.csv
```

## Test

Geliştirme makinesinde:

```text
node test/run.js
```

## Sınır

Araç belgeyi görmez, TIN'in o kişiye ait olduğunu soruşturmaz. Tüzel müşteriyi ayırır; Aktif/Pasif NFE incelemesini yapmaz. Ülke listesi 2023 GİB yedeğidir ve yenilenmelidir. Ayrıntı `docs/kapsam.md` sonundadır.

## Lisans

MIT. Metin `LICENSE` dosyasındadır.
