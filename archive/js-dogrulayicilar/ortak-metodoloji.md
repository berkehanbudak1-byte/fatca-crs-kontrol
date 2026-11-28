# Ortak denetim metodolojisi

Üç modelin ortak yapısı: makullük kontrolü, telefon güvenliği listesi ve kernel sertleştirme denetimi. Bu dosya, üçünün birleşik hâlini tanımlar.

## 1. Kural kimliği
Her kontrolün sabit bir kimliği olur (F1, C6, K3 gibi). Bulgu her zaman kimliğiyle raporlanır. Makullük kurallarında bu zaten var, kernel denetimine de aynı mantık uygulanır.

## 2. Üç sonuç sınıfı
- **Hata:** Engelleyen, düzeltilmesi gereken durum.
- **Uyarı:** Tutarsızlık, incelenmesi gereken durum.
- **Manuel:** Otomatik kontrol edilemeyen, insan kararı gereken adım.

Telefon kontrol listesindeki "yapılacak" ve "delil" maddeleri manuel sınıfına girer. Kernel'de doğrulanamayan maddeler de manuel sınıfına girer.

## 3. Derleme ile çalışma arasındaki fark
Bir güvenlik özelliğinin açık olması, yalnızca yapılandırmada görünmesi anlamına gelmez. Üç modelde de şunu sor:
- Kernel: seçenek derlenmiş mi, açılış parametresiyle aktif mi, çalışma zamanında doğrulandı mı?
- Telefon: ayar açık mı, gerçekten bir uygulama bunu kullanıyor mu?
- Makullük: alan var mı, değeri formatına uyuyor mu, mantıksal olarak tutarlı mı?

Doğrulanamayan her madde "bilinmiyor" olarak işaretlenir, "yok" olarak değil.

## 4. Kanıt kaydı
Her bulgu şu bilgilerle kaydedilir: tarih, kaynak, ne gösteriyor, dosya yolu ve dosyanın SHA-256 özeti. Makullük için beyan, telefon için ekran görüntüsü, kernel için yapılandırma çıktısı aynı kayıt defterine girer.

## 5. Kaynak gösterme
Her kural bir kaynağa bağlanır: makullük için IRS ya da OECD metni, kernel için KSPP ya da CIS, telefon için operatör ya da resmi Android/Samsung belgesi. Kaynağı olmayan kural "yerel politika" olarak etiketlenir.

## 6. Öncelik
Bulgular üç eksende sıralanır: sömürülebilirlik ya da hukuki risk, etki, düzeltme maliyeti. Kritik olanlar önce gelir.

## 7. Sınır beyanı
Her raporun sonunda üç şey yazılır: ne kontrol edildi, ne doğrulanamadı, hangi karar uzmana bırakıldı.

## Şablon
```
Kural  | Sınıf    | Bulgu            | Kaynak          | Kanıt (SHA-256) | Öncelik
F2     | Manuel   | ABD doğum yeri   | IRS 1.1471-4    | (kayıt no 3)    | Yüksek
K3     | Hata     | MODULE_SIG yok   | KSPP            | (çıktı)         | Kritik
```
