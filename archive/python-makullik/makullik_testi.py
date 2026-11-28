#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
FATCA / CRS öz beyan MAKULLÜK TESTİ  (v1.0 - 27.11.2026)

- Yalnızca Python 3 standart kütüphanesi (csv, re, datetime, ...). Ağ çağrısı YOKTUR.
- CSV'yi satır satır okur (düşük RAM). Tüm veri yerelde kalır.
- Kullanım:  python makullik_testi.py girdi.csv cikti.csv
- Kural gerekçeleri ve kaynaklar için kurallar.md dosyasına bakın.

Bu araç KARAR VERMEZ; analistin inceleyeceği satırları işaretler.
"""
import argparse
import codecs
import csv
import datetime
import os
import re
import sys
import time
import unicodedata

SURUM = "1.0"

# --------------------------------------------------------------------------
# 1) KURAL KATALOĞU  (kurallar.md bu katalogdan üretilir / testle karşılaştırılır)
# --------------------------------------------------------------------------
YUKSEK, ORTA, DUSUK = "Yüksek", "Orta", "Düşük"
SIDDET_SIRA = {DUSUK: 1, ORTA: 2, YUKSEK: 3}
SIDDET_PUAN = {DUSUK: 3, ORTA: 10, YUKSEK: 30}

RULES = {
    # ---------------- FATCA ----------------
    "F01": dict(grup="FATCA", ad="ABD vatandaşlığı / ABD uyruğu beyanı",
        alanlar="vatandaslik, abd_degil_ozbeyan, abd_olmama_belge", siddet=YUKSEK,
        aciklama="Uyruk alanında ABD yer alıyor (ABD vatandaşı/mukimi göstergesi).",
        aksiyon="ABD kişisi (Specified U.S. Person) olarak değerlendirin; W-9/ABD TIN alın veya ABD vatandaşlığından çıkış belgesi (CLN) / makul açıklama kaydı isteyin.",
        kaynak="K1, K4"),
    "F02": dict(grup="FATCA", ad="ABD doğum yeri",
        alanlar="dogum_ulkesi, abd_degil_ozbeyan, abd_olmama_belge", siddet=YUKSEK,
        aciklama="Doğum ülkesi ABD (net ABD doğum yeri göstergesi).",
        aksiyon="ABD dışı statü öz beyanı (W-8BEN vb.) + CLN veya ABD vatandaşlığı edinilmediğine dair makul açıklama ve kanıt belgesi alın; yoksa ABD hesabı olarak ele alın.",
        kaynak="K1, K4"),
    "F03": dict(grup="FATCA", ad="ABD ikamet adresi",
        alanlar="ikamet_adresi_ulke, abd_degil_ozbeyan, abd_olmama_belge", siddet=YUKSEK,
        aciklama="Güncel ikamet adresi ABD'de.",
        aksiyon="ABD vatandaşı/mukimi olmadığına dair öz beyan (W-8BEN) ve ABD dışı statüyü kanıtlayan belge alın; kayıt adresini doğrulayın.",
        kaynak="K1, K4"),
    "F04": dict(grup="FATCA", ad="ABD posta adresi / posta kutusu",
        alanlar="posta_adresi_ulke, abd_degil_ozbeyan, abd_olmama_belge", siddet=YUKSEK,
        aciklama="Güncel posta adresi ABD'de (ABD posta kutusu dahil).",
        aksiyon="F03 ile aynı: ABD dışı statü öz beyanı + belge; posta adresi gerçekten kullanılıyor mu teyit edin.",
        kaynak="K1, K4"),
    "F05": dict(grup="FATCA", ad="ABD telefon numarası (+1)",
        alanlar="telefon_1, telefon_2, telefon_3, mukimlik_ulke_1..3", siddet=YUKSEK,
        aciklama="+1 alan kodlu telefon var. +1 hem ABD hem Kanada/Karayipler (NANP) için geçerlidir. Tek telefon ise Yüksek, ABD dışı telefon da varsa Orta; Kanada/Karayip mukimliği beyanı varsa bir kademe düşer.",
        aksiyon="Numaranın gerçekten ABD'ye ait olup olmadığını teyit edin; ABD ise ABD dışı statü öz beyanı + belge isteyin.",
        kaynak="K1, K4"),
    "F06": dict(grup="FATCA", ad="ABD'deki hesaba düzenli ödeme talimatı",
        alanlar="abd_hesabina_duzenli_talimat, abd_degil_ozbeyan, abd_olmama_belge", siddet=YUKSEK,
        aciklama="Hesaptan ABD'de tutulan bir hesaba düzenli (tekrarlayan) ödeme talimatı var.",
        aksiyon="Talimatı doğrulayın; ABD dışı statü öz beyanı + belge alın; talimatın amacını (aile, kira vb.) kayda geçirin.",
        kaynak="K1, K4"),
    "F07": dict(grup="FATCA", ad="ABD adresli vekil / imza yetkilisi",
        alanlar="vekil_imza_yetkilisi_adres_ulke, abd_degil_ozbeyan, abd_olmama_belge", siddet=YUKSEK,
        aciklama="Geçerli vekâletname veya imza yetkisi ABD adresli bir kişiye verilmiş.",
        aksiyon="Hesap sahibinden ABD dışı statü öz beyanı + belge alın; vekilin ABD kişisi olması hesap sahibini tek başına ABD kişisi yapmaz, kayda geçirin.",
        kaynak="K1, K4"),
    "F08": dict(grup="FATCA", ad="Tek adres olarak 'in-care-of' / 'hold mail'",
        alanlar="tek_adres_care_of_hold_mail", siddet=ORTA,
        aciklama="Hesap sahibi için kayıtlı TEK adres 'in-care-of' veya 'posta tutma' adresi.",
        aksiyon="Gerçek ikamet/posta adresini ve vergi mukimliğini yeniden teyit edin; ABD ile bağlantıyı sorgulayın.",
        kaynak="K1, K4, K5"),
    "F09": dict(grup="FATCA", ad="ABD vergi mukimliği beyanı",
        alanlar="mukimlik_ulke_1..3", siddet=YUKSEK,
        aciklama="Öz beyanda vergi mukimliği ülkelerinden biri ABD.",
        aksiyon="ABD TIN (SSN/ITIN/EIN) alındığından emin olun; FATCA raporlama sürecine (GİB bildirimi) alınıp alınmadığını kontrol edin.",
        kaynak="K1, K2"),
    "F10": dict(grup="FATCA", ad="ABD TIN biçiminde vergi numarası (SSN/ITIN/EIN)",
        alanlar="tin_1..3, mukimlik_ulke_1..3", siddet=YUKSEK,
        aciklama="Vergi numarası alanlarında ABD SSN/ITIN/EIN biçiminde bir numara var (mukimlik ABD olmasa bile).",
        aksiyon="ABD ile bağlantıyı netleştirin; mukimlik beyanı ile ABD TIN arasındaki çelişkiyi açıklatın.",
        kaynak="K1, K8"),
    "F11": dict(grup="FATCA", ad="ABD göstergesi var, çürütücü belge kaydı yok",
        alanlar="F01-F07 sonuçları, abd_degil_ozbeyan, abd_olmama_belge", siddet=YUKSEK,
        aciklama="F01-F07'den en az biri tetiklendi ve hem ABD dışı statü öz beyanı hem belge kaydı birlikte mevcut değil.",
        aksiyon="Müşteriden belgeleri talep edin (süre: kurum politikası); belge gelmezse hesabı ABD hesabı varsayımıyla işleyip uyum yöneticisine eskale edin.",
        kaynak="K1, K4"),
    # ---------------- CRS ----------------
    "C01": dict(grup="CRS", ad="Vergi mukimliği beyanı yok",
        alanlar="mukimlik_ulke_1..3", siddet=YUKSEK,
        aciklama="Hiçbir vergi mukimliği ülkesi beyan edilmemiş; öz beyan eksik/kullanılamaz.",
        aksiyon="Öz beyan formunu yeniden alın; alınamazsa kurum prosedürüne göre belgesiz hesap sürecini başlatın.",
        kaynak="K5"),
    "C02": dict(grup="CRS", ad="Geçersiz / tanınmayan ülke kodu",
        alanlar="mukimlik_ulke_1..3, vatandaslik, ikamet_adresi_ulke, posta_adresi_ulke, dogum_ulkesi", siddet=ORTA,
        aciklama="Ülke alanı ISO 3166 kodu (veya bilinen ülke adı) olarak tanınmadı.",
        aksiyon="Kayıt hatasını düzeltin (ISO-2 kod kullanın); doğru ülke teyit edilmeden makullük sonucu güvenilmez.",
        kaynak="K5"),
    "C03": dict(grup="CRS", ad="İkamet adresi ülkesi beyan edilen mukimlik ülkeleri arasında yok",
        alanlar="ikamet_adresi_ulke, mukimlik_ulke_1..3", siddet=YUKSEK,
        aciklama="OECD CRS Yorumu IV. Bölüm 24. paragraf Örnek 2: adres, mukim olunduğu iddia edilen ülkede değilse öz beyan makullük testinde başarısızdır.",
        aksiyon="Makul açıklama + belge alın (öğrenci, diplomat, sınır işçisi vb.) veya geçerli yeni öz beyan alın; açıklamayı kayda geçirin.",
        kaynak="K5"),
    "C04": dict(grup="CRS", ad="Posta adresi ülkesi beyan edilen mukimlik ülkeleri arasında yok",
        alanlar="posta_adresi_ulke, mukimlik_ulke_1..3", siddet=ORTA,
        aciklama="Posta adresi ülkesi, beyan edilen mukimlik ülkelerinden hiçbiri değil.",
        aksiyon="Posta adresinin nedenini sorun; çoklu mukimlik ihtimalini değerlendirin; gerekirse öz beyanı güncelleyin.",
        kaynak="K5"),
    "C05": dict(grup="CRS", ad="İkamet adresi ülkesi boş",
        alanlar="ikamet_adresi_ulke", siddet=ORTA,
        aciklama="İkamet adresi ülkesi kayıtlı değil; adres-mukimlik karşılaştırması yapılamıyor.",
        aksiyon="KYC kaydındaki adresi tamamlayın; sonra testi yeniden çalıştırın.",
        kaynak="K5"),
    "C06": dict(grup="CRS", ad="Telefon ülke kodu mukimlik ülkeleriyle uyuşmuyor",
        alanlar="telefon_1..3, mukimlik_ulke_1..3", siddet=DUSUK,
        aciklama="Tanınan telefon ülke kodlarının hiçbiri beyan edilen mukimlik ülkeleriyle örtüşmüyor (tek başına kanıt değildir).",
        aksiyon="Başka göstergelerle birlikte değerlendirin; tek başına ise bilgi amaçlıdır.",
        kaynak="K5"),
    "C07": dict(grup="CRS", ad="Uyruk, mukimlik ülkeleriyle uyuşmuyor",
        alanlar="vatandaslik, mukimlik_ulke_1..3", siddet=DUSUK,
        aciklama="Hiçbir uyruk, beyan edilen mukimlik ülkelerinden biri değil (yurtdışında mukim vatandaşlarda sık görülür).",
        aksiyon="Bilgi amaçlı; diğer kurallarla birlikte tetiklendiyse mukimlik gerekçesini sorun.",
        kaynak="K5"),
    "C08": dict(grup="CRS", ad="TIN eksik ve 'TIN yok' neden kodu da yok",
        alanlar="tin_n, tin_yok_nedeni_n", siddet=YUKSEK,
        aciklama="Beyan edilen mukimlik ülkesi için vergi kimlik numarası yok ve A/B/C neden kodu verilmemiş.",
        aksiyon="TIN veya geçerli neden kodu (A/B/C) alın; makul çabayı (reasonable efforts) kayda geçirin.",
        kaynak="K5, K7"),
    "C09": dict(grup="CRS", ad="Geçersiz 'TIN yok' neden kodu",
        alanlar="tin_yok_nedeni_n", siddet=ORTA,
        aciklama="Neden kodu A, B veya C dışında bir değer.",
        aksiyon="Kodu A/B/C'ye göre düzeltin; geçerli açıklama alın.",
        kaynak="K7"),
    "C10": dict(grup="CRS", ad="Neden A seçilmiş ama ülke TIN veriyor",
        alanlar="tin_yok_nedeni_n, mukimlik_ulke_n", siddet=YUKSEK,
        aciklama="Neden A = 'ülke mukimlerine TIN vermez'. TR, US, DE, NL, GB, FR, AZ, RU, UA TIN/işlevsel eşdeğer verir; beyan çelişkili.",
        aksiyon="TIN'i (veya işlevsel eşdeğerini: ulusal kimlik no vb.) müşteriden isteyin; OECD AEOI portalındaki ülke sayfasını kontrol edin.",
        kaynak="K7, K8"),
    "C11": dict(grup="CRS", ad="Neden B seçilmiş ama açıklama yok",
        alanlar="tin_yok_nedeni_n, tin_yok_aciklama", siddet=ORTA,
        aciklama="Neden B (TIN alınamıyor) için formda açıklama zorunludur; açıklama alanı boş.",
        aksiyon="Müşteriden TIN'i neden alamadığına dair yazılı açıklama alın.",
        kaynak="K7"),
    "C12": dict(grup="CRS", ad="Neden C seçilmiş ama ülke TIN toplanmasını gerektirebilir (sezgisel)",
        alanlar="tin_yok_nedeni_n, mukimlik_ulke_n", siddet=ORTA,
        aciklama="Neden C yalnızca ülke mevzuatı TIN toplanmasını gerektirmiyorsa seçilebilir. Bu kural sezgiseldir: TR, US, DE, NL, GB, FR, AZ, RU, UA için tetiklenir.",
        aksiyon="OECD AEOI portalında ilgili ülkenin TIN toplama zorunluluğunu kontrol edin; gerekirse TIN isteyin.",
        kaynak="K7, K8"),
    "C13": dict(grup="CRS", ad="TIN biçimi/sağlama (checksum) hatalı",
        alanlar="tin_n, mukimlik_ulke_n", siddet=ORTA,
        aciklama="Ülkeye özgü biçim veya kontrol hanesi hatalı (TR TCKN/VKN, US SSN/ITIN/EIN, DE, NL, GB, FR, AZ, RU, UA; diğer ülkelerde genel uzunluk/karakter kontrolü).",
        aksiyon="Müşteriden belge (vergi levhası/ kimlik/ vergi bildirimi) ile numarayı doğrulatın; yazım hatasını düzeltin.",
        kaynak="K8, K9"),
    "C14": dict(grup="CRS", ad="Yer tutucu / sahte görünümlü TIN",
        alanlar="tin_n", siddet=ORTA,
        aciklama="TIN '000000000', '123456789', tek rakam tekrarı veya 'YOK/N/A' gibi yer tutucu değer.",
        aksiyon="Gerçek TIN'i alın veya geçerli neden kodunu kullanın.",
        kaynak="K8"),
    "C15": dict(grup="CRS", ad="Aynı TIN birden fazla ülke için girilmiş",
        alanlar="tin_1..3, mukimlik_ulke_1..3", siddet=ORTA,
        aciklama="Aynı numara farklı mukimlik ülkeleri için kullanılmış.",
        aksiyon="Her ülke için ayrı TIN alın; kopyalama hatası olup olmadığını kontrol edin.",
        kaynak="K8"),
    "C16": dict(grup="CRS", ad="Çoklu vergi mukimliği",
        alanlar="mukimlik_ulke_1..3", siddet=DUSUK,
        aciklama="İki veya daha fazla vergi mukimliği ülkesi beyan edilmiş.",
        aksiyon="Bilgi amaçlı: her mukimlik ülkesi için raporlama ve TIN eksiksizliğini doğrulayın.",
        kaynak="K5"),
    "C17": dict(grup="CRS", ad="OECD CBI/RBI yüksek riskli yargı alanında mukimlik",
        alanlar="mukimlik_ulke_1..3", siddet=ORTA,
        aciklama="Beyan edilen mukimlik, OECD'nin potansiyel yüksek riskli CBI/RBI listesindeki yargı alanlarından biri (Panama için yalnızca belirli izin kartları risklidir: Düşük).",
        aksiyon="OECD'nin önerdiği ek soruları sorun: CBI/RBI ile mi edinildi, başka ülkede oturum hakkı, başka ülkede 90 günden fazla kalış, hangi ülkede vergi beyannamesi verildi.",
        kaynak="K6"),
    "C18": dict(grup="CRS", ad="CBI/RBI mukimliği + adres başka ülkede",
        alanlar="mukimlik_ulke_1..3, ikamet_adresi_ulke, posta_adresi_ulke", siddet=YUKSEK,
        aciklama="Mukimlik yalnızca CBI/RBI listesindeki bir yargı alanında beyan edilmiş, ikamet/posta adresi başka ülkede: OECD'nin tarif ettiği kötüye kullanım göstergesi.",
        aksiyon="Öz beyana güvenmeden önce ek doğrulama yapın (vergi beyannamesi verilen ülke, gün sayısı); gerekirse yeni öz beyan ve belge alın.",
        kaynak="K5, K6"),
    "C19": dict(grup="CRS", ad="Öz beyan tarihi eksik / geçersiz / ileri tarihli",
        alanlar="ozbeyan_tarihi", siddet=ORTA,
        aciklama="Öz beyan tarihi boş, okunamadı veya bugünden sonra.",
        aksiyon="Öz beyan belgesini bulun veya yeniden alın; tarih kaydını düzeltin.",
        kaynak="K5"),
    "C20": dict(grup="CRS", ad="TIN/neden kodu var ama mukimlik ülkesi yok",
        alanlar="mukimlik_ulke_n, tin_n, tin_yok_nedeni_n", siddet=ORTA,
        aciklama="Bir satırda TIN veya neden kodu dolu, ancak ilgili ülke boş.",
        aksiyon="Eksik ülke bilgisini tamamlayın (veri girişi hatası olabilir).",
        kaynak="K5"),
}

KAYNAKLAR = {
    "K1": "ABD-Türkiye FATCA Model 1 IGA (29.07.2015), Annex I, Bölüm II.B(1) 'U.S. indicia' - https://home.treasury.gov/system/files/131/FATCA-Agreement-Turkey-7-29-2015.pdf",
    "K2": "U.S. Treasury FATCA sayfası (Türkiye: Model 1, yürürlük 14.06.2021) - https://home.treasury.gov/policy-issues/tax-policy/foreign-account-tax-compliance-act",
    "K4": "26 CFR 1.1471-4(c)(5)(iv) (ABD göstergeleri; standing instructions; in-care-of/hold mail) - https://www.law.cornell.edu/cfr/text/26/1.1471-4",
    "K5": "OECD, Standard for Automatic Exchange of Financial Account Information, 2nd ed. (CRS + Yorumlar; IV. Bölüm Yorumu par. 22-25 'reasonableness') - https://www.oecd.org/content/dam/oecd/en/publications/reports/2017/03/standard-for-automatic-exchange-of-financial-account-information-in-tax-matters-second-edition_g1g73eb6/9789264267992-en.pdf",
    "K6": "OECD, Residence/Citizenship by investment schemes (CBI/RBI) - https://www.oecd.org/en/topics/sub-issues/international-standards-on-tax-transparency/residence-citizenship-by-investment.html",
    "K7": "OECD örnek bireysel öz beyan formu (Neden A/B/C) - https://www.oecd.org/content/dam/oecd/en/topics/policy-issue-focus/aeoi/crs_individual_self-cert_form.pdf",
    "K8": "OECD AEOI Portalı - ülke TIN bilgi formları (TR, DE, NL, FR, US, AZ, RU, UA, UK) - https://www.oecd.org/en/networks/global-forum-tax-transparency/resources/aeoi-implementation-portal/tax-identification-numbers.html",
    "K9": "GİB - Finansal Hesap Bilgilerinin Vergi Amaçlı Otomatik Değişimi Rehberi - https://cdn.gib.gov.tr/api/gibportal-file/file/getFileResources?objectKey=arsiv%2Fmevzuat%2Fuluslararasi_mevzuat%2Ffinansalrehber2023.pdf",
}

# --------------------------------------------------------------------------
# 2) SABİTLER: ülkeler, telefon kodları, CBI/RBI listesi
# --------------------------------------------------------------------------
ISO2 = set("""AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ
CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD
GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM
KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA
NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ
SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU
WF WS YE YT ZA ZM ZW XK""".split())

ISO3_TO_2 = dict(
    TUR="TR", USA="US", DEU="DE", NLD="NL", GBR="GB", FRA="FR", AZE="AZ", RUS="RU", UKR="UA", ITA="IT", ESP="ES", CHE="CH",
    AUT="AT", BEL="BE", SWE="SE", NOR="NO", DNK="DK", FIN="FI", GRC="GR", CYP="CY", BGR="BG", ROU="RO", POL="PL", CZE="CZ",
    HUN="HU", PRT="PT", IRL="IE", LUX="LU", MLT="MT", ARE="AE", SAU="SA", QAT="QA", KWT="KW", BHR="BH", OMN="OM", ISR="IL",
    IRN="IR", IRQ="IQ", SYR="SY", LBN="LB", JOR="JO", EGY="EG", GEO="GE", ARM="AM", KAZ="KZ", UZB="UZ", TKM="TM", KGZ="KG",
    BLR="BY", MDA="MD", LTU="LT", LVA="LV", EST="EE", SRB="RS", MNE="ME", BIH="BA", HRV="HR", SVN="SI", MKD="MK", ALB="AL",
    CAN="CA", MEX="MX", BRA="BR", ARG="AR", CHN="CN", HKG="HK", JPN="JP", KOR="KR", IND="IN", PAK="PK", SGP="SG", MYS="MY",
    AUS="AU", NZL="NZ", ZAF="ZA", NGA="NG", MAR="MA", DZA="DZ", TUN="TN", LBY="LY", ATG="AG", BHS="BS", BRB="BB", DMA="DM",
    GRD="GD", KNA="KN", LCA="LC", SYC="SC", TCA="TC", VUT="VU", PAN="PA", CYM="KY", VGB="VG", MCO="MC", LIE="LI", AND="AD",
)

ULKE_ADLARI = {
    "turkiye": "TR", "turkey": "TR", "turkiye cumhuriyeti": "TR", "abd": "US", "amerika": "US",
    "amerika birlesik devletleri": "US", "united states": "US", "united states of america": "US", "usa": "US",
    "almanya": "DE", "germany": "DE", "hollanda": "NL", "netherlands": "NL", "birlesik krallik": "GB",
    "ingiltere": "GB", "united kingdom": "GB", "uk": "GB", "buyuk britanya": "GB", "fransa": "FR", "france": "FR",
    "azerbaycan": "AZ", "azerbaijan": "AZ", "rusya": "RU", "russia": "RU", "rusya federasyonu": "RU",
    "ukrayna": "UA", "ukraine": "UA", "kibris": "CY", "cyprus": "CY", "kkc": "CY", "birlesik arap emirlikleri": "AE",
    "bae": "AE", "uae": "AE", "dubai": "AE", "italya": "IT", "ispanya": "ES", "isvicre": "CH", "avusturya": "AT",
    "belcika": "BE", "isvec": "SE", "norvec": "NO", "yunanistan": "GR", "gurcistan": "GE", "kazakistan": "KZ",
    "bulgaristan": "BG", "romanya": "RO", "polonya": "PL", "kanada": "CA", "canada": "CA", "iran": "IR",
    "irak": "IQ", "suriye": "SY", "lubnan": "LB", "mısir": "EG", "misir": "EG", "cin": "CN", "japonya": "JP",
    "hindistan": "IN", "pakistan": "PK", "bahamalar": "BS", "bahamas": "BS", "barbados": "BB", "panama": "PA",
    "seyseller": "SC", "seychelles": "SC", "vanuatu": "VU", "bahreyn": "BH", "bahrain": "BH", "dominika": "DM",
    "dominica": "DM", "grenada": "GD", "saint lucia": "LC", "st lucia": "LC", "antigua ve barbuda": "AG",
    "antigua and barbuda": "AG", "saint kitts ve nevis": "KN", "saint kitts and nevis": "KN",
    "turks ve caicos": "TC", "turks and caicos": "TC",
}

NANP = {"US", "CA", "AG", "AI", "AS", "BB", "BM", "BS", "DM", "DO", "GD", "GU", "JM", "KN", "KY", "LC", "MP", "MS",
        "PR", "SX", "TC", "TT", "VC", "VG", "VI"}

# Telefon ülke kodu -> olası ISO2 kümesi (en uzun önek eşleşmesi)
CC = {
    "1": NANP, "7": {"RU", "KZ"}, "20": {"EG"}, "27": {"ZA"}, "30": {"GR"}, "31": {"NL"}, "32": {"BE"}, "33": {"FR"},
    "34": {"ES"}, "36": {"HU"}, "39": {"IT", "VA"}, "40": {"RO"}, "41": {"CH"}, "43": {"AT"}, "44": {"GB", "GG", "JE", "IM"},
    "45": {"DK"}, "46": {"SE"}, "47": {"NO", "SJ"}, "48": {"PL"}, "49": {"DE"}, "51": {"PE"}, "52": {"MX"}, "53": {"CU"},
    "54": {"AR"}, "55": {"BR"}, "56": {"CL"}, "57": {"CO"}, "58": {"VE"}, "60": {"MY"}, "61": {"AU"}, "62": {"ID"},
    "63": {"PH"}, "64": {"NZ"}, "65": {"SG"}, "66": {"TH"}, "81": {"JP"}, "82": {"KR"}, "84": {"VN"}, "86": {"CN"},
    "90": {"TR"}, "91": {"IN"}, "92": {"PK"}, "93": {"AF"}, "94": {"LK"}, "95": {"MM"}, "98": {"IR"},
    "212": {"MA"}, "213": {"DZ"}, "216": {"TN"}, "218": {"LY"}, "234": {"NG"}, "254": {"KE"}, "351": {"PT"},
    "352": {"LU"}, "353": {"IE"}, "354": {"IS"}, "355": {"AL"}, "356": {"MT"}, "357": {"CY"}, "358": {"FI", "AX"},
    "359": {"BG"}, "370": {"LT"}, "371": {"LV"}, "372": {"EE"}, "373": {"MD"}, "374": {"AM"}, "375": {"BY"},
    "376": {"AD"}, "377": {"MC"}, "380": {"UA"}, "381": {"RS"}, "382": {"ME"}, "383": {"XK"}, "385": {"HR"},
    "386": {"SI"}, "387": {"BA"}, "389": {"MK"}, "420": {"CZ"}, "421": {"SK"}, "423": {"LI"}, "852": {"HK"},
    "853": {"MO"}, "855": {"KH"}, "880": {"BD"}, "886": {"TW"}, "961": {"LB"}, "962": {"JO"}, "963": {"SY"},
    "964": {"IQ"}, "965": {"KW"}, "966": {"SA"}, "967": {"YE"}, "968": {"OM"}, "971": {"AE"}, "972": {"IL"},
    "973": {"BH"}, "974": {"QA"}, "975": {"BT"}, "976": {"MN"}, "977": {"NP"}, "992": {"TJ"}, "993": {"TM"},
    "994": {"AZ"}, "995": {"GE"}, "996": {"KG"}, "998": {"UZ"},
}

# OECD CBI/RBI "potansiyel yüksek riskli" şemalar (Datawrapper tablosu v2, OECD sayfasına gömülü;
# 27.11.2026'da alındı). Güncel durum için OECD sayfasına bakın; isterseniz cbi_rbi_listesi.txt ile geçersiz kılın.
CBI_RBI_VARSAYILAN = {"AG", "BS", "BH", "BB", "CY", "DM", "GD", "KN", "LC", "SC", "TC", "AE", "VU"}
CBI_RBI_KISMI = {"PA"}  # Panama: yalnızca belirli izin kartları (PRP-FOR, PRP-SEP, PRP-PA) riskli

# TIN veren ülkeler (Neden A çelişki kontrolü için) - OECD AEOI portalı
TIN_VEREN = {"TR", "US", "DE", "NL", "GB", "FR", "AZ", "RU", "UA"}

PLACEHOLDER_METIN = {"NA", "N/A", "NONE", "YOK", "YOKTUR", "NULL", "-", "--", "XXX", "XXXXXXXXX", "TEST", "BILINMIYOR",
                     "TBD", "NIL", "NAN", "BELIRTILMEDI", "0"}

# --------------------------------------------------------------------------
# 3) STANDART KOLONLAR (girdi_sablonu.csv ile aynı) ve takma adlar
# --------------------------------------------------------------------------
STD_KOLONLAR = [
    "musteri_no", "ad_soyad", "musteri_tipi", "vatandaslik", "dogum_ulkesi", "ikamet_adresi_ulke", "posta_adresi_ulke",
    "tek_adres_care_of_hold_mail", "telefon_1", "telefon_2", "telefon_3",
    "mukimlik_ulke_1", "tin_1", "tin_yok_nedeni_1", "mukimlik_ulke_2", "tin_2", "tin_yok_nedeni_2",
    "mukimlik_ulke_3", "tin_3", "tin_yok_nedeni_3", "tin_yok_aciklama",
    "abd_hesabina_duzenli_talimat", "vekil_imza_yetkilisi_adres_ulke", "abd_degil_ozbeyan", "abd_olmama_belge",
    "ozbeyan_tarihi",
]
TAKMA_ADLAR = {
    "musteri_no": ["musterino", "musteri_numarasi", "cif", "customerid", "customer_no"],
    "ad_soyad": ["adsoyad", "unvan", "musteri_adi", "name", "fullname"],
    "musteri_tipi": ["tip", "musteritipi", "customer_type"],
    "vatandaslik": ["uyruk", "uyrugu", "nationality", "citizenship"],
    "dogum_ulkesi": ["dogum_yeri_ulke", "dogumulkesi", "birth_country", "country_of_birth"],
    "ikamet_adresi_ulke": ["ikamet_ulke", "ev_adresi_ulke", "residential_country", "residence_address_country"],
    "posta_adresi_ulke": ["posta_ulke", "yazisma_adresi_ulke", "mailing_country", "mailing_address_country"],
    "tek_adres_care_of_hold_mail": ["hold_mail", "care_of", "posta_tutma"],
    "ozbeyan_tarihi": ["ozbeyan_tarih", "selfcert_date", "self_cert_tarihi"],
}


def tr_ascii(s):
    t = str.maketrans({"İ": "i", "I": "i", "ı": "i", "Ş": "s", "ş": "s", "Ğ": "g", "ğ": "g", "Ü": "u", "ü": "u",
                       "Ö": "o", "ö": "o", "Ç": "c", "ç": "c"})
    s = s.translate(t).lower()
    s = unicodedata.normalize("NFKD", s)
    return "".join(c for c in s if not unicodedata.combining(c))


def kolon_norm(s):
    return re.sub(r"[^a-z0-9]", "", tr_ascii(s))


# --------------------------------------------------------------------------
# 4) AYRIŞTIRICILAR (ülke, E/H, tarih, telefon, TIN temizliği)
# --------------------------------------------------------------------------
def ulke_coz(s):
    """'TR', 'TUR', 'Türkiye' -> 'TR'. Tanınmazsa None."""
    if s is None:
        return None
    s = s.strip()
    if not s:
        return None
    u = s.upper()
    if len(u) == 2 and u.isalpha():
        if u == "UK":
            return "GB"
        return u if u in ISO2 else None
    if len(u) == 3 and u.isalpha() and u in ISO3_TO_2:
        return ISO3_TO_2[u]
    return ULKE_ADLARI.get(re.sub(r"\s+", " ", tr_ascii(s).replace(".", "").strip()))


def ulke_listesi(s):
    """'TR; US' gibi alanı (kod_listesi, tanınmayan_sayısı) olarak ayır."""
    kodlar, bilinmeyen = [], 0
    for parca in re.split(r"[;,/|]+", s or ""):
        parca = parca.strip()
        if not parca:
            continue
        k = ulke_coz(parca)
        if k:
            kodlar.append(k)
        else:
            bilinmeyen += 1
    return kodlar, bilinmeyen


EVET = {"e", "evet", "y", "yes", "1", "true", "x", "var", "dogru", "doğru"}
HAYIR = {"h", "hayir", "hayır", "n", "no", "0", "false", "yok", "yanlis", "yanlış"}


def eh(s):
    v = (s or "").strip().lower()
    if v in EVET:
        return True
    if v in HAYIR:
        return False
    return None


def tarih_coz(s):
    s = (s or "").strip()
    if not s:
        return None
    for f in ("%d.%m.%Y", "%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y", "%Y%m%d", "%Y.%m.%d", "%Y/%m/%d"):
        try:
            return datetime.datetime.strptime(s[:10] if f != "%Y%m%d" else s, f).date()
        except ValueError:
            continue
    return None


def telefon_ulkeleri(tel):
    """Telefon -> olası ISO2 kümesi. Tanınmazsa None. '05xx'/'5xx' -> TR varsayılır."""
    p = re.sub(r"[\s\-().]", "", tel or "")
    if not p:
        return None
    if p.startswith("+"):
        d = p[1:]
    elif p.startswith("00"):
        d = p[2:]
    elif p.startswith("0") and len(p) >= 10:
        return {"TR"}
    elif re.fullmatch(r"5\d{9}", p):
        return {"TR"}
    else:
        return None
    if not d.isdigit():
        return None
    for n in (3, 2, 1):
        if d[:n] in CC:
            return CC[d[:n]]
    return None


def tin_temizle(t):
    return re.sub(r"[\s\-./]", "", (t or "")).upper()


def tin_yer_tutucu_mu(ham):
    t = tin_temizle(ham)
    if not t:
        return False
    if t in PLACEHOLDER_METIN or (ham or "").strip().upper() in PLACEHOLDER_METIN:
        return True
    if t.isdigit():
        if len(set(t)) == 1:
            return True
        if len(t) >= 6 and (t in "01234567890123456789" or t in "98765432109876543210"):
            return True
    return False


# --------------------------------------------------------------------------
# 5) TIN DOĞRULAYICILAR  (her biri bool döner)
# --------------------------------------------------------------------------
def tckn_gecerli(s):
    """11 hane, ilk hane 0 değil; d10=((d1+d3+d5+d7+d9)*7-(d2+d4+d6+d8)) mod 10; d11=toplam(d1..d10) mod 10."""
    if not re.fullmatch(r"\d{11}", s or "") or s[0] == "0":
        return False
    d = [int(c) for c in s]
    if ((sum(d[0:9:2]) * 7 - sum(d[1:8:2])) % 10) != d[9]:
        return False
    return sum(d[:10]) % 10 == d[10]


def vkn_gecerli(s):
    """10 hane; i=0..8: t=(d[i]+(9-i))%10; r=(t*2^(9-i))%9; (t!=0 ve r==0 ise r=9); kontrol=(10-S%10)%10."""
    if not re.fullmatch(r"\d{10}", s or ""):
        return False
    d = [int(c) for c in s]
    toplam = 0
    for i in range(9):
        t = (d[i] + (9 - i)) % 10
        r = (t * (2 ** (9 - i))) % 9
        if t != 0 and r == 0:
            r = 9
        toplam += r
    return (10 - toplam % 10) % 10 == d[9]


def tr_tin_gecerli(s):
    if len(s) == 11:
        return tckn_gecerli(s)
    if len(s) == 10:
        return vkn_gecerli(s)
    return False


def de_tin_gecerli(s):
    """Alman IdNr: 11 hane, ilk hane 0 değil, ilk 10 hanede tam bir rakam 2-3 kez (diğerleri en çok 1),
    ardışık 3 aynı rakam yok; kontrol hanesi ISO 7064 MOD 11,10."""
    if not re.fullmatch(r"\d{11}", s or "") or s[0] == "0":
        return False
    ilk = s[:10]
    sayim = {}
    for c in ilk:
        sayim[c] = sayim.get(c, 0) + 1
    tekrar = [v for v in sayim.values() if v > 1]
    if len(tekrar) != 1 or tekrar[0] > 3:
        return False
    if re.search(r"(\d)\1\1", ilk):
        return False
    p = 10
    for c in ilk:
        t = (int(c) + p) % 10
        if t == 0:
            t = 10
        p = (2 * t) % 11
    k = 11 - p
    if k == 10:
        k = 0
    return k == int(s[10])


def nl_tin_gecerli(s):
    """Hollanda BSN: 9 hane; (N1*9+...+N8*2) mod 11 = N9 (kalan 10 ise geçersiz) -> 11-proef."""
    if not re.fullmatch(r"\d{9}", s or ""):
        return False
    toplam = sum(int(c) * w for c, w in zip(s[:8], (9, 8, 7, 6, 5, 4, 3, 2)))
    k = toplam % 11
    return k != 10 and k == int(s[8])


def gb_tin_gecerli(s):
    """UTR: 10 hane. NINO: LL999999L (son harf A-D; ilk harf D,F,I,Q,U,V olamaz; ikinci harf D,F,I,O,Q,U,V olamaz;
    BG, GB, KN, NK, NT, TN, ZZ ön ekleri atanmaz)."""
    if re.fullmatch(r"\d{10}", s or ""):
        return True
    if re.fullmatch(r"[A-CEGHJ-PR-TW-Z][A-CEGHJ-NPR-TW-Z]\d{6}[A-D]", s or ""):
        return s[:2] not in {"BG", "GB", "KN", "NK", "NT", "TN", "ZZ"}
    return False


def fr_tin_gecerli(s):
    """SPI: 13 hane, ilk hane 0-3 (OECD AEOI Fransa sayfası)."""
    return bool(re.fullmatch(r"[0-3]\d{12}", s or ""))


def az_tin_gecerli(s):
    """VÖEN: 10 hane, son hane 1 (tüzel) veya 2 (gerçek). FIN/PIN: 7 karakter (harf+rakam, 'O' harfi yok)."""
    if re.fullmatch(r"\d{9}[12]", s or ""):
        return True
    return bool(re.fullmatch(r"[A-NP-Z0-9]{7}", s or ""))


def ru_tin_gecerli(s):
    """INN: 10 hane (tüzel, 1 kontrol hanesi) veya 12 hane (gerçek kişi, 2 kontrol hanesi)."""
    if re.fullmatch(r"\d{10}", s or ""):
        w = (2, 4, 10, 3, 5, 9, 4, 6, 8)
        return int(s[9]) == sum(a * int(b) for a, b in zip(w, s[:9])) % 11 % 10
    if re.fullmatch(r"\d{12}", s or ""):
        w1 = (7, 2, 4, 10, 3, 5, 9, 4, 6, 8)
        w2 = (3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8)
        c1 = sum(a * int(b) for a, b in zip(w1, s[:10])) % 11 % 10
        c2 = sum(a * int(b) for a, b in zip(w2, s[:11])) % 11 % 10
        return c1 == int(s[10]) and c2 == int(s[11])
    return False


def ua_tin_gecerli(s):
    """RNOKPP: 10 hane, ağırlıklar -1,5,7,9,4,6,10,5,7; kontrol=(toplam mod 11) mod 10. EDRPOU: 8 hane (yalnız uzunluk)."""
    if re.fullmatch(r"\d{10}", s or ""):
        w = (-1, 5, 7, 9, 4, 6, 10, 5, 7)
        return sum(a * int(b) for a, b in zip(w, s[:9])) % 11 % 10 == int(s[9])
    return bool(re.fullmatch(r"\d{8}", s or ""))


def us_tin_tur(ham):
    """'SSN' / 'ITIN' / 'EIN' / None. Tireli ya da 9 haneli SSN/ITIN; EIN yalnızca xx-xxxxxxx tireli biçimde."""
    h = (ham or "").strip()
    if re.fullmatch(r"\d{2}-\d{7}", h):
        return "EIN"
    t = re.sub(r"[\s-]", "", h)
    if not re.fullmatch(r"\d{9}", t):
        return None
    a, g, s = int(t[:3]), int(t[3:5]), int(t[5:])
    if g == 0 or s == 0 or a == 0:
        return None
    if t[0] == "9":  # ITIN: 9xx-[50-65|70-88|90-92|94-99]-xxxx
        if 50 <= g <= 65 or 70 <= g <= 88 or 90 <= g <= 92 or 94 <= g <= 99:
            return "ITIN"
        return None
    if a == 666:
        return None
    return "SSN"


def us_tin_gecerli(s):
    return us_tin_tur(s) is not None


def tin_dogrula(ulke, ham):
    """(durum) 'ok' | 'hata'. Bilinmeyen ülkelerde yalnız genel kontrol: 4-20 harf/rakam."""
    t = tin_temizle(ham)
    fn = {"TR": tr_tin_gecerli, "DE": de_tin_gecerli, "NL": nl_tin_gecerli, "GB": gb_tin_gecerli,
          "FR": fr_tin_gecerli, "AZ": az_tin_gecerli, "RU": ru_tin_gecerli, "UA": ua_tin_gecerli}.get(ulke)
    if ulke == "US":
        return "ok" if us_tin_gecerli(ham) else "hata"
    if fn:
        return "ok" if fn(t) else "hata"
    return "ok" if re.fullmatch(r"[A-Z0-9]{4,20}", t) else "hata"


# --------------------------------------------------------------------------
# 6) DEĞERLENDİRME
# --------------------------------------------------------------------------
def bir_kademe_dusur(s):
    return {YUKSEK: ORTA, ORTA: DUSUK, DUSUK: DUSUK}[s]


def cbi_listesi_yukle(klasor):
    """Aynı klasörde cbi_rbi_listesi.txt varsa (her satır bir ISO-2 kod, # yorum) onu kullanır."""
    yol = os.path.join(klasor, "cbi_rbi_listesi.txt")
    if not os.path.isfile(yol):
        return set(CBI_RBI_VARSAYILAN), False
    liste = set()
    with open(yol, encoding="utf-8-sig") as f:
        for satir in f:
            k = satir.split("#", 1)[0].strip().upper()
            if k in ISO2:
                liste.add(k)
    return liste, True


def degerlendir(v, bugun, cbi):
    """v: standart kolon -> str. Döner: [(kural_id, siddet, metin), ...]"""
    hits = []

    def ekle(kid, metin, siddet=None):
        hits.append((kid, siddet or RULES[kid]["siddet"], metin))

    # ---- ülkeleri ayrıştır
    uyruklar, bil_uyruk = ulke_listesi(v.get("vatandaslik"))
    dogum = ulke_coz(v.get("dogum_ulkesi"))
    ikamet = ulke_coz(v.get("ikamet_adresi_ulke"))
    posta = ulke_coz(v.get("posta_adresi_ulke"))
    vekil_ulkeleri, bil_vekil = ulke_listesi(v.get("vekil_imza_yetkilisi_adres_ulke"))

    gecersiz_alanlar = []
    if bil_uyruk:
        gecersiz_alanlar.append("vatandaslik")
    if (v.get("dogum_ulkesi") or "").strip() and not dogum:
        gecersiz_alanlar.append("dogum_ulkesi")
    if (v.get("ikamet_adresi_ulke") or "").strip() and not ikamet:
        gecersiz_alanlar.append("ikamet_adresi_ulke")
    if (v.get("posta_adresi_ulke") or "").strip() and not posta:
        gecersiz_alanlar.append("posta_adresi_ulke")
    if bil_vekil:
        gecersiz_alanlar.append("vekil_imza_yetkilisi_adres_ulke")

    # ---- mukimlik slotları
    slotlar = []  # (no, ülke_kodu|None, ham_ülke, tin_ham, neden_ham)
    mukim = []
    for i in (1, 2, 3):
        ham_u = (v.get("mukimlik_ulke_%d" % i) or "").strip()
        tin = (v.get("tin_%d" % i) or "").strip()
        neden = (v.get("tin_yok_nedeni_%d" % i) or "").strip()
        k = ulke_coz(ham_u) if ham_u else None
        if ham_u and not k:
            gecersiz_alanlar.append("mukimlik_ulke_%d" % i)
        if k:
            mukim.append(k)
        slotlar.append((i, k, ham_u, tin, neden))
    R = set(mukim)

    # ---- tarih
    ozb_tarih = tarih_coz(v.get("ozbeyan_tarihi"))
    ozb_ham = (v.get("ozbeyan_tarihi") or "").strip()

    # ============ FATCA ============
    cure = eh(v.get("abd_degil_ozbeyan")) is True and eh(v.get("abd_olmama_belge")) is True
    fatca_temel = []

    def fatca_ekle(kid, metin, siddet=None):
        fatca_temel.append(kid)
        s = siddet or RULES[kid]["siddet"]
        if cure:
            s = bir_kademe_dusur(s)
            metin += " [ABD dışı öz beyan + belge kaydı var: önem bir kademe düşürüldü; belgeyi gözle doğrulayın.]"
        ekle(kid, metin, s)

    if "US" in uyruklar:
        fatca_ekle("F01", "Uyruk alanında ABD var.")
    if dogum == "US":
        fatca_ekle("F02", "Doğum ülkesi ABD.")
    if ikamet == "US":
        fatca_ekle("F03", "İkamet adresi ülkesi ABD.")
    if posta == "US":
        fatca_ekle("F04", "Posta adresi ülkesi ABD.")

    tel_kumeleri = []
    for i in (1, 2, 3):
        k = telefon_ulkeleri(v.get("telefon_%d" % i))
        if k is not None:
            tel_kumeleri.append(k)
    nanp_tel = [k for k in tel_kumeleri if k is NANP]
    if nanp_tel:
        sadece_nanp = len(nanp_tel) == len(tel_kumeleri)
        s = YUKSEK if sadece_nanp else ORTA
        not_ = "+1 (ABD/Kanada/Karayip) telefon var; " + ("bilinen tek telefon bu." if sadece_nanp else "ABD dışı telefon da kayıtlı.")
        if (R & (NANP - {"US"})) and "US" not in R:
            s = bir_kademe_dusur(s)
            not_ += " Kanada/Karayip mukimliği beyan edildiği için önem düşürüldü."
        fatca_ekle("F05", not_, s)

    if eh(v.get("abd_hesabina_duzenli_talimat")) is True:
        fatca_ekle("F06", "ABD'deki hesaba düzenli ödeme talimatı var.")
    if "US" in vekil_ulkeleri:
        fatca_ekle("F07", "ABD adresli vekil/imza yetkilisi var.")
    if eh(v.get("tek_adres_care_of_hold_mail")) is True:
        ekle("F08", "Kayıtlı tek adres in-care-of/hold-mail adresi.")
    if "US" in R:
        ekle("F09", "Vergi mukimliği olarak ABD beyan edilmiş.")

    # F10: ABD TIN biçimi
    for i, k, ham_u, tin, neden in slotlar:
        if not tin or tin_yer_tutucu_mu(tin):
            continue
        tur = us_tin_tur(tin)
        dash_biçimi = bool(re.fullmatch(r"\d{3}-\d{2}-\d{4}|\d{2}-\d{7}", tin.strip()))
        if tur and (k == "US" or dash_biçimi):
            ekle("F10", "tin_%d alanı ABD %s biçiminde%s." % (i, tur, "" if k == "US" else " (mukimlik ABD değil)"))

    if fatca_temel and not cure and not (eh(v.get("abd_degil_ozbeyan")) is True and eh(v.get("abd_olmama_belge")) is True):
        ekle("F11", "Tetiklenen ABD göstergeleri: %s; ABD dışı öz beyan + belge birlikte kayıtlı değil." % ", ".join(sorted(set(fatca_temel))))

    # ============ CRS ============
    if gecersiz_alanlar:
        ekle("C02", "Tanınmayan ülke değeri: %s." % ", ".join(sorted(set(gecersiz_alanlar))))

    if not R and not any(s[2] for s in slotlar):
        ekle("C01", "mukimlik_ulke_1..3 alanlarının hepsi boş.")

    if R:
        if not ikamet and not (v.get("ikamet_adresi_ulke") or "").strip():
            ekle("C05", "ikamet_adresi_ulke boş.")
        elif ikamet and ikamet not in R:
            ekle("C03", "İkamet adresi ülkesi %s; beyan edilen mukimlik: %s." % (ikamet, "/".join(sorted(R))))
        if posta and posta not in R:
            ekle("C04", "Posta adresi ülkesi %s; beyan edilen mukimlik: %s." % (posta, "/".join(sorted(R))))
        if tel_kumeleri and not any(k & R for k in tel_kumeleri):
            ekle("C06", "Telefon kodlarına karşılık gelen ülkeler beyan edilen mukimlikle örtüşmüyor (mukimlik: %s)." % "/".join(sorted(R)))
        if uyruklar and not (set(uyruklar) & R):
            ekle("C07", "Uyruk (%s) beyan edilen mukimlik ülkeleriyle (%s) örtüşmüyor." % ("/".join(sorted(set(uyruklar))), "/".join(sorted(R))))
        if len(R) >= 2:
            ekle("C16", "Beyan edilen mukimlik ülke sayısı: %d (%s)." % (len(R), "/".join(sorted(R))))

    # TIN / neden kodu kontrolleri (slot bazlı)
    gorulen_tin = {}
    for i, k, ham_u, tin, neden in slotlar:
        if not k:
            if tin or neden:
                ekle("C20", "Slot %d: TIN/neden kodu dolu fakat mukimlik ülkesi boş/tanınmıyor." % i)
            continue
        placeholder = bool(tin) and tin_yer_tutucu_mu(tin)
        if placeholder:
            ekle("C14", "Slot %d (%s): TIN yer tutucu görünümlü." % (i, k))
        tin_var = bool(tin) and not placeholder
        if not tin_var:
            m = re.fullmatch(r"(?:NEDEN|REASON|KOD)?\s*([A-Z])", neden.strip().upper()) if neden.strip() else None
            kod = m.group(1) if m else None
            if not placeholder and not neden.strip():
                ekle("C08", "Slot %d (%s): TIN yok ve neden kodu yok." % (i, k))
            elif neden.strip() and kod not in ("A", "B", "C"):
                ekle("C09", "Slot %d (%s): neden kodu A/B/C değil." % (i, k))
            elif kod == "A" and k in TIN_VEREN:
                ekle("C10", "Slot %d (%s): Neden A seçilmiş ama %s TIN verir." % (i, k, k))
            elif kod == "B" and not (v.get("tin_yok_aciklama") or "").strip():
                ekle("C11", "Slot %d (%s): Neden B için açıklama (tin_yok_aciklama) boş." % (i, k))
            elif kod == "C" and k in TIN_VEREN:
                ekle("C12", "Slot %d (%s): Neden C seçilmiş; %s için TIN toplanması gerekebilir (sezgisel kontrol)." % (i, k, k))
        else:
            if tin_dogrula(k, tin) != "ok":
                ekle("C13", "Slot %d (%s): TIN biçimi/kontrol hanesi geçersiz." % (i, k))
            t = tin_temizle(tin)
            if t in gorulen_tin and gorulen_tin[t] != k:
                ekle("C15", "Slot %d: aynı TIN %s ve %s için girilmiş." % (i, gorulen_tin[t], k))
            gorulen_tin.setdefault(t, k)

    # CBI/RBI
    cbi_slot = sorted(R & cbi)
    cbi_kismi = sorted(R & CBI_RBI_KISMI)
    if cbi_slot:
        ekle("C17", "Mukimlik OECD CBI/RBI listesindeki yargı alanı: %s." % "/".join(cbi_slot))
    if cbi_kismi:
        ekle("C17", "Mukimlik Panama (yalnızca PRP-FOR/PRP-SEP/PRP-PA izin kartları riskli): ID kartı kodunu kontrol edin.", DUSUK)
    if R and (R <= (cbi | CBI_RBI_KISMI)) and (R & cbi):
        dis = [a for a in (ikamet, posta) if a and a not in R]
        if dis:
            ekle("C18", "Mukimlik yalnızca CBI/RBI yargı alanında (%s), adres ülkesi: %s." % ("/".join(sorted(R)), "/".join(sorted(set(dis)))))

    # Öz beyan tarihi
    if not ozb_ham:
        ekle("C19", "ozbeyan_tarihi boş.")
    elif not ozb_tarih:
        ekle("C19", "ozbeyan_tarihi okunamadı (GG.AA.YYYY veya YYYY-AA-GG kullanın).")
    elif ozb_tarih > bugun:
        ekle("C19", "ozbeyan_tarihi ileri tarihli.")

    return hits


def musteri_tipi_tuzel_mu(s):
    t = tr_ascii((s or "").strip())
    return t in {"t", "tuzel", "kurum", "kurumsal", "sirket", "entity", "legal", "corporate", "organization"}


# --------------------------------------------------------------------------
# 7) CSV G/Ç (akış), kolon eşleme
# --------------------------------------------------------------------------
def kodlama_ve_ayrac_tespit(yol, ayrac_zorla=None):
    with open(yol, "rb") as f:
        ornek = f.read(200000)
    kodlama = "utf-8-sig"
    try:
        codecs.getincrementaldecoder("utf-8-sig")().decode(ornek, final=False)
    except UnicodeDecodeError:
        kodlama = "cp1254"
    metin = ornek.decode(kodlama, errors="replace")
    ilk = metin.splitlines()[0] if metin.strip() else ""
    if ayrac_zorla:
        ayrac = "\t" if ayrac_zorla.lower() in ("\\t", "tab") else ayrac_zorla
    else:
        sayim = {a: ilk.count(a) for a in (";", ",", "\t", "|")}
        ayrac = max(sayim, key=sayim.get) if max(sayim.values()) > 0 else ","
    return kodlama, ayrac


def esleme_dosyasi_oku(yol):
    m = {}
    with open(yol, encoding="utf-8-sig") as f:
        for satir in f:
            satir = satir.split("#", 1)[0].strip()
            if not satir or "=" not in satir:
                continue
            std, kendi = satir.split("=", 1)
            std, kendi = std.strip(), kendi.strip()
            if std in STD_KOLONLAR and kendi:
                m[std] = kendi
    return m


def kolon_haritasi(basliklar, kullanici_esleme):
    """Standart kolon -> girdideki indeks. Döner: (harita, eslesmeyenler, kullanilmayan_basliklar)."""
    norm_basliklar = {}
    for idx, b in enumerate(basliklar):
        norm_basliklar.setdefault(kolon_norm(b), idx)
    harita = {}
    for std in STD_KOLONLAR:
        adaylar = []
        if std in kullanici_esleme:
            adaylar.append(kolon_norm(kullanici_esleme[std]))
        adaylar.append(kolon_norm(std))
        adaylar += [kolon_norm(a) for a in TAKMA_ADLAR.get(std, [])]
        for a in adaylar:
            if a in norm_basliklar:
                harita[std] = norm_basliklar[a]
                break
    eslesmeyen = [s for s in STD_KOLONLAR if s not in harita]
    kullanilan = set(harita.values())
    kullanilmayan = [b for i, b in enumerate(basliklar) if i not in kullanilan]
    return harita, eslesmeyen, kullanilmayan


def excel_guvenli(h):
    """CSV formül enjeksiyonuna karşı: =,+,-,@ ile başlayan metin hücrelerinin başına ' koyar (sayısal değilse)."""
    if h and h[0] in "=+@" or (h and h[0] == "-" and not re.fullmatch(r"-?[\d.,]+", h)):
        return "'" + h
    return h


def en_yuksek(hits):
    return max((SIDDET_SIRA[h[1]] for h in hits), default=0)


SIDDET_ADI = {3: YUKSEK, 2: ORTA, 1: DUSUK, 0: "-"}


def genel_aksiyon(hits):
    if not hits:
        return "Müdahale gerekmez (bu kurallar bakımından)."
    sirali = sorted(hits, key=lambda h: (-SIDDET_SIRA[h[1]], h[0]))
    goruldu, parcalar = set(), []
    for kid, s, _ in sirali:
        if kid in goruldu:
            continue
        goruldu.add(kid)
        parcalar.append("%s: %s" % (kid, RULES[kid]["aksiyon"]))
    ust = {3: "ÖNCELİKLİ MANUEL İNCELEME. ", 2: "İnceleme önerilir. ", 1: "Bilgi amaçlı, izleyin. "}[en_yuksek(hits)]
    return ust + " | ".join(parcalar[:4]) + (" | (+%d kural daha)" % (len(parcalar) - 4) if len(parcalar) > 4 else "")


def calistir(girdi, cikti, esleme=None, ayrac=None, cikti_ayrac=";", anahtar=None, ozet=None, bugun=None):
    t0 = time.time()
    bugun = bugun or datetime.date.today()
    klasor = os.path.dirname(os.path.abspath(__file__))
    cbi, cbi_ozel = cbi_listesi_yukle(klasor)
    kullanici_esleme = esleme_dosyasi_oku(esleme) if esleme else {}
    kodlama, ay = kodlama_ve_ayrac_tespit(girdi, ayrac)
    anahtar = anahtar or ["musteri_no", "ad_soyad"]
    ozet = ozet or (os.path.splitext(cikti)[0] + "_ozet.txt")

    kural_say = {k: 0 for k in RULES}
    siddet_say = {3: 0, 2: 0, 1: 0, 0: 0}
    satir_say = 0
    kapsam_disi = 0
    hata_say = 0

    with open(girdi, "r", encoding=kodlama, newline="") as fin, \
            open(cikti, "w", encoding="utf-8-sig", newline="") as fout:
        rd = csv.reader(fin, delimiter=ay)
        try:
            basliklar = next(rd)
        except StopIteration:
            raise SystemExit("HATA: Girdi dosyası boş.")
        harita, eslesmeyen, kullanilmayan = kolon_haritasi(basliklar, kullanici_esleme)
        if not any(s in harita for s in ("mukimlik_ulke_1", "ikamet_adresi_ulke", "vatandaslik", "dogum_ulkesi")):
            raise SystemExit("HATA: Hiçbir standart kolon eşleşmedi. Ayraç/başlıkları kontrol edin veya --esleme kullanın.")
        anahtar_mevcut = [a for a in anahtar if a in harita]
        wr = csv.writer(fout, delimiter=cikti_ayrac, quoting=csv.QUOTE_MINIMAL)
        wr.writerow(["satir_no"] + anahtar_mevcut + ["kategori", "kural_sayisi", "tetiklenen_kurallar", "en_yuksek_siddet",
                                                       "skor", "gerekce", "onerilen_aksiyon"])
        n = len(basliklar)
        for satir_no, ham in enumerate(rd, start=2):
            if not ham or not any(c.strip() for c in ham):
                continue
            satir_say += 1
            if len(ham) < n:
                ham = ham + [""] * (n - len(ham))
            v = {s: ham[i].strip() for s, i in harita.items()}
            anahtar_degerleri = [excel_guvenli(v.get(a, "")) for a in anahtar_mevcut]
            if musteri_tipi_tuzel_mu(v.get("musteri_tipi")):
                kapsam_disi += 1
                siddet_say[0] += 1
                wr.writerow([satir_no] + anahtar_degerleri + ["KAPSAM DIŞI", 0, "", "-", 0,
                            "Tüzel müşteri: bu araç yalnızca gerçek kişi öz beyanlarını test eder.",
                            "Tüzel müşteri için Aktif/Pasif NFE ve Controlling Person öz beyanını ayrıca değerlendirin."])
                continue
            try:
                hits = degerlendir(v, bugun, cbi)
            except Exception:  # veri satırını loga yazmadan genel hata say
                hata_say += 1
                wr.writerow([satir_no] + anahtar_degerleri + ["HATA", 0, "", "-", 0,
                            "Satır işlenemedi (beklenmeyen veri biçimi).", "Satırı elle kontrol edin."])
                continue
            for kid in {h[0] for h in hits}:
                kural_say[kid] += 1
            ms = en_yuksek(hits)
            siddet_say[ms] += 1
            puan = min(100, sum(SIDDET_PUAN[h[1]] for h in hits))
            kategori = "+".join(g for g in ("FATCA", "CRS") if any(RULES[h[0]]["grup"] == g for h in hits)) or "-"
            sirali = sorted(hits, key=lambda h: (-SIDDET_SIRA[h[1]], h[0]))
            wr.writerow([satir_no] + anahtar_degerleri + [
                kategori, len({h[0] for h in hits}), "; ".join(dict.fromkeys(h[0] for h in sirali)), SIDDET_ADI[ms], puan,
                " | ".join("[%s/%s] %s" % (h[0], h[1], h[2]) for h in sirali), genel_aksiyon(hits)])

    # ---- özet
    with open(ozet, "w", encoding="utf-8-sig", newline="") as f:
        w = f.write
        w("FATCA/CRS MAKULLÜK TESTİ - ÖZET (v%s)\n" % SURUM)
        w("Çalıştırma tarihi : %s\n" % datetime.datetime.now().strftime("%d.%m.%Y %H:%M"))
        w("Girdi dosyası     : %s\n" % os.path.basename(girdi))
        w("Okunan kodlama    : %s | ayraç: %r\n" % (kodlama, ay))
        w("Test tarihi (bugün): %s\n" % bugun.strftime("%d.%m.%Y"))
        w("CBI/RBI listesi   : %s (%d yargı alanı)\n" % ("cbi_rbi_listesi.txt" if cbi_ozel else "gömülü varsayılan (OECD v2)", len(cbi)))
        w("Süre              : %.2f sn\n\n" % (time.time() - t0))
        w("Toplam satır      : %d\n" % satir_say)
        w("  Hata (işlenemeyen satır): %d\n\n" % hata_say)
        w("EN YÜKSEK ŞİDDETE GÖRE SATIR SAYISI\n")
        w("  Yüksek : %d\n  Orta   : %d\n  Düşük  : %d\n  Bulgu yok : %d\n  Kapsam dışı (tüzel): %d\n\n" % (siddet_say[3], siddet_say[2], siddet_say[1], siddet_say[0] - kapsam_disi, kapsam_disi))
        w("KURAL BAŞINA TETİKLENEN SATIR SAYISI\n")
        for kid in RULES:
            if kural_say[kid]:
                w("  %s  %-7s %-6s %5d  %s\n" % (kid, RULES[kid]["grup"], RULES[kid]["siddet"], kural_say[kid], RULES[kid]["ad"]))
        w("  (Tetiklenmeyen kurallar listelenmedi.)\n\n")
        w("EŞLEŞMEYEN STANDART KOLONLAR (ilgili kurallar atlanır): %s\n" % (", ".join(eslesmeyen) if eslesmeyen else "yok"))
        w("KULLANILMAYAN GİRDİ BAŞLIKLARI: %d adet\n\n" % len(kullanilmayan))
        w("Not: Araç karar vermez; işaretlenen satırlar analist incelemesi içindir. Ayrıntı: kurallar.md\n")

    return dict(satir=satir_say, siddet=siddet_say, kural=kural_say, kapsam_disi=kapsam_disi, hata=hata_say,
                eslesmeyen=eslesmeyen, kodlama=kodlama, ayrac=ay, ozet=ozet)


# --------------------------------------------------------------------------
# 8) KENDİNİ TEST (birim kontrolleri)  ->  python makullik_testi.py --test
# --------------------------------------------------------------------------
def kendini_test():
    import unittest

    class TinTesti(unittest.TestCase):
        def test_tckn(self):
            self.assertTrue(tckn_gecerli("10000000146"))
            self.assertFalse(tckn_gecerli("10000000147"))   # son hane yanlış
            self.assertFalse(tckn_gecerli("01234567890"))   # 0 ile başlayamaz
            self.assertFalse(tckn_gecerli("1234567890"))    # 10 hane
        def test_vkn(self):
            self.assertTrue(vkn_gecerli("0540033975"))
            self.assertTrue(vkn_gecerli("1234567890"))
            self.assertFalse(vkn_gecerli("0540033976"))
            self.assertFalse(vkn_gecerli("054003397"))
        def test_us(self):
            self.assertEqual(us_tin_tur("123-45-6789"), "SSN")
            self.assertEqual(us_tin_tur("912-70-1234"), "ITIN")
            self.assertEqual(us_tin_tur("12-3456789"), "EIN")
            self.assertIsNone(us_tin_tur("000-12-3456"))   # alan 000 geçersiz
            self.assertIsNone(us_tin_tur("666-12-3456"))   # alan 666 geçersiz
            self.assertIsNone(us_tin_tur("123-00-3456"))   # grup 00 geçersiz
            self.assertIsNone(us_tin_tur("912-69-1234"))   # ITIN grup 69 geçersiz
        def test_de(self):
            self.assertTrue(de_tin_gecerli("65929970489"))
            self.assertTrue(de_tin_gecerli("86095742719"))
            self.assertFalse(de_tin_gecerli("65929970488"))
            self.assertFalse(de_tin_gecerli("12345678901"))
        def test_nl(self):
            self.assertTrue(nl_tin_gecerli("111222333"))
            self.assertFalse(nl_tin_gecerli("111222334"))
        def test_gb(self):
            self.assertTrue(gb_tin_gecerli("JG103759A"))
            self.assertTrue(gb_tin_gecerli("1234567890"))
            self.assertFalse(gb_tin_gecerli("QQ123456C"))   # Q ilk harf olamaz
            self.assertFalse(gb_tin_gecerli("AB123456E"))   # son harf A-D
        def test_fr_az_ru_ua(self):
            self.assertTrue(fr_tin_gecerli("1234567890123"))
            self.assertFalse(fr_tin_gecerli("5234567890123"))
            self.assertTrue(az_tin_gecerli("1525855852"))   # OECD AZ örneği
            self.assertTrue(az_tin_gecerli("5VBK5VR"))      # OECD AZ PIN örneği
            self.assertTrue(ru_tin_gecerli("7707083893"))
            self.assertTrue(ru_tin_gecerli("500100732259"))
            self.assertFalse(ru_tin_gecerli("500100732258"))
            self.assertTrue(ua_tin_gecerli("3184710691"))
            self.assertFalse(ua_tin_gecerli("3184710692"))
        def test_yardimcilar(self):
            self.assertEqual(ulke_coz("Türkiye"), "TR")
            self.assertEqual(ulke_coz("usa"), "US")
            self.assertEqual(ulke_coz("DEU"), "DE")
            self.assertIsNone(ulke_coz("ZZ"))
            self.assertEqual(telefon_ulkeleri("+90 532 000 00 01"), {"TR"})
            self.assertEqual(telefon_ulkeleri("0090 532 000 00 01"), {"TR"})
            self.assertEqual(telefon_ulkeleri("+1 (212) 555-0100"), NANP)
            self.assertEqual(telefon_ulkeleri("+994 50 123 45 67"), {"AZ"})
            self.assertTrue(tin_yer_tutucu_mu("123456789"))
            self.assertTrue(tin_yer_tutucu_mu("N/A"))
            self.assertFalse(tin_yer_tutucu_mu("10000000146"))

    class KuralTesti(unittest.TestCase):
        BUGUN = datetime.date(2026, 11, 27)
        def _v(self, **kw):
            v = {s: "" for s in STD_KOLONLAR}
            v.update(dict(vatandaslik="TR", ikamet_adresi_ulke="TR", posta_adresi_ulke="TR", telefon_1="+90 532 000 00 01",
                          mukimlik_ulke_1="TR", tin_1="10000000146", ozbeyan_tarihi="01.03.2024"))
            v.update(kw)
            return v
        def _ids(self, **kw):
            return {h[0] for h in degerlendir(self._v(**kw), self.BUGUN, set(CBI_RBI_VARSAYILAN))}
        def test_temiz(self):
            self.assertEqual(self._ids(), set())
        def test_abd(self):
            self.assertIn("F01", self._ids(vatandaslik="TR;US"))
            self.assertIn("F11", self._ids(vatandaslik="TR;US"))
            s = self._ids(vatandaslik="TR;US", abd_degil_ozbeyan="E", abd_olmama_belge="E")
            self.assertIn("F01", s)
            self.assertNotIn("F11", s)
            self.assertIn("F03", self._ids(ikamet_adresi_ulke="US"))
            self.assertIn("F05", self._ids(telefon_1="+1 212 555 0100"))
            self.assertIn("F08", self._ids(tek_adres_care_of_hold_mail="E"))
        def test_crs(self):
            self.assertIn("C03", self._ids(ikamet_adresi_ulke="DE"))
            self.assertIn("C08", self._ids(tin_1=""))
            self.assertIn("C10", self._ids(tin_1="", tin_yok_nedeni_1="A"))
            self.assertIn("C11", self._ids(tin_1="", tin_yok_nedeni_1="B"))
            self.assertIn("C13", self._ids(tin_1="10000000147"))
            self.assertIn("C17", self._ids(mukimlik_ulke_1="AE", ikamet_adresi_ulke="AE", posta_adresi_ulke="AE"))
            self.assertIn("C19", self._ids(ozbeyan_tarihi=""))
        def test_kural_dokumani(self):
            md = os.path.join(os.path.dirname(os.path.abspath(__file__)), "kurallar.md")
            if os.path.isfile(md):
                metin = open(md, encoding="utf-8").read()
                for kid in RULES:
                    self.assertIn("| %s |" % kid, metin, "kurallar.md içinde %s yok" % kid)

    suite = unittest.TestSuite()
    for c in (TinTesti, KuralTesti):
        suite.addTests(unittest.defaultTestLoader.loadTestsFromTestCase(c))
    sonuc = unittest.TextTestRunner(verbosity=1).run(suite)
    return 0 if sonuc.wasSuccessful() else 1


def kural_tablosu_md():
    satirlar = ["| ID | Grup | Kural | Açıklama | Kullanılan alanlar | Önem | Önerilen analist aksiyonu | Kaynak |",
                "|---|---|---|---|---|---|---|---|"]
    for kid, r in RULES.items():
        satirlar.append("| %s | %s | %s | %s | `%s` | %s | %s | %s |" % (
            kid, r["grup"], r["ad"], r["aciklama"], r["alanlar"].replace(", ", "`, `"), r["siddet"], r["aksiyon"], r["kaynak"]))
    return "\n".join(satirlar)


def main(argv=None):
    try:  # Windows konsolunda Türkçe karakter hatasını önle
        sys.stdout.reconfigure(errors="replace")
    except Exception:
        pass
    ap = argparse.ArgumentParser(description="FATCA/CRS öz beyan makullük testi (çevrimdışı, satır satır).")
    ap.add_argument("girdi", nargs="?", help="girdi CSV")
    ap.add_argument("cikti", nargs="?", help="çıktı CSV (UTF-8 BOM)")
    ap.add_argument("--esleme", help="kolon eşleme dosyası (standart_kolon = sizin_kolon)")
    ap.add_argument("--ayrac", help="girdi ayracı (varsayılan: otomatik; ; , | veya tab)")
    ap.add_argument("--cikti-ayrac", default=";", help="çıktı ayracı (varsayılan ';' - Türkçe Excel için)")
    ap.add_argument("--anahtar", help="çıktıya kopyalanacak kolonlar, virgülle (varsayılan: musteri_no,ad_soyad)")
    ap.add_argument("--ozet", help="özet txt yolu (varsayılan: <cikti>_ozet.txt)")
    ap.add_argument("--bugun", help="test tarihi YYYY-AA-GG (varsayılan: bugün)")
    ap.add_argument("--test", action="store_true", help="birim kontrollerini çalıştır")
    ap.add_argument("--kural-tablosu", action="store_true", help="kural tablosunu markdown olarak yazdır")
    a = ap.parse_args(argv)
    if a.test:
        return kendini_test()
    if a.kural_tablosu:
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass
        print(kural_tablosu_md())
        return 0
    if not a.girdi or not a.cikti:
        ap.error("girdi ve cikti dosya yolları gerekli:  python makullik_testi.py girdi.csv cikti.csv")
    if not os.path.isfile(a.girdi):
        print("HATA: Girdi dosyası bulunamadı: %s" % a.girdi)
        return 2
    if os.path.abspath(a.girdi) == os.path.abspath(a.cikti):
        print("HATA: Çıktı dosyası girdiyle aynı olamaz.")
        return 2
    bugun = None
    if a.bugun:
        bugun = tarih_coz(a.bugun)
        if not bugun:
            print("HATA: --bugun biçimi YYYY-AA-GG olmalı.")
            return 2
    try:
        r = calistir(a.girdi, a.cikti, a.esleme, a.ayrac, a.cikti_ayrac,
                     [x.strip() for x in a.anahtar.split(",")] if a.anahtar else None, a.ozet, bugun)
    except PermissionError:
        print("HATA: Dosyaya yazılamadı/okunamadı (Excel'de açık olabilir). Kapatıp tekrar deneyin.")
        return 2
    except SystemExit as e:
        print(e)
        return 2
    s = r["siddet"]
    print("Tamam. %d satır işlendi | Yüksek: %d, Orta: %d, Düşük: %d | kapsam dışı: %d, hata: %d" % (
        r["satir"], s[3], s[2], s[1], r["kapsam_disi"], r["hata"]))
    if r["eslesmeyen"]:
        print("UYARI: Eşleşmeyen standart kolonlar (ilgili kurallar atlandı): " + ", ".join(r["eslesmeyen"]))
    print("Çıktı: %s\nÖzet : %s" % (a.cikti, r["ozet"]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
