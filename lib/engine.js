// Tek kural motoru: FATCA/CRS öz beyan makullük testi.
// Katalog F01–F11 ve C01–C20, 2017 OECD CRS metni ile Türkiye–ABD Model 1 IGA Ek I'e göre.
// Ek kurallar (C21–C24, F12, R01, R02, R09, E01) formda karşılığı olan boşluklar içindir.
// Ön kontroldür; hukuki karar değildir. Ağ çağrısı yapmaz.
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.ENGINE = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var YUKSEK = 3, ORTA = 2, DUSUK = 1;
  var SEV = { 3: "Yüksek", 2: "Orta", 1: "Düşük" };
  var SEV_EN = { 3: "High", 2: "Medium", 1: "Low" };
  var CLS = { 3: "hata", 2: "manuel", 1: "uyari" };
  var PUAN = { 3: 30, 2: 10, 1: 3 };

  var KAYNAK = {
    K1: "Türkiye–ABD Model 1 IGA (29.07.2015) Ek I, Bölüm II.B(1) — ABD göstergeleri ve çürütme belgeleri",
    K2: "ABD Hazine FATCA anlaşmaları: Türkiye Model 1, yürürlük 14.06.2021",
    K4: "26 CFR §1.1471-4(c)(5)(iv)(B) — ABD göstergeleri; §1.1471-1(b) ve IRC 7701(b) ABD kişisi",
    K5: "OECD CRS 2. baskı (2017), Yorum IV. Bölüm par. 22–25 (makullük); Bölüm III.B(2) göstergeler; Bölüm VII öz beyanın geçerliliği",
    K6: "OECD CBI/RBI yüksek riskli şemalar (sayfaya gömülü tablo, sürüm 2). İkincil kaynaklar daha dar liste yazar; çelişkide OECD tablosu esas alınır",
    K7: "OECD örnek bireysel öz beyan formu — TIN yok neden kodu A / B / C",
    K8: "OECD AEOI TIN formları (TR, US, DE, NL, GB, FR, AZ, RU, UA)",
    K9: "GİB Finansal Hesap Bilgilerinin Vergi Amaçlı Otomatik Değişimi Rehberi (PDF bu çalışmada açılamadı)",
    K10: "GİB VKN doğrulama (e-Devlet). TCKN/VKN sağlama kamuya açık algoritmadır; resmî GİB belgesi olarak yeniden okunmadı"
  };

  function src() {
    var codes = Array.prototype.slice.call(arguments);
    return codes.map(function (c) { return KAYNAK[c] || c; }).join(" · ");
  }

  var RULES = {
    F01: rule("FATCA", YUKSEK, "ABD vatandaşlığı", "vatandaslik",
      "W-9 ve ABD TIN, ya da vatandaşlık kaybı belgesi (CLN) / makul açıklama",
      "W-9 and a US TIN, or a Certificate of Loss of Nationality / reasonable explanation",
      src("K1", "K4")),
    F02: rule("FATCA", YUKSEK, "ABD doğum yeri", "dogum_ulkesi",
      "W-8BEN, ABD dışı pasaport ve CLN veya vatandaşlığın edinilmediğine dair yazılı açıklama",
      "W-8BEN, a non-US passport, and a CLN or a written explanation that US citizenship was not obtained",
      src("K1", "K4")),
    F03: rule("FATCA", YUKSEK, "ABD ikamet adresi", "ikamet_adresi_ulke",
      "W-8BEN ve ABD dışı statüyü gösteren belge (pasaport veya mukimlik belgesi)",
      "W-8BEN and evidence of non-US status (passport or residence evidence)",
      src("K1", "K4")),
    F04: rule("FATCA", YUKSEK, "ABD posta adresi", "posta_adresi_ulke",
      "W-8BEN ve ABD dışı statü belgesi; posta adresinin kullanıldığının teyidi",
      "W-8BEN and evidence of non-US status; confirmation the mailing address is in use",
      src("K1", "K4")),
    F05: rule("FATCA", YUKSEK, "ABD telefonu (+1)", "telefon",
      "Numaranın ülkesini teyit eden kayıt; ABD ise W-8BEN ve ABD dışı statü belgesi",
      "A record of which country the number belongs to; if it is the US, W-8BEN and evidence of non-US status",
      src("K1", "K4")),
    F06: rule("FATCA", YUKSEK, "ABD hesabına düzenli talimat", "abd_hesabina_duzenli_talimat",
      "W-8BEN ve ABD dışı statü belgesi; talimatın amacının kaydı",
      "W-8BEN and evidence of non-US status; a note of the instruction's purpose",
      src("K1", "K4")),
    F07: rule("FATCA", YUKSEK, "ABD adresli vekil", "vekil_imza_yetkilisi_adres_ulke",
      "W-8BEN ve ABD dışı statü belgesi (vekil kaydı ile birlikte)",
      "W-8BEN and evidence of non-US status (together with the power-of-attorney record)",
      src("K1", "K4")),
    F08: rule("FATCA", ORTA, "Tek adres hold mail / care-of", "tek_adres_care_of_hold_mail",
      "Gerçek ikamet veya posta adresi belgesi",
      "Evidence of a real residence or mailing address",
      src("K1", "K4", "K5")),
    F09: rule("FATCA", YUKSEK, "ABD vergi mukimliği", "mukimlik_ulke",
      "ABD TIN (SSN, ITIN veya EIN) ve W-9",
      "A US TIN (SSN, ITIN or EIN) and Form W-9",
      src("K1", "K2")),
    F10: rule("FATCA", YUKSEK, "ABD TIN biçimi", "tin",
      "ABD TIN ile mukimlik beyanını açıklayan yazı (W-9 veya W-8BEN)",
      "A written explanation of the US TIN versus the residence declaration (W-9 or W-8BEN)",
      src("K1", "K8")),
    F11: rule("FATCA", YUKSEK, "Çürütücü belge yok", "abd_degil_ozbeyan, abd_olmama_belge",
      "ABD kişisi olmadığına dair öz beyan (W-8BEN) ve ABD dışı statü belgesi",
      "A self-certification that the customer is not a US person (W-8BEN) and evidence of non-US status",
      src("K1", "K4")),
    F12: rule("FATCA", YUKSEK, "ABD kişisi testi", "yesil_kart, gun_183, abd_kisisi_beyan",
      "W-9 ve ABD TIN; mukimlik listesine ABD eklenmeli",
      "W-9 and a US TIN; add the United States to the residence list",
      src("K4", "K1")),
    C01: rule("CRS", YUKSEK, "Vergi mukimliği yok", "mukimlik_ulke",
      "Vergi mukimliği dolu, imzalı CRS öz beyan",
      "A signed CRS self-certification that states tax residence",
      src("K5")),
    C02: rule("CRS", ORTA, "Tanınmayan ülke kodu", "ulke_alanlari",
      "ISO-2 ülke kodu ile düzeltilmiş kayıt",
      "The record corrected with an ISO-2 country code",
      src("K5")),
    C03: rule("CRS", YUKSEK, "İkamet adresi mukimlikte yok", "ikamet_adresi_ulke",
      "Yeni öz beyan, ya da makul açıklama ve belge (öğrenci, diplomat, sınır işçisi vb.)",
      "A new self-certification, or a reasonable explanation plus evidence (student, diplomat, frontier worker, etc.)",
      src("K5")),
    C04: rule("CRS", ORTA, "Posta adresi mukimlikte yok", "posta_adresi_ulke",
      "Posta adresinin açıklaması veya güncel öz beyan",
      "An explanation of the mailing address, or an updated self-certification",
      src("K5")),
    C05: rule("CRS", ORTA, "İkamet adresi ülkesi boş", "ikamet_adresi_ulke",
      "KYC kaydındaki ikamet adresi ülkesi",
      "The residence-address country from the KYC record",
      src("K5")),
    C06: rule("CRS", DUSUK, "Telefon mukimlikle örtüşmüyor", "telefon",
      "", "", src("K5")),
    C07: rule("CRS", DUSUK, "Uyruk mukimlikle örtüşmüyor", "vatandaslik",
      "", "", src("K5")),
    C08: rule("CRS", YUKSEK, "TIN ve neden kodu yok", "tin, tin_yok_nedeni",
      "TIN ya da geçerli neden kodu (A, B veya C)",
      "A TIN, or a valid reason code (A, B or C)",
      src("K5", "K7")),
    C09: rule("CRS", ORTA, "Geçersiz neden kodu", "tin_yok_nedeni",
      "A, B veya C neden kodu",
      "Reason code A, B or C",
      src("K7")),
    C10: rule("CRS", YUKSEK, "Neden A ama ülke TIN veriyor", "tin_yok_nedeni",
      "TIN (bu ülke mukimlerine TIN veya işlevsel eşdeğer verir)",
      "A TIN (this country issues a TIN or a functional equivalent to its residents)",
      src("K7", "K8")),
    C11: rule("CRS", ORTA, "Neden B açıklamasız", "tin_yok_aciklama",
      "TIN'in neden alınamadığına dair yazılı açıklama",
      "A written explanation of why a TIN could not be obtained",
      src("K7")),
    C12: rule("CRS", ORTA, "Neden C (sezgisel)", "tin_yok_nedeni",
      "TIN, ya da ülkenin TIN toplanmasını gerektirmediğine dair OECD AEOI kaydı",
      "A TIN, or an OECD AEOI note that the country does not require TIN collection",
      src("K7", "K8")),
    C13: rule("CRS", ORTA, "TIN biçimi hatalı", "tin",
      "Vergi numarası belgesi (vergi levhası, kimlik veya vergi bildirimi)",
      "A tax-number document (tax plate, identity document or tax notice)",
      src("K8", "K9")),
    C14: rule("CRS", ORTA, "Yer tutucu TIN", "tin",
      "Gerçek TIN ya da geçerli neden kodu",
      "A real TIN, or a valid reason code",
      src("K8")),
    C15: rule("CRS", ORTA, "Aynı TIN birden fazla ülke", "tin",
      "Her mukimlik ülkesi için ayrı TIN",
      "A separate TIN for each residence country",
      src("K8")),
    C16: rule("CRS", DUSUK, "Çoklu mukimlik", "mukimlik_ulke",
      "", "", src("K5")),
    C17: rule("CRS", ORTA, "CBI/RBI mukimliği", "mukimlik_ulke",
      "CBI/RBI ek soru kaydı (edinme yolu, başka oturum, 90 gün, beyanname ülkesi)",
      "A CBI/RBI questionnaire (how residence was obtained, other residence rights, 90 days, where a return was filed)",
      src("K6")),
    C18: rule("CRS", YUKSEK, "CBI/RBI ve adres başka ülkede", "mukimlik_ulke, adres",
      "Ek doğrulama (beyanname ülkesi, bulunulan gün) ve gerekirse yeni öz beyan",
      "Further checks (where a return was filed, days of presence) and, if needed, a new self-certification",
      src("K5", "K6")),
    C19: rule("CRS", ORTA, "Öz beyan tarihi geçersiz", "ozbeyan_tarihi",
      "Tarihli öz beyan",
      "A dated self-certification",
      src("K5")),
    C20: rule("CRS", ORTA, "TIN var ülke yok", "mukimlik_ulke, tin",
      "Eksik mukimlik ülkesi",
      "The missing residence country",
      src("K5")),
    C21: rule("CRS", YUKSEK, "İmza yok", "imza",
      "İmzalı veya olumlu onaylı CRS öz beyan",
      "A signed or positively affirmed CRS self-certification",
      src("K5")),
    C22: rule("CRS", ORTA, "Doğum tarihi eksik veya geçersiz", "dogum_tarihi",
      "Kimlikteki doğum tarihi",
      "The date of birth on the identity document",
      src("K5")),
    C23: rule("CRS", YUKSEK, "Ad soyad eksik", "ad_soyad",
      "Ad soyadın yazılı olduğu imzalı öz beyan",
      "A signed self-certification that states the name",
      src("K5")),
    C24: rule("CRS", YUKSEK, "KYC ülkesi mukimlikle çelişiyor", "kyc_ulke",
      "Yeni öz beyan veya KYC belgesiyle uyumlu makul açıklama ve belge",
      "A new self-certification, or a reasonable explanation and evidence consistent with the KYC file",
      src("K5")),
    R01: rule("CRS", YUKSEK, "Bilme nedeni (reason to know)", "iliski_yoneticisi",
      "İlişki yöneticisinin yazılı notu ve gerekirse yeni öz beyan",
      "The relationship manager's written note and, if needed, a new self-certification",
      src("K5")),
    R02: rule("CRS", ORTA, "Yüksek değerli hesap", "yuksek_deger",
      "İlişki yöneticisi sorgu notu",
      "The relationship manager inquiry note",
      src("K1", "K5")),
    R09: rule("CRS", ORTA, "Raporlanabilir ülke listesi", "mukimlik_ulke",
      "Kurumun güncel GİB bildirim listesi ile karşılaştırma kaydı",
      "A note comparing the country with the institution's current GİB reportable list",
      src("K5", "K9")),
    E01: rule("CRS", ORTA, "Tüzel müşteri kapsam dışı", "musteri_tipi",
      "W-8BEN-E ve kontrol eden kişi öz beyanı (bu ekran gerçek kişi içindir)",
      "Form W-8BEN-E and a controlling-person self-certification (this screen is for individuals)",
      src("K1", "K5"))
  };

  function rule(group, rank, title, fields, doc, docEn, source) {
    return { group: group, rank: rank, title: title, fields: fields, doc: doc, docEn: docEn, source: source };
  }

  var CURE_DOC = "Dosyadaki ABD dışı öz beyanı ve statü belgesini gözle doğrulayın (doğum yeri ABD ise CLN veya yazılı açıklama da aranır).";
  var CURE_DOC_EN = "Sight the non-US self-certification and status evidence on file (if the place of birth is the US, also look for a CLN or a written explanation).";

  var ISO2 = isoSet("AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW XK");

  var ISO3 = {
    TUR: "TR", USA: "US", DEU: "DE", NLD: "NL", GBR: "GB", FRA: "FR", AZE: "AZ", RUS: "RU", UKR: "UA",
    ITA: "IT", ESP: "ES", CHE: "CH", AUT: "AT", BEL: "BE", SWE: "SE", NOR: "NO", DNK: "DK", FIN: "FI",
    GRC: "GR", CYP: "CY", BGR: "BG", ROU: "RO", POL: "PL", CZE: "CZ", HUN: "HU", PRT: "PT", IRL: "IE",
    LUX: "LU", MLT: "MT", ARE: "AE", SAU: "SA", QAT: "QA", KWT: "KW", BHR: "BH", OMN: "OM", ISR: "IL",
    IRN: "IR", IRQ: "IQ", SYR: "SY", LBN: "LB", JOR: "JO", EGY: "EG", GEO: "GE", ARM: "AM", KAZ: "KZ",
    UZB: "UZ", TKM: "TM", KGZ: "KG", BLR: "BY", MDA: "MD", LTU: "LT", LVA: "LV", EST: "EE", SRB: "RS",
    MNE: "ME", BIH: "BA", HRV: "HR", SVN: "SI", MKD: "MK", ALB: "AL", CAN: "CA", MEX: "MX", BRA: "BR",
    ARG: "AR", CHN: "CN", HKG: "HK", JPN: "JP", KOR: "KR", IND: "IN", PAK: "PK", SGP: "SG", MYS: "MY",
    AUS: "AU", NZL: "NZ", ZAF: "ZA", NGA: "NG", MAR: "MA", DZA: "DZ", TUN: "TN", LBY: "LY", ATG: "AG",
    BHS: "BS", BRB: "BB", DMA: "DM", GRD: "GD", KNA: "KN", LCA: "LC", SYC: "SC", TCA: "TC", VUT: "VU",
    PAN: "PA", CYM: "KY", VGB: "VG", MCO: "MC", LIE: "LI", AND: "AD"
  };

  var ADLAR = {
    turkiye: "TR", turkey: "TR", "turkiye cumhuriyeti": "TR", abd: "US", amerika: "US",
    "amerika birlesik devletleri": "US", "united states": "US", "united states of america": "US", usa: "US",
    almanya: "DE", germany: "DE", hollanda: "NL", netherlands: "NL", "birlesik krallik": "GB",
    ingiltere: "GB", "united kingdom": "GB", uk: "GB", "buyuk britanya": "GB", fransa: "FR", france: "FR",
    azerbaycan: "AZ", azerbaijan: "AZ", rusya: "RU", russia: "RU", "rusya federasyonu": "RU",
    ukrayna: "UA", ukraine: "UA", kibris: "CY", cyprus: "CY", kkc: "CY", "birlesik arap emirlikleri": "AE",
    bae: "AE", uae: "AE", dubai: "AE", italya: "IT", ispanya: "ES", isvicre: "CH", avusturya: "AT",
    belcika: "BE", isvec: "SE", norvec: "NO", yunanistan: "GR", gurcistan: "GE", kazakistan: "KZ",
    bulgaristan: "BG", romanya: "RO", polonya: "PL", kanada: "CA", canada: "CA", iran: "IR",
    irak: "IQ", suriye: "SY", lubnan: "LB", misir: "EG", cin: "CN", japonya: "JP",
    hindistan: "IN", pakistan: "PK", bahamalar: "BS", bahamas: "BS", barbados: "BB", panama: "PA",
    seyseller: "SC", seychelles: "SC", vanuatu: "VU", bahreyn: "BH", bahrain: "BH", dominika: "DM",
    dominica: "DM", grenada: "GD", "saint lucia": "LC", "st lucia": "LC", "antigua ve barbuda": "AG",
    "antigua and barbuda": "AG", "saint kitts ve nevis": "KN", "saint kitts and nevis": "KN",
    "turks ve caicos": "TC", "turks and caicos": "TC"
  };

  var NANP = isoSet("US CA AG AI AS BB BM BS DM DO GD GU JM KN KY LC MP MS PR SX TC TT VC VG VI");
  var CC = { "1": NANP };
  addCc("7", "RU KZ"); addCc("20", "EG"); addCc("27", "ZA"); addCc("30", "GR"); addCc("31", "NL");
  addCc("32", "BE"); addCc("33", "FR"); addCc("34", "ES"); addCc("36", "HU"); addCc("39", "IT VA");
  addCc("40", "RO"); addCc("41", "CH"); addCc("43", "AT"); addCc("44", "GB GG JE IM"); addCc("45", "DK");
  addCc("46", "SE"); addCc("47", "NO SJ"); addCc("48", "PL"); addCc("49", "DE"); addCc("51", "PE");
  addCc("52", "MX"); addCc("53", "CU"); addCc("54", "AR"); addCc("55", "BR"); addCc("56", "CL");
  addCc("57", "CO"); addCc("58", "VE"); addCc("60", "MY"); addCc("61", "AU"); addCc("62", "ID");
  addCc("63", "PH"); addCc("64", "NZ"); addCc("65", "SG"); addCc("66", "TH"); addCc("81", "JP");
  addCc("82", "KR"); addCc("84", "VN"); addCc("86", "CN"); addCc("90", "TR"); addCc("91", "IN");
  addCc("92", "PK"); addCc("93", "AF"); addCc("94", "LK"); addCc("95", "MM"); addCc("98", "IR");
  addCc("212", "MA"); addCc("213", "DZ"); addCc("216", "TN"); addCc("218", "LY"); addCc("234", "NG");
  addCc("254", "KE"); addCc("351", "PT"); addCc("352", "LU"); addCc("353", "IE"); addCc("354", "IS");
  addCc("355", "AL"); addCc("356", "MT"); addCc("357", "CY"); addCc("358", "FI AX"); addCc("359", "BG");
  addCc("370", "LT"); addCc("371", "LV"); addCc("372", "EE"); addCc("373", "MD"); addCc("374", "AM");
  addCc("375", "BY"); addCc("376", "AD"); addCc("377", "MC"); addCc("380", "UA"); addCc("381", "RS");
  addCc("382", "ME"); addCc("383", "XK"); addCc("385", "HR"); addCc("386", "SI"); addCc("387", "BA");
  addCc("389", "MK"); addCc("420", "CZ"); addCc("421", "SK"); addCc("423", "LI"); addCc("852", "HK");
  addCc("853", "MO"); addCc("855", "KH"); addCc("880", "BD"); addCc("886", "TW"); addCc("961", "LB");
  addCc("962", "JO"); addCc("963", "SY"); addCc("964", "IQ"); addCc("965", "KW"); addCc("966", "SA");
  addCc("967", "YE"); addCc("968", "OM"); addCc("971", "AE"); addCc("972", "IL"); addCc("973", "BH");
  addCc("974", "QA"); addCc("975", "BT"); addCc("976", "MN"); addCc("977", "NP"); addCc("992", "TJ");
  addCc("993", "TM"); addCc("994", "AZ"); addCc("995", "GE"); addCc("996", "KG"); addCc("998", "UZ");

  var TIN_VEREN = isoSet("TR US DE NL GB FR AZ RU UA");
  var CBI = isoSet("AG BS BH BB CY DM GD KN LC SC TC AE VU");
  var CBI_KISMI = isoSet("PA");
  var REPORTABLE = isoSet("AD AE AG AI AL AR AT AU AW AZ BB BE BG BH BM BN BR BS BZ CA CH CK CL CN CO CR CW CY CZ DE DK DM EC EE ES FI FO FR GB GD GE GG GH GI GL GR HK HR HU ID IE IL IM IN IS IT JE JM JP KE KN KR KW KY KZ LB LC LI LR LT LU LV MA MC MD ME MH MO MS MT MU MV MX MY NC NG NL NO NR NU NZ OM PA PE PK PL PT QA RO RU RW SA SC SE SG SI SK SM SX TC TH TR UA UG UY VC VG VU WS ZA");

  var PLACEHOLDER = {
    "NA": 1, "N/A": 1, "NONE": 1, "YOK": 1, "YOKTUR": 1, "NULL": 1, "-": 1, "--": 1, "XXX": 1,
    "XXXXXXXXX": 1, "TEST": 1, "BILINMIYOR": 1, "TBD": 1, "NIL": 1, "NAN": 1, "BELIRTILMEDI": 1, "0": 1
  };
  var EVET = { e: 1, evet: 1, y: 1, yes: 1, "1": 1, "true": 1, x: 1, var: 1, dogru: 1, "doğru": 1 };
  var HAYIR = { h: 1, hayir: 1, "hayır": 1, n: 1, no: 1, "0": 1, "false": 1, yok: 1, yanlis: 1, "yanlış": 1 };
  var TUZEL = { t: 1, tuzel: 1, kurum: 1, kurumsal: 1, sirket: 1, entity: 1, legal: 1, corporate: 1, organization: 1, organisation: 1 };

  var STD = [
    "musteri_no", "ad_soyad", "musteri_tipi", "vatandaslik", "dogum_ulkesi", "ikamet_adresi_ulke", "posta_adresi_ulke",
    "tek_adres_care_of_hold_mail", "telefon_1", "telefon_2", "telefon_3",
    "mukimlik_ulke_1", "tin_1", "tin_yok_nedeni_1", "mukimlik_ulke_2", "tin_2", "tin_yok_nedeni_2",
    "mukimlik_ulke_3", "tin_3", "tin_yok_nedeni_3", "tin_yok_aciklama",
    "abd_hesabina_duzenli_talimat", "vekil_imza_yetkilisi_adres_ulke", "abd_degil_ozbeyan", "abd_olmama_belge",
    "ozbeyan_tarihi"
  ];
  var ALIAS = {
    musteri_no: ["musterino", "musteri_numarasi", "cif", "customerid", "customer_no"],
    ad_soyad: ["adsoyad", "unvan", "musteri_adi", "name", "fullname"],
    musteri_tipi: ["tip", "musteritipi", "customer_type", "accountholdertype"],
    vatandaslik: ["uyruk", "uyrugu", "nationality", "citizenship"],
    dogum_ulkesi: ["dogum_yeri_ulke", "dogumulkesi", "birth_country", "country_of_birth", "birthcountry"],
    ikamet_adresi_ulke: ["ikamet_ulke", "ev_adresi_ulke", "residential_country", "addresscountry"],
    posta_adresi_ulke: ["posta_ulke", "yazisma_adresi_ulke", "mailing_country", "mailcountry"],
    tek_adres_care_of_hold_mail: ["hold_mail", "care_of", "posta_tutma", "holdmailsole"],
    telefon_1: ["telefon", "phone", "phones", "phone1"],
    ozbeyan_tarihi: ["ozbeyan_tarih", "selfcert_date", "declarationdate", "beyantarihi"],
    abd_hesabina_duzenli_talimat: ["standingus"],
    vekil_imza_yetkilisi_adres_ulke: ["poacountry"],
    abd_degil_ozbeyan: ["nonuscert"],
    abd_olmama_belge: ["nonusevidence"],
    tin_yok_aciklama: ["notinexplanation"]
  };

  function isoSet(s) {
    var out = new Set();
    s.split(/\s+/).forEach(function (c) { if (c) out.add(c); });
    return out;
  }
  function addCc(code, isos) { CC[code] = isoSet(isos); }

  function trAscii(s) {
    var map = { "İ": "i", "I": "i", "ı": "i", "Ş": "s", "ş": "s", "Ğ": "g", "ğ": "g", "Ü": "u", "ü": "u", "Ö": "o", "ö": "o", "Ç": "c", "ç": "c" };
    var out = "";
    var str = String(s == null ? "" : s);
    for (var i = 0; i < str.length; i++) out += map[str[i]] || str[i];
    out = out.toLowerCase();
    if (typeof out.normalize === "function") out = out.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
    return out;
  }
  function kolonNorm(s) { return trAscii(s).replace(/[^a-z0-9]/g, ""); }

  function ulkeCoz(s) {
    if (s == null) return null;
    s = String(s).trim();
    if (!s) return null;
    var u = s.toUpperCase();
    if (u.length === 2 && /^[A-Z]{2}$/.test(u)) {
      if (u === "UK") return "GB";
      return ISO2.has(u) ? u : null;
    }
    if (u.length === 3 && /^[A-Z]{3}$/.test(u) && ISO3[u]) return ISO3[u];
    var ad = trAscii(s).replace(/\./g, "").replace(/\s+/g, " ").trim();
    return ADLAR[ad] || null;
  }

  function ulkeListesi(s) {
    var codes = [], unknown = 0;
    String(s == null ? "" : s).split(/[;,/|]+/).forEach(function (part) {
      part = part.trim();
      if (!part) return;
      var k = ulkeCoz(part);
      if (k) codes.push(k);
      else unknown += 1;
    });
    return { codes: codes, unknown: unknown };
  }

  function eh(s) {
    if (s === true) return true;
    if (s === false) return false;
    var v = String(s == null ? "" : s).trim().toLowerCase();
    if (!v) return null;
    if (EVET[v]) return true;
    if (HAYIR[v]) return false;
    return null;
  }

  function pad(n) { return String(n).padStart(2, "0"); }
  function ymd(y, m, d) {
    if (!y || m < 1 || m > 12 || d < 1 || d > 31) return null;
    var dt = new Date(Date.UTC(y, m - 1, d));
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
    return y * 10000 + m * 100 + d;
  }
  function tarihCoz(s) {
    s = String(s == null ? "" : s).trim();
    if (!s) return null;
    var m;
    if (/^\d{8}$/.test(s)) return ymd(+s.slice(0, 4), +s.slice(4, 6), +s.slice(6, 8));
    var head = s.slice(0, 10);
    if ((m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(head))) return ymd(+m[3], +m[2], +m[1]);
    if ((m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(head))) return ymd(+m[3], +m[2], +m[1]);
    if ((m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(head))) return ymd(+m[3], +m[2], +m[1]);
    if ((m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(head))) return ymd(+m[1], +m[2], +m[3]);
    if ((m = /^(\d{4})\.(\d{2})\.(\d{2})$/.exec(head))) return ymd(+m[1], +m[2], +m[3]);
    if ((m = /^(\d{4})\/(\d{2})\/(\d{2})$/.exec(head))) return ymd(+m[1], +m[2], +m[3]);
    return null;
  }
  function todayNum(opts) {
    if (opts && opts.today) {
      var t = tarihCoz(opts.today);
      if (t) return t;
    }
    var d = new Date();
    return ymd(d.getFullYear(), d.getMonth() + 1, d.getDate());
  }

  function telefonUlkeleri(tel) {
    var p = String(tel == null ? "" : tel).replace(/[\s\-().]/g, "");
    if (!p) return null;
    var d;
    if (p[0] === "+") d = p.slice(1);
    else if (p.slice(0, 2) === "00") d = p.slice(2);
    else if (p[0] === "0" && p.length >= 10) return isoSet("TR");
    else if (/^5\d{9}$/.test(p)) return isoSet("TR");
    else return null;
    if (!/^\d+$/.test(d)) return null;
    var n, key;
    for (n = 3; n >= 1; n--) {
      key = d.slice(0, n);
      if (CC[key]) return CC[key];
    }
    return null;
  }

  function tinTemizle(t) { return String(t == null ? "" : t).replace(/[\s\-./]/g, "").toUpperCase(); }

  function tinYerTutucu(ham) {
    var t = tinTemizle(ham);
    if (!t) return false;
    var raw = String(ham == null ? "" : ham).trim().toUpperCase();
    if (PLACEHOLDER[t] || PLACEHOLDER[raw]) return true;
    if (/^\d+$/.test(t)) {
      var uniq = {};
      for (var i = 0; i < t.length; i++) uniq[t[i]] = 1;
      if (Object.keys(uniq).length === 1) return true;
      if (t.length >= 6 && ("01234567890123456789".indexOf(t) !== -1 || "98765432109876543210".indexOf(t) !== -1)) return true;
    }
    return false;
  }

  function mod(n, m) { return ((n % m) + m) % m; }

  function tcknGecerli(s) {
    if (!/^\d{11}$/.test(s || "") || s[0] === "0") return false;
    var d = s.split("").map(Number);
    var d10 = mod((d[0] + d[2] + d[4] + d[6] + d[8]) * 7 - (d[1] + d[3] + d[5] + d[7]), 10);
    if (d10 !== d[9]) return false;
    return mod(d[0] + d[1] + d[2] + d[3] + d[4] + d[5] + d[6] + d[7] + d[8] + d[9], 10) === d[10];
  }
  function vknGecerli(s) {
    if (!/^\d{10}$/.test(s || "")) return false;
    var d = s.split("").map(Number);
    var toplam = 0;
    for (var i = 0; i < 9; i++) {
      var t = (d[i] + (9 - i)) % 10;
      var r = (t * Math.pow(2, 9 - i)) % 9;
      if (t !== 0 && r === 0) r = 9;
      toplam += r;
    }
    return (10 - (toplam % 10)) % 10 === d[9];
  }
  function trTinGecerli(s) {
    if (s.length === 11) return tcknGecerli(s);
    if (s.length === 10) return vknGecerli(s);
    return false;
  }
  function deTinGecerli(s) {
    if (!/^\d{11}$/.test(s || "") || s[0] === "0") return false;
    var ilk = s.slice(0, 10);
    var sayim = {};
    for (var i = 0; i < ilk.length; i++) sayim[ilk[i]] = (sayim[ilk[i]] || 0) + 1;
    var tekrar = Object.keys(sayim).map(function (k) { return sayim[k]; }).filter(function (v) { return v > 1; });
    if (tekrar.length !== 1 || tekrar[0] > 3) return false;
    if (/(\d)\1\1/.test(ilk)) return false;
    var p = 10;
    for (var j = 0; j < ilk.length; j++) {
      var t = (Number(ilk[j]) + p) % 10;
      if (t === 0) t = 10;
      p = (2 * t) % 11;
    }
    var k = 11 - p;
    if (k === 10) k = 0;
    return k === Number(s[10]);
  }
  function nlTinGecerli(s) {
    if (!/^\d{9}$/.test(s || "")) return false;
    var w = [9, 8, 7, 6, 5, 4, 3, 2];
    var toplam = 0;
    for (var i = 0; i < 8; i++) toplam += Number(s[i]) * w[i];
    var k = toplam % 11;
    return k !== 10 && k === Number(s[8]);
  }
  function gbTinGecerli(s) {
    if (/^\d{10}$/.test(s || "")) return true;
    if (/^[A-CEGHJ-PR-TW-Z][A-CEGHJ-NPR-TW-Z]\d{6}[A-D]$/.test(s || "")) {
      return ["BG", "GB", "KN", "NK", "NT", "TN", "ZZ"].indexOf(s.slice(0, 2)) === -1;
    }
    return false;
  }
  function frTinGecerli(s) { return /^[0-3]\d{12}$/.test(s || ""); }
  function azTinGecerli(s) {
    if (/^\d{9}[12]$/.test(s || "")) return true;
    return /^[A-NP-Z0-9]{7}$/.test(s || "");
  }
  function ruTinGecerli(s) {
    function chk(str, w) {
      var sum = 0;
      for (var i = 0; i < w.length; i++) sum += w[i] * Number(str[i]);
      return mod(sum % 11, 10);
    }
    if (/^\d{10}$/.test(s || "")) return Number(s[9]) === chk(s, [2, 4, 10, 3, 5, 9, 4, 6, 8]);
    if (/^\d{12}$/.test(s || "")) {
      var c1 = chk(s, [7, 2, 4, 10, 3, 5, 9, 4, 6, 8]);
      var c2 = chk(s, [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8]);
      return c1 === Number(s[10]) && c2 === Number(s[11]);
    }
    return false;
  }
  function uaTinGecerli(s) {
    if (/^\d{10}$/.test(s || "")) {
      var w = [-1, 5, 7, 9, 4, 6, 10, 5, 7];
      var sum = 0;
      for (var i = 0; i < 9; i++) sum += w[i] * Number(s[i]);
      return mod(mod(sum, 11), 10) === Number(s[9]);
    }
    return /^\d{8}$/.test(s || "");
  }
  function usTinTur(ham) {
    var h = String(ham == null ? "" : ham).trim();
    if (/^\d{2}-\d{7}$/.test(h)) return "EIN";
    var t = h.replace(/[\s-]/g, "");
    if (!/^\d{9}$/.test(t)) return null;
    var a = +t.slice(0, 3), g = +t.slice(3, 5), ser = +t.slice(5);
    if (g === 0 || ser === 0 || a === 0) return null;
    if (t[0] === "9") {
      if ((g >= 50 && g <= 65) || (g >= 70 && g <= 88) || (g >= 90 && g <= 92) || (g >= 94 && g <= 99)) return "ITIN";
      return null;
    }
    if (a === 666) return null;
    return "SSN";
  }
  function usTinGecerli(ham) { return usTinTur(ham) != null; }

  function tinRules() {
    if (typeof TinRules !== "undefined" && TinRules && TinRules.tinCountryCheck) return TinRules;
    if (typeof require === "function") {
      try { return require("./tin-rules.js"); } catch (e) { return null; }
    }
    return null;
  }

  function tinDogrula(ulke, ham) {
    var t = tinTemizle(ham);
    if (ulke === "US") return usTinGecerli(ham) ? "ok" : "hata";
    var fn = { TR: trTinGecerli, DE: deTinGecerli, NL: nlTinGecerli, GB: gbTinGecerli, FR: frTinGecerli, AZ: azTinGecerli, RU: ruTinGecerli, UA: uaTinGecerli }[ulke];
    if (fn) return fn(t) ? "ok" : "hata";
    var bundle = null;
    var lib = tinRules();
    if (lib) {
      try { bundle = lib.tinCountryCheck(ulke, String(ham == null ? "" : ham).trim()); } catch (e) { bundle = null; }
      if (bundle && bundle.ok === true) return "ok";
      if (bundle && bundle.ok === false) return "hata";
    }
    return /^[A-Z0-9]{4,20}$/.test(t) ? "ok" : "hata";
  }

  function down(rank) { return rank === YUKSEK ? ORTA : rank === ORTA ? DUSUK : DUSUK; }

  function has(obj, key) { return obj != null && Object.prototype.hasOwnProperty.call(obj, key); }

  function rowToRecord(cols) {
    cols = cols || {};
    function g(k) { return has(cols, k) ? cols[k] : ""; }
    var rec = {
      musteriNo: g("musteri_no"),
      musteriTipi: g("musteri_tipi"),
      vatandaslik: g("vatandaslik"),
      dogumUlkesi: g("dogum_ulkesi"),
      ikamet: g("ikamet_adresi_ulke"),
      posta: g("posta_adresi_ulke"),
      holdMail: g("tek_adres_care_of_hold_mail"),
      telefon: [g("telefon_1"), g("telefon_2"), g("telefon_3")],
      slots: [1, 2, 3].map(function (i) {
        return { ulke: g("mukimlik_ulke_" + i), tin: g("tin_" + i), neden: g("tin_yok_nedeni_" + i) };
      }),
      aciklama: g("tin_yok_aciklama"),
      standingUs: g("abd_hesabina_duzenli_talimat"),
      vekilUlke: g("vekil_imza_yetkilisi_adres_ulke"),
      nonUsCert: g("abd_degil_ozbeyan"),
      nonUsEvidence: g("abd_olmama_belge"),
      ozbeyanTarihi: g("ozbeyan_tarihi")
    };
    if (has(cols, "ad_soyad")) rec.fullName = cols.ad_soyad;
    if (has(cols, "dateOfBirth")) rec.dateOfBirth = cols.dateOfBirth;
    if (has(cols, "signed")) rec.signed = cols.signed;
    if (has(cols, "kycCountry")) rec.kycCountry = cols.kycCountry;
    ["usPersonDeclared", "usGreenCard", "usDays183", "highValue", "rmKnowsReportable"].forEach(function (k) {
      if (has(cols, k)) rec[k] = cols[k];
    });
    return rec;
  }

  function formToRecord(v) {
    v = v || {};
    var phones = String(v.phones || "").split(/[,;]/).map(function (x) { return x.trim(); }).filter(Boolean);
    var p1 = v.phone1 || phones[0] || "";
    var p2 = v.phone2 || phones[1] || "";
    var p3 = v.phone3 || phones[2] || "";
    var slots = [1, 2, 3].map(function (i) {
      return {
        ulke: v["res" + i] || "",
        tin: v["tin" + i] || "",
        neden: v["reason" + i] || ""
      };
    });
    if (!String(slots[0].ulke).trim() && v.residenceCountry) slots[0].ulke = v.residenceCountry;
    if (!String(slots[0].tin).trim() && v.tin) slots[0].tin = v.tin;
    if (!String(slots[0].neden).trim() && v.noTinReason) slots[0].neden = v.noTinReason;
    if (v.taxResidences) {
      var list = String(v.taxResidences).split(/[,;]/).map(function (x) { return x.trim(); }).filter(Boolean);
      list.forEach(function (c, idx) {
        if (idx < 3 && !String(slots[idx].ulke).trim()) slots[idx].ulke = c;
      });
    }
    var cols = {
      ad_soyad: v.fullName == null ? "" : v.fullName,
      musteri_tipi: v.accountHolderType === "entity" ? "T" : (v.accountHolderType || "G"),
      vatandaslik: v.citizenship || "",
      dogum_ulkesi: v.birthCountry || "",
      ikamet_adresi_ulke: v.addressCountry || "",
      posta_adresi_ulke: v.mailCountry || "",
      tek_adres_care_of_hold_mail: (v.holdMailSole || (v.careOf && v.soleAddress)) ? "E" : "H",
      telefon_1: p1, telefon_2: p2, telefon_3: p3,
      mukimlik_ulke_1: slots[0].ulke, tin_1: slots[0].tin, tin_yok_nedeni_1: slots[0].neden,
      mukimlik_ulke_2: slots[1].ulke, tin_2: slots[1].tin, tin_yok_nedeni_2: slots[1].neden,
      mukimlik_ulke_3: slots[2].ulke, tin_3: slots[2].tin, tin_yok_nedeni_3: slots[2].neden,
      tin_yok_aciklama: v.noTinExplanation || "",
      abd_hesabina_duzenli_talimat: v.standingUs ? "E" : "H",
      vekil_imza_yetkilisi_adres_ulke: v.poaCountry || (v.usPoa ? "US" : ""),
      abd_degil_ozbeyan: v.nonUsCert ? "E" : "H",
      abd_olmama_belge: v.nonUsEvidence ? "E" : "H",
      ozbeyan_tarihi: v.declarationDate || "",
      dateOfBirth: v.dateOfBirth == null ? "" : v.dateOfBirth,
      signed: v.signed === true,
      kycCountry: v.kycCountry || "",
      usPersonDeclared: v.usPersonDeclared === true,
      usGreenCard: v.usGreenCard === true,
      usDays183: v.usDays183 === true,
      highValue: v.highValue === true,
      rmKnowsReportable: v.rmKnowsReportable === true
    };
    return rowToRecord(cols);
  }

  function isBlankRecord(rec) {
    var bits = [rec.fullName, rec.vatandaslik, rec.dogumUlkesi, rec.ikamet, rec.posta, rec.ozbeyanTarihi, rec.kycCountry, rec.vekilUlke, rec.aciklama, rec.dateOfBirth];
    (rec.telefon || []).forEach(function (t) { bits.push(t); });
    (rec.slots || []).forEach(function (s) { bits.push(s.ulke, s.tin, s.neden); });
    if (bits.some(function (x) { return String(x == null ? "" : x).trim(); })) return false;
    if (eh(rec.holdMail) === true || eh(rec.standingUs) === true || eh(rec.nonUsCert) === true || eh(rec.nonUsEvidence) === true) return false;
    if (rec.usPersonDeclared || rec.usGreenCard || rec.usDays183 || rec.highValue || rec.rmKnowsReportable || rec.signed === true) return false;
    return true;
  }

  function tuzelMi(s) { return !!TUZEL[trAscii(String(s == null ? "" : s).trim())]; }

  function ekle(hits, id, tr, en, rank, extra) {
    var ruleDef = RULES[id];
    var r = rank == null ? ruleDef.rank : rank;
    var cured = extra && extra.cured;
    hits.push({
      id: id,
      group: ruleDef.group,
      title: ruleDef.title,
      rank: r,
      severity: SEV[r],
      severityEn: SEV_EN[r],
      cls: CLS[r],
      msg: tr,
      msgEn: en,
      doc: cured ? CURE_DOC : ruleDef.doc,
      docEn: cured ? CURE_DOC_EN : ruleDef.docEn,
      source: ruleDef.source,
      evidence: ruleDef.fields,
      cured: !!cured
    });
  }

  function evaluate(rec, opts) {
    opts = opts || {};
    rec = rec || {};
    var bugun = todayNum(opts);
    var hits = [];
    if (tuzelMi(rec.musteriTipi)) {
      ekle(hits, "E01",
        "Tüzel müşteri: bu kontrol yalnızca gerçek kişi öz beyanı içindir.",
        "Entity customer: this check covers individual self-certifications only.",
        ORTA);
      return finish(hits, "entity");
    }

    var uyruk = ulkeListesi(rec.vatandaslik);
    var dogum = ulkeCoz(rec.dogumUlkesi);
    var ikamet = ulkeCoz(rec.ikamet);
    var posta = ulkeCoz(rec.posta);
    var vekil = ulkeListesi(rec.vekilUlke);
    var gecersiz = [];
    if (uyruk.unknown) gecersiz.push("vatandaslik");
    if (String(rec.dogumUlkesi || "").trim() && !dogum) gecersiz.push("dogum_ulkesi");
    if (String(rec.ikamet || "").trim() && !ikamet) gecersiz.push("ikamet_adresi_ulke");
    if (String(rec.posta || "").trim() && !posta) gecersiz.push("posta_adresi_ulke");
    if (vekil.unknown) gecersiz.push("vekil_imza_yetkilisi_adres_ulke");

    var slots = (rec.slots || []).slice(0, 3);
    while (slots.length < 3) slots.push({ ulke: "", tin: "", neden: "" });
    var mukim = [];
    var parsed = slots.map(function (s, idx) {
      var ham = String(s.ulke || "").trim();
      var k = ham ? ulkeCoz(ham) : null;
      if (ham && !k) gecersiz.push("mukimlik_ulke_" + (idx + 1));
      if (k) mukim.push(k);
      return { i: idx + 1, k: k, ham: ham, tin: String(s.tin || "").trim(), neden: String(s.neden || "").trim() };
    });
    var R = mukim.slice();
    var Rset = {};
    R.forEach(function (c) { Rset[c] = 1; });

    var cure = eh(rec.nonUsCert) === true && eh(rec.nonUsEvidence) === true;
    var fatcaTemel = [];
    function fatcaEkle(id, tr, en, rank) {
      fatcaTemel.push(id);
      var s = rank == null ? RULES[id].rank : rank;
      var cured = false;
      if (cure) {
        s = down(s);
        cured = true;
        tr += " ABD dışı öz beyan ve belge kaydı var: önem bir kademe düşürüldü; belgeyi gözle doğrulayın.";
        en += " A non-US self-certification and evidence are on file: severity lowered one step; sight the documents.";
      }
      ekle(hits, id, tr, en, s, { cured: cured });
    }

    if (uyruk.codes.indexOf("US") !== -1) fatcaEkle("F01", "Uyruk alanında ABD var.", "The nationality field includes the US.");
    if (dogum === "US") fatcaEkle("F02", "Doğum ülkesi ABD.", "Country of birth is the US.");
    if (ikamet === "US") fatcaEkle("F03", "İkamet adresi ülkesi ABD.", "The residence address is in the US.");
    if (posta === "US") fatcaEkle("F04", "Posta adresi ülkesi ABD.", "The mailing address is in the US.");

    var telSets = [];
    (rec.telefon || []).forEach(function (tel) {
      var k = telefonUlkeleri(tel);
      if (k) telSets.push(k);
    });
    var nanpTels = telSets.filter(function (k) { return k === NANP; });
    if (nanpTels.length) {
      var sadece = nanpTels.length === telSets.length;
      var sev = sadece ? YUKSEK : ORTA;
      var trN = "+1 (ABD/Kanada/Karayip) telefon var; " + (sadece ? "bilinen tek telefon bu." : "ABD dışı telefon da kayıtlı.");
      var enN = "A +1 (US/Canada/Caribbean) phone is present; " + (sadece ? "it is the only known phone." : "a non-US phone is also on file.");
      var nanpMukim = R.some(function (c) { return c !== "US" && NANP.has(c); });
      if (nanpMukim && R.indexOf("US") === -1) {
        sev = down(sev);
        trN += " Kanada/Karayip mukimliği beyan edildiği için önem düşürüldü.";
        enN += " Severity was lowered because a Canadian or Caribbean residence was declared.";
      }
      fatcaEkle("F05", trN, enN, sev);
    }
    if (eh(rec.standingUs) === true) fatcaEkle("F06", "ABD'deki hesaba düzenli ödeme talimatı var.", "There is a standing instruction to pay a US account.");
    if (vekil.codes.indexOf("US") !== -1) fatcaEkle("F07", "ABD adresli vekil veya imza yetkilisi var.", "An attorney or signatory has a US address.");
    if (eh(rec.holdMail) === true) {
      ekle(hits, "F08", "Kayıtlı tek adres in-care-of veya hold-mail adresi.", "The only address on file is an in-care-of or hold-mail address.");
    }
    if (R.indexOf("US") !== -1) {
      ekle(hits, "F09", "Vergi mukimliği olarak ABD beyan edilmiş.", "The United States was declared as a tax residence.");
    }

    parsed.forEach(function (slot) {
      if (!slot.tin || tinYerTutucu(slot.tin)) return;
      var tur = usTinTur(slot.tin);
      var dash = /^\d{3}-\d{2}-\d{4}$/.test(slot.tin) || /^\d{2}-\d{7}$/.test(slot.tin);
      if (tur && (slot.k === "US" || dash)) {
        var extra = slot.k === "US" ? "" : " (mukimlik ABD değil)";
        var extraEn = slot.k === "US" ? "" : " (residence is not the US)";
        ekle(hits, "F10", "tin_" + slot.i + " alanı ABD " + tur + " biçiminde" + extra + ".", "tin_" + slot.i + " is in US " + tur + " form" + extraEn + ".");
      }
    });

    if (fatcaTemel.length && !cure) {
      var ids = fatcaTemel.filter(function (id, i) { return fatcaTemel.indexOf(id) === i; }).sort();
      ekle(hits, "F11",
        "Tetiklenen ABD göstergeleri: " + ids.join(", ") + "; ABD dışı öz beyan ve belge birlikte kayıtlı değil.",
        "US indicia triggered: " + ids.join(", ") + "; a non-US self-certification and evidence are not both on file.");
    }

    if (rec.usPersonDeclared === true || rec.usGreenCard === true || rec.usDays183 === true) {
      if (R.indexOf("US") === -1) {
        ekle(hits, "F12",
          "ABD kişisi işareti var (beyan, yeşil kart veya 183 gün) fakat mukimlik listesinde ABD yok.",
          "A US-person flag is set (declaration, green card or 183 days) but the US is not a declared residence.");
      }
    }

    if (gecersiz.length) {
      var alan = gecersiz.filter(function (a, i) { return gecersiz.indexOf(a) === i; }).sort();
      ekle(hits, "C02", "Tanınmayan ülke değeri: " + alan.join(", ") + ".", "Unrecognised country value in: " + alan.join(", ") + ".");
    }
    var anyHam = parsed.some(function (s) { return s.ham; });
    if (!R.length && !anyHam) {
      ekle(hits, "C01", "mukimlik_ulke_1..3 alanlarının hepsi boş.", "mukimlik_ulke_1..3 are all empty.");
    }

    if (R.length) {
      if (!ikamet && !String(rec.ikamet || "").trim()) {
        ekle(hits, "C05", "ikamet_adresi_ulke boş.", "ikamet_adresi_ulke is empty.");
      } else if (ikamet && R.indexOf(ikamet) === -1) {
        ekle(hits, "C03",
          "İkamet adresi ülkesi " + ikamet + "; beyan edilen mukimlik: " + uniq(R).sort().join("/") + ".",
          "Residence-address country is " + ikamet + "; declared residence: " + uniq(R).sort().join("/") + ".");
      }
      if (posta && R.indexOf(posta) === -1) {
        ekle(hits, "C04",
          "Posta adresi ülkesi " + posta + "; beyan edilen mukimlik: " + uniq(R).sort().join("/") + ".",
          "Mailing-address country is " + posta + "; declared residence: " + uniq(R).sort().join("/") + ".");
      }
      if (telSets.length && !telSets.some(function (set) { return R.some(function (c) { return set.has(c); }); })) {
        ekle(hits, "C06",
          "Telefon ülke kodu beyan edilen mukimlikle örtüşmüyor (mukimlik: " + uniq(R).sort().join("/") + ").",
          "No telephone country code matches the declared residence (" + uniq(R).sort().join("/") + ").");
      }
      if (uyruk.codes.length && !uyruk.codes.some(function (c) { return Rset[c]; })) {
        ekle(hits, "C07",
          "Uyruk (" + uniq(uyruk.codes).sort().join("/") + ") beyan edilen mukimlik ülkeleriyle (" + uniq(R).sort().join("/") + ") örtüşmüyor.",
          "Nationality (" + uniq(uyruk.codes).sort().join("/") + ") does not overlap declared residence (" + uniq(R).sort().join("/") + ").");
      }
      if (uniq(R).length >= 2) {
        ekle(hits, "C16",
          "Beyan edilen mukimlik ülke sayısı: " + uniq(R).length + " (" + uniq(R).sort().join("/") + ").",
          "Number of declared residence countries: " + uniq(R).length + " (" + uniq(R).sort().join("/") + ").");
      }
    }

    var nedenRe = /^(?:NEDEN|REASON|KOD)?\s*([A-Z])$/;
    var gorulen = {};
    parsed.forEach(function (slot) {
      if (!slot.k) {
        if (slot.tin || slot.neden) {
          ekle(hits, "C20", "Slot " + slot.i + ": TIN veya neden kodu dolu, mukimlik ülkesi boş ya da tanınmıyor.", "Slot " + slot.i + ": a TIN or reason code is filled in, but the residence country is empty or unrecognised.");
        }
        return;
      }
      var placeholder = slot.tin && tinYerTutucu(slot.tin);
      if (placeholder) ekle(hits, "C14", "Slot " + slot.i + " (" + slot.k + "): TIN yer tutucu görünümlü.", "Slot " + slot.i + " (" + slot.k + "): the TIN looks like a placeholder.");
      var tinVar = slot.tin && !placeholder;
      if (!tinVar) {
        var kod = null;
        var m = slot.neden ? slot.neden.toUpperCase().match(nedenRe) : null;
        if (m) kod = m[1];
        if (!placeholder && !slot.neden) {
          ekle(hits, "C08", "Slot " + slot.i + " (" + slot.k + "): TIN yok ve neden kodu yok.", "Slot " + slot.i + " (" + slot.k + "): no TIN and no reason code.");
        } else if (slot.neden && (kod !== "A" && kod !== "B" && kod !== "C")) {
          ekle(hits, "C09", "Slot " + slot.i + " (" + slot.k + "): neden kodu A, B veya C değil.", "Slot " + slot.i + " (" + slot.k + "): the reason code is not A, B or C.");
        } else if (kod === "A" && TIN_VEREN.has(slot.k)) {
          ekle(hits, "C10", "Slot " + slot.i + " (" + slot.k + "): neden A seçilmiş ama bu ülke TIN verir.", "Slot " + slot.i + " (" + slot.k + "): reason A was selected but this country issues TINs.");
        } else if (kod === "B" && !String(rec.aciklama || "").trim()) {
          ekle(hits, "C11", "Slot " + slot.i + " (" + slot.k + "): neden B için açıklama boş.", "Slot " + slot.i + " (" + slot.k + "): reason B has no explanation.");
        } else if (kod === "C" && TIN_VEREN.has(slot.k)) {
          ekle(hits, "C12", "Slot " + slot.i + " (" + slot.k + "): neden C seçilmiş; bu ülke TIN toplanmasını gerektirebilir (sezgisel).", "Slot " + slot.i + " (" + slot.k + "): reason C was selected; this country may require TIN collection (heuristic).");
        }
      } else {
        if (tinDogrula(slot.k, slot.tin) !== "ok") {
          ekle(hits, "C13", "Slot " + slot.i + " (" + slot.k + "): TIN biçimi veya kontrol hanesi geçersiz.", "Slot " + slot.i + " (" + slot.k + "): the TIN format or check digit is invalid.");
        }
        var temiz = tinTemizle(slot.tin);
        if (gorulen[temiz] && gorulen[temiz] !== slot.k) {
          ekle(hits, "C15", "Slot " + slot.i + ": aynı TIN " + gorulen[temiz] + " ve " + slot.k + " için girilmiş.", "Slot " + slot.i + ": the same TIN was entered for " + gorulen[temiz] + " and " + slot.k + ".");
        }
        if (!gorulen[temiz]) gorulen[temiz] = slot.k;
      }
    });

    var cbiHit = uniq(R).filter(function (c) { return CBI.has(c); }).sort();
    var cbiKismi = uniq(R).filter(function (c) { return CBI_KISMI.has(c); }).sort();
    if (cbiHit.length) {
      ekle(hits, "C17", "Mukimlik OECD CBI/RBI listesindeki yargı alanı: " + cbiHit.join("/") + ".", "Residence is on the OECD CBI/RBI list: " + cbiHit.join("/") + ".");
    }
    if (cbiKismi.length) {
      ekle(hits, "C17", "Mukimlik Panama (yalnızca PRP-FOR, PRP-SEP, PRP-PA izin kartları riskli): kart kodunu kontrol edin.", "Residence is Panama (only PRP-FOR, PRP-SEP and PRP-PA permits are the risk): check the card code.", DUSUK);
    }
    var cbiAll = {};
    CBI.forEach(function (c) { cbiAll[c] = 1; });
    CBI_KISMI.forEach(function (c) { cbiAll[c] = 1; });
    if (R.length && uniq(R).every(function (c) { return cbiAll[c]; }) && cbiHit.length) {
      var dis = [ikamet, posta].filter(function (a, i, arr) { return a && R.indexOf(a) === -1 && arr.indexOf(a) === i; });
      if (dis.length) {
        ekle(hits, "C18",
          "Mukimlik yalnızca CBI/RBI yargı alanında (" + uniq(R).sort().join("/") + "), adres ülkesi: " + dis.sort().join("/") + ".",
          "Residence is only in a CBI/RBI jurisdiction (" + uniq(R).sort().join("/") + "); address country: " + dis.sort().join("/") + ".");
      }
    }

    var ozbHam = String(rec.ozbeyanTarihi || "").trim();
    var ozb = tarihCoz(rec.ozbeyanTarihi);
    if (!ozbHam) ekle(hits, "C19", "ozbeyan_tarihi boş.", "The self-certification date is empty.");
    else if (!ozb) ekle(hits, "C19", "ozbeyan_tarihi okunamadı (GG.AA.YYYY veya YYYY-AA-GG).", "The self-certification date could not be read (use DD.MM.YYYY or YYYY-MM-DD).");
    else if (ozb > bugun) ekle(hits, "C19", "ozbeyan_tarihi ileri tarihli.", "The self-certification date is in the future.");

    if (rec.fullName != null && String(rec.fullName).trim().length < 2) {
      ekle(hits, "C23", "Ad soyad eksik.", "The name is missing.");
    }
    if (rec.dateOfBirth != null) {
      var dobHam = String(rec.dateOfBirth).trim();
      var dob = tarihCoz(rec.dateOfBirth);
      if (!dobHam) ekle(hits, "C22", "Doğum tarihi boş.", "The date of birth is empty.");
      else if (!dob) ekle(hits, "C22", "Doğum tarihi okunamadı.", "The date of birth could not be read.");
      else if (dob > bugun) ekle(hits, "C22", "Doğum tarihi ileri tarihli.", "The date of birth is in the future.");
    }
    if (rec.signed === false) {
      ekle(hits, "C21", "Öz beyan imzalı veya onaylı değil.", "The self-certification is not signed or affirmed.");
    }
    if (rec.kycCountry != null && String(rec.kycCountry).trim()) {
      var kyc = ulkeCoz(rec.kycCountry);
      if (!kyc) {
        ekle(hits, "C02", "Tanınmayan ülke değeri: kyc_ulke.", "Unrecognised country value in: kyc_ulke.");
      } else if (R.length && R.indexOf(kyc) === -1) {
        ekle(hits, "C24",
          "KYC / AML ülke belgesi " + kyc + "; beyan edilen mukimlik: " + uniq(R).sort().join("/") + ".",
          "The KYC / AML country is " + kyc + "; declared residence: " + uniq(R).sort().join("/") + ".");
      }
    }
    if (rec.rmKnowsReportable === true) {
      ekle(hits, "R01", "İlişki yöneticisi müşterinin raporlanabilir kişi olduğunu biliyor; öz beyana güvenmek için neden var.", "The relationship manager knows the customer is a reportable person; there is reason to know the self-certification cannot be relied on.");
    }
    if (rec.highValue === true) {
      ekle(hits, "R02", "Yüksek değerli hesap: ilişki yöneticisi sorgusu ayrıca yapılmalı.", "High-value account: a relationship-manager inquiry is still required.");
    }
    if (opts.reportable !== false && R.length) {
      var missing = uniq(R).filter(function (c) { return !REPORTABLE.has(c); });
      var other = missing.filter(function (c) { return c !== "US"; });
      var onlyUs = missing.filter(function (c) { return c === "US"; });
      if (other.length) {
        ekle(hits, "R09",
          "Raporlanabilir ülke listesinde yok: " + other.sort().join(", ") + ". Kurumun güncel GİB listesiyle karşılaştırın (yerleşik liste 2023 yedeğidir).",
          "Not on the reportable-jurisdiction list: " + other.sort().join(", ") + ". Compare with the institution's current GİB list (the built-in list is the 2023 fallback).",
          ORTA);
      }
      if (onlyUs.length && !other.length) {
        ekle(hits, "R09",
          "ABD, Türkiye CRS bildirim listesinde yok. Bu beklenen durumdur; ABD bağlantısı FATCA kurallarıyla ele alınır.",
          "The US is not on Türkiye's CRS notification list. That is expected; the US link is handled under the FATCA rules.",
          DUSUK);
      }
    }

    return finish(hits, "individual");
  }

  function uniq(arr) {
    var out = [];
    arr.forEach(function (x) { if (out.indexOf(x) === -1) out.push(x); });
    return out;
  }

  function finish(hits, scope) {
    hits.sort(function (a, b) { return b.rank - a.rank || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0); });
    var max = 0;
    var score = 0;
    hits.forEach(function (h) {
      if (h.rank > max) max = h.rank;
      score += PUAN[h.rank] || 0;
    });
    score = Math.min(100, score);
    var verdict = verdictOf(max, hits.length);
    var docs = [];
    var seen = {};
    hits.forEach(function (h) {
      if (h.rank < ORTA || !h.doc) return;
      var key = h.id + "|" + h.doc;
      if (seen[key]) return;
      seen[key] = 1;
      docs.push({ id: h.id, doc: h.doc, docEn: h.docEn });
    });
    var groups = [];
    hits.forEach(function (h) { if (groups.indexOf(h.group) === -1) groups.push(h.group); });
    return {
      scope: scope,
      findings: hits,
      verdict: verdict,
      docs: docs,
      score: score,
      highest: max ? SEV[max] : "-",
      highestEn: max ? SEV_EN[max] : "-",
      kategori: groups.join("+") || "-"
    };
  }

  function verdictOf(max, n) {
    if (max >= YUKSEK) {
      return {
        code: "bad",
        label: "Makul değil",
        labelEn: "Not reasonable",
        sub: "Öz beyan bu haliyle makul sayılamaz. İstenecek belgeler aşağıdadır.",
        subEn: "The self-certification cannot be treated as reasonable. The documents to request are listed below."
      };
    }
    if (max === ORTA) {
      return {
        code: "man",
        label: "Manuel inceleme",
        labelEn: "Manual review",
        sub: "Otomatik karar yok. Bulguları belgeyle kapatın.",
        subEn: "No automatic decision. Close the findings with documents."
      };
    }
    if (n > 0) {
      return {
        code: "ok",
        label: "Makul",
        labelEn: "Reasonable",
        sub: "Bilgi amaçlı maddeler var. Tek başlarına öz beyanı geçersiz kılmaz.",
        subEn: "There are items for information only. On their own they do not make the self-certification invalid."
      };
    }
    return {
      code: "ok",
      label: "Makul",
      labelEn: "Reasonable",
      sub: "Bu kurallar bakımından müdahale gerekmez.",
      subEn: "No action under these rules."
    };
  }

  function evaluateRow(cols, opts) { return evaluate(rowToRecord(cols), opts); }

  function checkForm(v, opts) {
    var rec = formToRecord(v || {});
    if (!tuzelMi(rec.musteriTipi) && isBlankRecord(rec)) {
      return {
        blank: true,
        scope: "individual",
        findings: [],
        docs: [],
        score: 0,
        highest: "-",
        kategori: "-",
        verdict: {
          code: "none",
          label: "Makul değil",
          labelEn: "Not reasonable",
          sub: "Form boş. En az ad, vergi mukimliği ve adres girin.",
          subEn: "The form is empty. Enter at least the name, tax residence and address."
        }
      };
    }
    var out = evaluate(rec, opts);
    out.blank = false;
    return out;
  }

  function detectDelim(line) {
    var inQ = false, commas = 0, semis = 0, tabs = 0;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (ch === '"') inQ = !inQ;
      else if (!inQ) {
        if (ch === ",") commas++;
        else if (ch === ";") semis++;
        else if (ch === "\t") tabs++;
      }
    }
    if (tabs > commas && tabs > semis) return "\t";
    if (semis > commas) return ";";
    return ",";
  }

  function parseCsv(text) {
    var clean = String(text || "").replace(/^\uFEFF/, "");
    if (!clean.trim()) return [];
    var delim = detectDelim(clean.split(/\r?\n/)[0]);
    var rows = [], row = [], cell = "", q = false;
    for (var i = 0; i < clean.length; i++) {
      var ch = clean[i];
      if (q) {
        if (ch === '"') {
          if (clean[i + 1] === '"') { cell += '"'; i++; }
          else q = false;
        } else cell += ch;
      } else if (ch === '"') q = true;
      else if (ch === delim) { row.push(cell.trim()); cell = ""; }
      else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && clean[i + 1] === "\n") i++;
        row.push(cell.trim());
        if (row.some(function (c) { return c !== ""; })) rows.push(row);
        row = []; cell = "";
      } else cell += ch;
    }
    row.push(cell.trim());
    if (row.some(function (c) { return c !== ""; })) rows.push(row);
    return rows;
  }

  function headerMap(headers) {
    var norm = {};
    headers.forEach(function (h, idx) { norm[kolonNorm(h)] = idx; });
    var map = {};
    STD.forEach(function (std) {
      var names = [std].concat(ALIAS[std] || []);
      for (var i = 0; i < names.length; i++) {
        var key = kolonNorm(names[i]);
        if (norm[key] != null) { map[std] = norm[key]; break; }
      }
    });
    ["dateofbirth", "dogumtarihi"].forEach(function (a) {
      if (norm[a] != null) map.dateOfBirth = norm[a];
    });
    if (norm.signed != null || norm.imzali != null) map.signed = norm.signed != null ? norm.signed : norm.imzali;
    if (norm.kyccountry != null || norm.kyculkesi != null) map.kycCountry = norm.kyccountry != null ? norm.kyccountry : norm.kyculkesi;
    return map;
  }

  function screenCsv(text, opts) {
    opts = opts || {};
    var rows = parseCsv(text);
    if (!rows.length) return { error: "Dosya boş.", total: 0, results: [] };
    var map = headerMap(rows[0]);
    if (map.mukimlik_ulke_1 == null && map.ikamet_adresi_ulke == null && map.vatandaslik == null && map.dogum_ulkesi == null) {
      return { error: "Başlıklar tanınmadı. Örnek dosyadaki sütun adlarını kullanın.", total: 0, results: [] };
    }
    var results = [];
    var counts = { bad: 0, man: 0, ok: 0, entity: 0 };
    rows.slice(1).forEach(function (cells, idx) {
      if (!cells.some(function (c) { return String(c).trim(); })) return;
      var cols = {};
      STD.forEach(function (std) {
        cols[std] = map[std] != null && cells[map[std]] != null ? cells[map[std]] : "";
      });
      if (map.dateOfBirth != null) cols.dateOfBirth = cells[map.dateOfBirth] || "";
      if (map.signed != null) {
        var imza = eh(cells[map.signed]);
        if (imza === true || imza === false) cols.signed = imza;
      }
      if (map.kycCountry != null && String(cells[map.kycCountry] || "").trim()) cols.kycCountry = cells[map.kycCountry];
      var out = evaluateRow(cols, opts);
      var code = out.verdict.code;
      if (out.scope === "entity") counts.entity++;
      else if (code === "bad") counts.bad++;
      else if (code === "man") counts.man++;
      else counts.ok++;
      var ids = [];
      out.findings.forEach(function (f) { if (ids.indexOf(f.id) === -1) ids.push(f.id); });
      results.push({
        rowIndex: idx + 2,
        musteriNo: cols.musteri_no || "",
        fullName: cols.ad_soyad || "",
        scope: out.scope,
        verdict: out.verdict,
        score: out.score,
        highest: out.highest,
        kategori: out.kategori,
        ruleIds: ids,
        findings: out.findings,
        docs: out.docs
      });
    });
    return {
      total: results.length,
      counts: counts,
      results: results
    };
  }

  function excelSafe(h) {
    h = String(h == null ? "" : h);
    if (h && (h[0] === "=" || h[0] === "+" || h[0] === "@" || (h[0] === "-" && !/^-?[\d.,]+$/.test(h)))) return "'" + h;
    return h;
  }
  function csvCell(h) {
    h = excelSafe(h);
    if (/[";\r\n]/.test(h)) return '"' + h.replace(/"/g, '""') + '"';
    return h;
  }

  function exportBatchCsv(summary) {
    var header = ["satir_no", "musteri_no", "ad_soyad", "karar", "kural_sayisi", "tetiklenen_kurallar", "en_yuksek_onem", "skor", "gerekce", "istenecek_belgeler"];
    var lines = [header.join(";")];
    (summary && summary.results || []).forEach(function (r) {
      var gerekce = r.findings.map(function (f) { return "[" + f.id + "/" + f.severity + "] " + f.msg; }).join(" | ");
      var belgeler = r.docs.map(function (d) { return d.id + ": " + d.doc; }).join(" | ");
      var karar = r.scope === "entity" ? "Manuel inceleme" : r.verdict.label;
      lines.push([
        r.rowIndex, r.musteriNo, r.fullName, karar, r.ruleIds.length, r.ruleIds.join("; "),
        r.highest, r.score, gerekce, belgeler
      ].map(csvCell).join(";"));
    });
    return "\uFEFF" + lines.join("\r\n") + "\r\n";
  }

  function setReportableList(codes) {
    REPORTABLE = new Set();
    (codes || []).forEach(function (c) {
      var u = String(c || "").trim().toUpperCase();
      if (/^[A-Z]{2}$/.test(u)) REPORTABLE.add(u);
    });
  }
  function getReportableList() { return Array.from(REPORTABLE); }

  var TIN_HINTS = {
    TR: "11 hane TCKN (ilk hane 0 olamaz, kontrol haneli) veya 10 hane VKN (kontrol haneli).",
    US: "SSN xxx-xx-xxxx, ITIN 9xx-xx-xxxx veya EIN xx-xxxxxxx.",
    DE: "11 hane IdNr (ilk hane 0 olamaz, ISO 7064 kontrol hanesi).",
    NL: "9 hane BSN (11-kontrolü).",
    GB: "10 hane UTR veya NINO (iki harf, altı rakam, A–D).",
    FR: "13 hane, ilk hane 0–3.",
    AZ: "10 hane VÖEN (son hane 1 veya 2) veya 7 karakter PIN.",
    RU: "10 hane (tüzel) veya 12 hane (gerçek) INN.",
    UA: "10 hane RNOKPP veya 8 hane EDRPOU."
  };
  function getTinFormatGuide(code) {
    var c = ulkeCoz(code) || String(code || "").trim().toUpperCase();
    if (TIN_HINTS[c]) return { country: c, known: true, formatInfo: TIN_HINTS[c] };
    var lib = tinRules();
    if (lib && lib.COUNTRY_TABLE) {
      var hit = lib.COUNTRY_TABLE.filter(function (x) { return x.code === c; })[0];
      if (hit) return { country: c, known: true, formatInfo: hit.formatInfo || (c + " biçimi tabloda var.") };
    }
    return { country: c, known: false, formatInfo: "Bu ülke için özel biçim yok. 4–20 harf veya rakam genel kontrolü uygulanır." };
  }

  return {
    RULES: RULES,
    KAYNAK: KAYNAK,
    STD: STD,
    evaluate: evaluate,
    evaluateRow: evaluateRow,
    checkForm: checkForm,
    formToRecord: formToRecord,
    rowToRecord: rowToRecord,
    screenCsv: screenCsv,
    exportBatchCsv: exportBatchCsv,
    parseCsv: parseCsv,
    isBlankRecord: isBlankRecord,
    setReportableList: setReportableList,
    getReportableList: getReportableList,
    getTinFormatGuide: getTinFormatGuide,
    ulkeCoz: ulkeCoz,
    telefonUlkeleri: telefonUlkeleri,
    tcknGecerli: tcknGecerli,
    vknGecerli: vknGecerli,
    deTinGecerli: deTinGecerli,
    nlTinGecerli: nlTinGecerli,
    gbTinGecerli: gbTinGecerli,
    frTinGecerli: frTinGecerli,
    azTinGecerli: azTinGecerli,
    ruTinGecerli: ruTinGecerli,
    uaTinGecerli: uaTinGecerli,
    usTinTur: usTinTur,
    tinDogrula: tinDogrula,
    tinYerTutucu: tinYerTutucu,
    NANP: NANP,
    CBI: CBI
  };
});
