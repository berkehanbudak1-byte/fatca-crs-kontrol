"use strict";

var fs = require("fs");
var path = require("path");
var assert = require("assert");
var E = require("../lib/engine");

var TODAY = "2026-11-26";
var failed = 0;
var fired = {};

function test(name, fn) {
  try {
    fn();
    console.log("ok  " + name);
  } catch (err) {
    failed += 1;
    console.error("FAIL " + name);
    console.error("  " + (err && err.stack ? err.stack : err));
  }
}

function idsOf(cols) {
  var out = E.evaluateRow(cols, { today: TODAY });
  out.findings.forEach(function (f) { fired[f.id] = 1; });
  return out.findings.map(function (f) { return f.id; });
}

function clean(over) {
  return Object.assign({
    ad_soyad: "Test Kisi",
    musteri_tipi: "G",
    vatandaslik: "TR",
    dogum_ulkesi: "TR",
    ikamet_adresi_ulke: "TR",
    posta_adresi_ulke: "TR",
    telefon_1: "+90 532 000 00 01",
    mukimlik_ulke_1: "TR",
    tin_1: "10000000146",
    ozbeyan_tarihi: "01.03.2024"
  }, over || {});
}

function setEq(actual, expected, label) {
  var a = actual.slice().sort();
  var b = expected.slice().sort();
  assert.deepStrictEqual(a, b, (label || "") + " beklenen " + b.join(",") + " gelen " + a.join(","));
}

test("TCKN sağlama", function () {
  assert.strictEqual(E.tcknGecerli("10000000146"), true);
  assert.strictEqual(E.tcknGecerli("10000000147"), false);
  assert.strictEqual(E.tcknGecerli("01234567890"), false);
  assert.strictEqual(E.tcknGecerli("1234567890"), false);
  assert.strictEqual(E.tcknGecerli("10000001136"), true);
});

test("VKN sağlama", function () {
  assert.strictEqual(E.vknGecerli("0540033975"), true);
  assert.strictEqual(E.vknGecerli("1234567890"), true);
  assert.strictEqual(E.vknGecerli("0540033976"), false);
  assert.strictEqual(E.vknGecerli("054003397"), false);
  assert.strictEqual(E.vknGecerli("9990000021"), true);
});

test("ABD TIN türleri", function () {
  assert.strictEqual(E.usTinTur("123-45-6789"), "SSN");
  assert.strictEqual(E.usTinTur("912-70-1234"), "ITIN");
  assert.strictEqual(E.usTinTur("12-3456789"), "EIN");
  assert.strictEqual(E.usTinTur("000-12-3456"), null);
  assert.strictEqual(E.usTinTur("666-12-3456"), null);
  assert.strictEqual(E.usTinTur("123-00-3456"), null);
  assert.strictEqual(E.usTinTur("912-69-1234"), null);
});

test("DE NL GB FR AZ RU UA", function () {
  assert.strictEqual(E.deTinGecerli("65929970489"), true);
  assert.strictEqual(E.deTinGecerli("86095742719"), true);
  assert.strictEqual(E.deTinGecerli("65929970488"), false);
  assert.strictEqual(E.deTinGecerli("12345678901"), false);
  assert.strictEqual(E.nlTinGecerli("111222333"), true);
  assert.strictEqual(E.nlTinGecerli("111222334"), false);
  assert.strictEqual(E.gbTinGecerli("JG103759A"), true);
  assert.strictEqual(E.gbTinGecerli("1234567890"), true);
  assert.strictEqual(E.gbTinGecerli("QQ123456C"), false);
  assert.strictEqual(E.gbTinGecerli("AB123456E"), false);
  assert.strictEqual(E.frTinGecerli("1234567890123"), true);
  assert.strictEqual(E.frTinGecerli("5234567890123"), false);
  assert.strictEqual(E.azTinGecerli("1525855852"), true);
  assert.strictEqual(E.azTinGecerli("5VBK5VR"), true);
  assert.strictEqual(E.ruTinGecerli("7707083893"), true);
  assert.strictEqual(E.ruTinGecerli("500100732259"), true);
  assert.strictEqual(E.ruTinGecerli("500100732258"), false);
  assert.strictEqual(E.uaTinGecerli("3184710691"), true);
  assert.strictEqual(E.uaTinGecerli("3184710692"), false);
});

test("ülke ve telefon", function () {
  assert.strictEqual(E.ulkeCoz("Türkiye"), "TR");
  assert.strictEqual(E.ulkeCoz("usa"), "US");
  assert.strictEqual(E.ulkeCoz("DEU"), "DE");
  assert.strictEqual(E.ulkeCoz("UK"), "GB");
  assert.strictEqual(E.ulkeCoz("ZZ"), null);
  assert.deepStrictEqual(Array.from(E.telefonUlkeleri("+90 532 000 00 01")), ["TR"]);
  assert.deepStrictEqual(Array.from(E.telefonUlkeleri("0090 532 000 00 01")), ["TR"]);
  assert.strictEqual(E.telefonUlkeleri("+1 (212) 555-0100"), E.NANP);
  assert.deepStrictEqual(Array.from(E.telefonUlkeleri("+994 50 123 45 67")), ["AZ"]);
  assert.strictEqual(E.tinYerTutucu("123456789"), true);
  assert.strictEqual(E.tinYerTutucu("N/A"), true);
  assert.strictEqual(E.tinYerTutucu("10000000146"), false);
});

test("temiz kayıt bulgu vermez", function () {
  setEq(idsOf(clean()), []);
  var out = E.evaluateRow(clean(), { today: TODAY });
  assert.strictEqual(out.verdict.code, "ok");
  assert.strictEqual(out.verdict.label, "Makul");
});

test("her katalog kuralı tek başına tetiklenir", function () {
  setEq(idsOf(clean({ vatandaslik: "TR;US" })).filter(function (id) { return id === "F01" || id === "F11"; }), ["F01", "F11"]);
  var cured = idsOf(clean({ vatandaslik: "TR;US", abd_degil_ozbeyan: "E", abd_olmama_belge: "E" }));
  assert.ok(cured.indexOf("F01") !== -1);
  assert.ok(cured.indexOf("F11") === -1);
  var f01 = E.evaluateRow(clean({ vatandaslik: "TR;US", abd_degil_ozbeyan: "E", abd_olmama_belge: "E" }), { today: TODAY });
  assert.strictEqual(f01.findings.filter(function (f) { return f.id === "F01"; })[0].severity, "Orta");
  assert.strictEqual(f01.verdict.code, "man");

  assert.ok(idsOf(clean({ dogum_ulkesi: "US" })).indexOf("F02") !== -1);
  assert.ok(idsOf(clean({ ikamet_adresi_ulke: "US" })).indexOf("F03") !== -1);
  assert.ok(idsOf(clean({ posta_adresi_ulke: "US" })).indexOf("F04") !== -1);
  assert.ok(idsOf(clean({ telefon_1: "+1 212 555 0100" })).indexOf("F05") !== -1);
  assert.ok(idsOf(clean({ abd_hesabina_duzenli_talimat: "E" })).indexOf("F06") !== -1);
  assert.ok(idsOf(clean({ vekil_imza_yetkilisi_adres_ulke: "US" })).indexOf("F07") !== -1);
  assert.ok(idsOf(clean({ tek_adres_care_of_hold_mail: "E" })).indexOf("F08") !== -1);
  assert.ok(idsOf(clean({ mukimlik_ulke_1: "US", tin_1: "452-88-1001", ikamet_adresi_ulke: "US", posta_adresi_ulke: "US", telefon_1: "+1 212 555 0100", vatandaslik: "US" })).indexOf("F09") !== -1);
  assert.ok(idsOf(clean({ tin_1: "219-09-9999" })).indexOf("F10") !== -1);
  assert.ok(idsOf(clean({ mukimlik_ulke_1: "" })).indexOf("C01") !== -1);
  assert.ok(idsOf(clean({ vatandaslik: "XX" })).indexOf("C02") !== -1);
  assert.ok(idsOf(clean({ ikamet_adresi_ulke: "DE" })).indexOf("C03") !== -1);
  assert.ok(idsOf(clean({ posta_adresi_ulke: "DE" })).indexOf("C04") !== -1);
  assert.ok(idsOf(clean({ ikamet_adresi_ulke: "" })).indexOf("C05") !== -1);
  assert.ok(idsOf(clean({ telefon_1: "+1 212 555 0100" })).indexOf("C06") !== -1);
  assert.ok(idsOf(clean({ vatandaslik: "DE" })).indexOf("C07") !== -1);
  assert.ok(idsOf(clean({ tin_1: "" })).indexOf("C08") !== -1);
  assert.ok(idsOf(clean({ tin_1: "", tin_yok_nedeni_1: "Z" })).indexOf("C09") !== -1);
  assert.ok(idsOf(clean({ tin_1: "", tin_yok_nedeni_1: "A" })).indexOf("C10") !== -1);
  assert.ok(idsOf(clean({ tin_1: "", tin_yok_nedeni_1: "B" })).indexOf("C11") !== -1);
  assert.ok(idsOf(clean({ tin_1: "", tin_yok_nedeni_1: "C" })).indexOf("C12") !== -1);
  assert.ok(idsOf(clean({ tin_1: "10000000147" })).indexOf("C13") !== -1);
  assert.ok(idsOf(clean({ tin_1: "123456789" })).indexOf("C14") !== -1);
  assert.ok(idsOf(clean({ mukimlik_ulke_2: "DE", tin_2: "10000000146" })).indexOf("C15") !== -1);
  assert.ok(idsOf(clean({ mukimlik_ulke_2: "DE", tin_2: "65929970489" })).indexOf("C16") !== -1);
  assert.ok(idsOf(clean({ mukimlik_ulke_1: "AE", ikamet_adresi_ulke: "AE", posta_adresi_ulke: "AE", tin_1: "", tin_yok_nedeni_1: "B", tin_yok_aciklama: "ornek" })).indexOf("C17") !== -1);
  assert.ok(idsOf(clean({ mukimlik_ulke_1: "AE", ikamet_adresi_ulke: "TR", posta_adresi_ulke: "TR", tin_1: "", tin_yok_nedeni_1: "B", tin_yok_aciklama: "ornek" })).indexOf("C18") !== -1);
  assert.ok(idsOf(clean({ ozbeyan_tarihi: "" })).indexOf("C19") !== -1);
  assert.ok(idsOf(clean({ mukimlik_ulke_2: "", tin_2: "3184710691" })).indexOf("C20") !== -1);
});

test("ek kurallar", function () {
  assert.ok(idsOf(clean({ signed: false })).indexOf("C21") !== -1);
  assert.ok(idsOf(clean({ dateOfBirth: "" })).indexOf("C22") !== -1);
  assert.ok(idsOf(clean({ dateOfBirth: "1990-05-14" })).indexOf("C22") === -1);
  assert.ok(idsOf(clean({ ad_soyad: "" })).indexOf("C23") !== -1);
  assert.ok(idsOf(clean({ kycCountry: "DE" })).indexOf("C24") !== -1);
  assert.ok(idsOf(clean({ usGreenCard: true })).indexOf("F12") !== -1);
  assert.ok(idsOf(clean({ rmKnowsReportable: true })).indexOf("R01") !== -1);
  assert.ok(idsOf(clean({ highValue: true })).indexOf("R02") !== -1);
  var r09 = E.evaluateRow(clean({ mukimlik_ulke_1: "IR", ikamet_adresi_ulke: "IR", posta_adresi_ulke: "IR", telefon_1: "+98 21 000 000", tin_1: "1234567890", vatandaslik: "IR" }), { today: TODAY });
  assert.ok(r09.findings.some(function (f) { return f.id === "R09" && f.severity === "Orta"; }));
  fired.R09 = 1;
  var us = E.evaluateRow(clean({ mukimlik_ulke_1: "US", tin_1: "452-88-1001", ikamet_adresi_ulke: "US", posta_adresi_ulke: "US", vatandaslik: "US", telefon_1: "+1 212 555 0100" }), { today: TODAY });
  assert.ok(us.findings.some(function (f) { return f.id === "R09" && f.rank === 1; }));
  var ent = E.evaluateRow(clean({ musteri_tipi: "T" }), { today: TODAY });
  setEq(ent.findings.map(function (f) { return f.id; }), ["E01"]);
  fired.E01 = 1;
  assert.strictEqual(ent.verdict.label, "Manuel inceleme");
});

test("bulgu metninde TIN veya ad kopyalanmaz", function () {
  var out = E.evaluateRow(clean({ ad_soyad: "Ayşe Örnek", tin_1: "10000000147" }), { today: TODAY });
  out.findings.forEach(function (f) {
    assert.ok(f.msg.indexOf("10000000147") === -1, f.id);
    assert.ok(f.msg.indexOf("Ayşe") === -1, f.id);
  });
});

test("yüksek önem makul değil, orta manuel, düşük makul", function () {
  assert.strictEqual(E.evaluateRow(clean({ tin_1: "" }), { today: TODAY }).verdict.label, "Makul değil");
  assert.strictEqual(E.evaluateRow(clean({ ikamet_adresi_ulke: "" }), { today: TODAY }).verdict.label, "Manuel inceleme");
  var low = E.evaluateRow(clean({ vatandaslik: "DE" }), { today: TODAY });
  assert.strictEqual(low.verdict.label, "Makul");
  assert.ok(low.findings.some(function (f) { return f.id === "C07" && f.cls === "uyari"; }));
  assert.strictEqual(low.docs.length, 0);
});

var EXPECTED = {
  "ORNEK-001": [],
  "ORNEK-002": ["F01", "F11"],
  "ORNEK-003": ["F01"],
  "ORNEK-004": ["F02", "F11"],
  "ORNEK-005": ["F01", "F02", "F03", "F04", "F05", "F09", "F10", "F11", "R09"],
  "ORNEK-006": ["F04", "F11", "C04"],
  "ORNEK-007": ["F05", "F11", "C06"],
  "ORNEK-008": ["F05", "F11"],
  "ORNEK-009": ["F06", "F11"],
  "ORNEK-010": ["F07", "F11"],
  "ORNEK-011": ["F08"],
  "ORNEK-012": ["F10", "C13"],
  "ORNEK-013": ["C03", "C04", "C06", "C07"],
  "ORNEK-014": ["C13"],
  "ORNEK-015": ["C10"],
  "ORNEK-016": ["C08"],
  "ORNEK-017": ["C11"],
  "ORNEK-018": ["C12"],
  "ORNEK-019": ["C02", "C09"],
  "ORNEK-020": ["C16", "C13", "C15"],
  "ORNEK-021": ["C14"],
  "ORNEK-022": ["C03", "C04", "C06", "C07", "C17", "C18"],
  "ORNEK-023": ["C01"],
  "ORNEK-024": ["C20", "C19"],
  "ORNEK-025": ["E01"],
  "ORNEK-026": ["C07"],
  "ORNEK-027": ["C17"],
  "ORNEK-028": ["C05"]
};

test("28 sentetik satır katalogla aynı kuralları verir", function () {
  var text = fs.readFileSync(path.join(__dirname, "..", "examples", "ornek-musteriler.csv"), "utf8");
  var summary = E.screenCsv(text, { today: TODAY });
  assert.strictEqual(summary.total, 28);
  summary.results.forEach(function (row) {
    var exp = EXPECTED[row.musteriNo];
    assert.ok(exp, "beklenmeyen satir " + row.musteriNo);
    setEq(row.ruleIds, exp, row.musteriNo);
    row.findings.forEach(function (f) { fired[f.id] = 1; });
    row.findings.forEach(function (f) {
      assert.ok(f.msg.indexOf("452-88-1001") === -1);
      assert.ok(f.msg.indexOf("10000001136") === -1);
    });
  });
  var first = summary.results[0];
  assert.strictEqual(first.verdict.label, "Makul");
  var cured = summary.results[2];
  assert.strictEqual(cured.verdict.label, "Manuel inceleme");
  assert.strictEqual(summary.results[1].verdict.label, "Makul değil");
});

test("sonuç CSV'si BOM ve noktalı virgül kullanır", function () {
  var text = fs.readFileSync(path.join(__dirname, "..", "examples", "ornek-musteriler.csv"), "utf8");
  var csv = E.exportBatchCsv(E.screenCsv(text, { today: TODAY }));
  assert.strictEqual(csv.charCodeAt(0), 0xFEFF);
  assert.ok(csv.indexOf("satir_no;musteri_no;ad_soyad;karar;") === 1);
  assert.ok(csv.indexOf("ORNEK-001") !== -1);
  assert.ok(csv.indexOf("Makul") !== -1);
  assert.ok(csv.indexOf("\r\n") !== -1);
  assert.ok(csv.indexOf("ÖRNEK VERİ") !== -1);
});

test("bilinmeyen ülke tablosu ve İtalya TIN tablosu", function () {
  assert.strictEqual(E.tinDogrula("IT", "RSSMRA85T10A562S"), "ok");
  assert.strictEqual(E.tinDogrula("IT", "ABC"), "hata");
  assert.strictEqual(E.tinDogrula("AO", "AB12"), "ok");
  assert.strictEqual(E.tinDogrula("AO", "A"), "hata");
});

test("boş form erken durur", function () {
  var out = E.checkForm({}, { today: TODAY });
  assert.strictEqual(out.blank, true);
  assert.strictEqual(out.findings.length, 0);
  var ent = E.checkForm({ accountHolderType: "entity", fullName: "Ornek Holding" }, { today: TODAY });
  assert.deepStrictEqual(ent.findings.map(function (f) { return f.id; }), ["E01"]);
  assert.strictEqual(ent.verdict.label, "Manuel inceleme");
});

test("formdan makul örnek", function () {
  var out = E.checkForm({
    fullName: "Ayşe Örnek",
    accountHolderType: "individual",
    dateOfBirth: "1990-05-14",
    declarationDate: "2024-03-15",
    signed: true,
    citizenship: "TR",
    birthCountry: "TR",
    res1: "TR",
    tin1: "10000001136",
    addressCountry: "TR",
    mailCountry: "TR",
    kycCountry: "TR",
    phone1: "+90 500 000 00 01"
  }, { today: TODAY });
  assert.strictEqual(out.blank, false);
  assert.strictEqual(out.verdict.label, "Makul");
  assert.deepStrictEqual(out.findings.map(function (f) { return f.id; }), []);
});

test("bakiye, açılış tarihi ve önceki beyan", function () {
  function ids(over) { return idsOf(clean(over)); }
  function one(over, id) {
    return E.evaluateRow(clean(over), { today: TODAY }).findings.filter(function (f) { return f.id === id; })[0];
  }
  assert.ok(one({ hesap_acilis: "2010-01-01" }, "A01").msg.indexOf("FATCA mevcut hesap") !== -1);
  assert.ok(one({ hesap_acilis: "2010-01-01" }, "A02").msg.indexOf("CRS mevcut hesap") !== -1);
  assert.ok(one({ hesap_acilis: "2014-07-01" }, "A01").msg.indexOf("FATCA yeni hesap") !== -1);
  assert.ok(one({ hesap_acilis: "2014-07-01" }, "A02").msg.indexOf("CRS mevcut hesap") !== -1);
  assert.ok(one({ hesap_acilis: "2017-07-01" }, "A02").msg.indexOf("CRS yeni hesap") !== -1);
  assert.strictEqual(one({ hesap_acilis: "2010-01-01" }, "A01").severity, "Düşük");
  assert.strictEqual(E.evaluateRow(clean({ hesap_acilis: "2010-01-01" }), { today: TODAY }).verdict.label, "Makul");
  assert.strictEqual(one({ hesap_acilis: "yarin" }, "A01").severity, "Orta");

  assert.ok(ids({ hesap_acilis: "2010-01-01", bakiye: "2000000", bakiye_para: "USD" }).indexOf("T01") !== -1);
  assert.ok(ids({ hesap_acilis: "2010-01-01", bakiye: "2000000", bakiye_para: "USD" }).indexOf("T05") !== -1);
  assert.strictEqual(E.evaluateRow(clean({ hesap_acilis: "2010-01-01", bakiye: "2000000", bakiye_para: "USD" }), { today: TODAY }).verdict.label, "Manuel inceleme");
  assert.ok(ids({ hesap_acilis: "2010-01-01", bakiye: "200000", bakiye_para: "USD" }).indexOf("T02") !== -1);
  assert.ok(ids({ hesap_acilis: "2010-01-01", bakiye: "1.000.000", bakiye_para: "USD" }).indexOf("T01") === -1);
  assert.ok(ids({ hesap_acilis: "2010-01-01", bakiye: "40000", bakiye_para: "USD" }).indexOf("T03") !== -1);
  assert.ok(one({ hesap_acilis: "2010-01-01", bakiye: "40000", bakiye_para: "USD" }, "T03").msg.indexOf("uygulanmadı") !== -1);
  var yeni = ids({ hesap_acilis: "2018-01-01", bakiye: "2000000", bakiye_para: "USD" });
  assert.ok(yeni.indexOf("T06") !== -1);
  assert.ok(yeni.indexOf("T01") === -1);
  assert.ok(yeni.indexOf("T05") === -1);
  assert.ok(ids({ hesap_acilis: "2010-01-01", bakiye: "10000", bakiye_para: "EUR" }).indexOf("T04") !== -1);
  assert.ok(ids({ hesap_acilis: "2010-01-01", bakiye: "10000", bakiye_para: "EUR" }).indexOf("T01") === -1);
  assert.ok(ids({ bakiye: "2000000", bakiye_para: "USD" }).indexOf("T07") !== -1);
  assert.ok(one({ hesap_acilis: "2010-01-01", bakiye: "2000000", bakiye_para: "USD" }, "T05").msg.indexOf("doğrulanmadı") !== -1);

  assert.ok(ids({ onceki_mukimlik: "DE" }).indexOf("K01") !== -1);
  assert.ok(ids({ onceki_mukimlik: "TR" }).indexOf("K01") === -1);
  assert.strictEqual(E.evaluateRow(clean({ onceki_mukimlik: "DE" }), { today: TODAY }).verdict.label, "Manuel inceleme");
  assert.ok(E.evaluateRow(clean({ onceki_mukimlik: "DE" }), { today: TODAY }).docs.some(function (d) { return d.id === "K01"; }));
  assert.ok(ids({ onceki_abd_kisisi: "E" }).indexOf("K02") !== -1);
  assert.ok(ids({ onceki_abd_kisisi: "H" }).indexOf("K02") === -1);
  assert.ok(ids({ mukimlik_ulke_1: "US", tin_1: "452-88-1001", ikamet_adresi_ulke: "US", posta_adresi_ulke: "US", vatandaslik: "US", telefon_1: "+1 212 555 0100", onceki_abd_kisisi: "H" }).indexOf("K02") !== -1);
  assert.ok(ids({ onceki_beyan_tarihi: "01.01.2025" }).indexOf("K03") !== -1);
  assert.ok(ids({ onceki_beyan_tarihi: "yok" }).indexOf("K03") !== -1);

  var kucuk = E.evaluateRow({ musteri_tipi: "T", ad_soyad: "Ornek Holding", hesap_acilis: "2010-01-01", bakiye: "100000", bakiye_para: "USD" }, { today: TODAY });
  assert.ok(kucuk.findings.some(function (f) { return f.id === "E02"; }));
  kucuk.findings.forEach(function (f) { fired[f.id] = 1; });
  var buyuk = E.evaluateRow({ musteri_tipi: "T", ad_soyad: "Ornek Holding", hesap_acilis: "2010-01-01", bakiye: "2,000,000.00", bakiye_para: "USD" }, { today: TODAY });
  assert.ok(buyuk.findings.some(function (f) { return f.id === "E04"; }));
  buyuk.findings.forEach(function (f) { fired[f.id] = 1; });

  var form = E.checkForm({
    fullName: "Ayşe Örnek", accountHolderType: "individual", dateOfBirth: "1990-05-14",
    declarationDate: "2024-03-15", signed: true, citizenship: "TR", birthCountry: "TR",
    res1: "TR", tin1: "10000001136", addressCountry: "TR", mailCountry: "TR", kycCountry: "TR",
    phone1: "+90 500 000 00 01", openingDate: "2010-01-01", balanceAmount: "2500000", balanceCurrency: "USD",
    priorCertDate: "2012-01-01", priorResidences: "DE", priorUsPerson: "H"
  }, { today: TODAY });
  ["A01", "A02", "T01", "T05", "K01"].forEach(function (id) {
    assert.ok(form.findings.some(function (f) { return f.id === id; }), id);
  });
});

test("örnek eşik CSV'si sentetik satırları okur", function () {
  var text = fs.readFileSync(path.join(__dirname, "..", "examples", "ornek-esik.csv"), "utf8");
  var summary = E.screenCsv(text, { today: TODAY });
  assert.strictEqual(summary.error, undefined);
  assert.strictEqual(summary.total, 3);
  var byNo = {};
  summary.results.forEach(function (r) { byNo[r.musteriNo] = r.ruleIds; r.findings.forEach(function (f) { fired[f.id] = 1; }); });
  assert.ok(byNo["ORNEK-ESIK-1"].indexOf("T01") !== -1);
  assert.ok(byNo["ORNEK-ESIK-2"].indexOf("K01") !== -1);
  assert.ok(byNo["ORNEK-ESIK-3"].indexOf("T04") !== -1);
  summary.results.forEach(function (r) {
    assert.ok(r.fullName.indexOf("ÖRNEK VERİ") !== -1);
  });
});

test("kapsam tablosu her kuralı kaynakla listeler", function () {
  var md = fs.readFileSync(path.join(__dirname, "..", "docs", "kapsam.md"), "utf8");
  Object.keys(E.RULES).forEach(function (id) {
    assert.ok(md.indexOf("| " + id + " |") !== -1, id + " tabloda yok");
    assert.ok(E.RULES[id].source && E.RULES[id].source.length > 10, id + " kaynaksız");
  });
});

test("güvenlik: CSV/Excel formül enjeksiyonu etkisizleştirilir", function () {
  var payloads = [
    "=CMD|'/C calc'!A0",
    "+SUM(A1:A2)",
    "-2+3+cmd|' /C calc'!A0",
    "@SUM(1+1)*cmd|' /C calc'!A0",
    "\t=1+1",
    "\r=1+1",
    "\n=1+1",
    "   =HYPERLINK(\"http://evil\")",
    " -100"
  ];
  payloads.forEach(function (p) {
    var safe = E.excelSafe(p);
    assert.strictEqual(safe[0], "'", "formül nötralize edilmedi: " + JSON.stringify(p));
  });
  assert.strictEqual(E.excelSafe("-123.45"), "-123.45");
  assert.strictEqual(E.excelSafe("ORNEK-001"), "ORNEK-001");

  var maliciousCsv = [
    "musteri_no;ad_soyad;musteri_tipi;vatandaslik;dogum_ulkesi;ikamet_adresi_ulke;mukimlik_ulke_1;tin_1;ozbeyan_tarihi",
    "=1+1;+CMD|'/C calc'!A0;G;TR;TR;TR;TR;10000000146;01.03.2024"
  ].join("\n");
  var exported = E.exportBatchCsv(E.screenCsv(maliciousCsv, { today: TODAY }));
  assert.ok(exported.indexOf("'=1+1") !== -1);
  assert.ok(exported.indexOf("'+CMD") !== -1);

  var directExport = E.exportBatchCsv({
    results: [{
      rowIndex: 2,
      musteriNo: "\t=1+1",
      fullName: "\r@SUM(A1)",
      scope: "individual",
      verdict: { label: "Makul" },
      ruleIds: [],
      highest: "-",
      score: 0,
      findings: [],
      docs: []
    }]
  });
  assert.ok(directExport.indexOf("'\t=1+1") !== -1);
  assert.ok(directExport.indexOf("'\r@SUM(A1)") !== -1);
});

test("güvenlik: prototype pollution ve Object.prototype anahtarları engellenir", function () {
  ["__proto__", "constructor", "toString", "valueOf", "hasOwnProperty"].forEach(function (k) {
    assert.strictEqual(E.ulkeCoz(k), null, "ulkeCoz(" + k + ")");
    var out = E.evaluateRow(clean({ musteri_tipi: k }), { today: TODAY });
    assert.strictEqual(out.scope, "unknown", "tanınmayan tip bireysel sayılmamalı: " + k);
    assert.notStrictEqual(out.verdict.label, "Makul");
    assert.strictEqual(out.verdict.code, "man");
    assert.ok(out.findings.some(function (f) { return f.id === "E03"; }));
    out.findings.forEach(function (f) { fired[f.id] = 1; });
    assert.strictEqual(E.evaluateRow(clean({ abd_hesabina_duzenli_talimat: k }), { today: TODAY }).findings.some(function (f) { return f.id === "F06"; }), false);
  });
  var protoCsv = "__proto__;constructor;mukimlik_ulke_1;ikamet_adresi_ulke;tin_1;ozbeyan_tarihi\n1;2;TR;TR;10000000146;01.03.2024";
  var summary = E.screenCsv(protoCsv, { today: TODAY });
  assert.strictEqual(summary.error, undefined);
  assert.strictEqual(summary.total, 1);
  assert.strictEqual(({}).polluted, undefined);
});

test("güvenlik: CSV boyut/satır sınırları ve para birimi sanitizasyonu", function () {
  var tooBig = E.screenCsv("a".repeat(200), { maxBytes: 100 });
  assert.ok(tooBig.error && tooBig.error.indexOf("sınırı") !== -1);

  var manyRows = "mukimlik_ulke_1;ikamet_adresi_ulke;tin_1;ozbeyan_tarihi\n" +
    Array(10).fill("TR;TR;10000000146;01.03.2024").join("\n");
  var limited = E.screenCsv(manyRows, { maxRows: 5 });
  assert.ok(limited.error && limited.error.indexOf("satır") !== -1);

  var badCur = E.evaluateRow(clean({ hesap_acilis: "2010-01-01", bakiye: "1000", bakiye_para: "<script>alert(1)</script>" }), { today: TODAY });
  badCur.findings.forEach(function (f) {
    assert.strictEqual(f.msg.indexOf("<script>"), -1);
  });
});

test("güvenlik: HTML innerHTML yok, CSP SHA-256 hash ve referrer politikası doğru", function () {
  var crypto = require("crypto");
  var html = fs.readFileSync(path.join(__dirname, "..", "FATCA-CRS-Kontrol.html"), "utf8").replace(/\r\n?/g, "\n");
  assert.strictEqual(/\.innerHTML\s*=/.test(html), false, "innerHTML kullanılmamalı");
  assert.ok(/<meta\s+name="referrer"\s+content="no-referrer">/i.test(html));
  var cspMatch = html.match(/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"/i);
  assert.ok(cspMatch, "CSP meta etiketi bulunamadı");
  var csp = cspMatch[1];
  assert.ok(csp.indexOf("default-src 'none'") !== -1);
  assert.ok(csp.indexOf("object-src 'none'") !== -1);
  var scriptDirective = csp.split(";").map(function (s) { return s.trim(); }).find(function (s) {
    return s.indexOf("script-src ") === 0;
  });
  assert.ok(scriptDirective, "script-src yönergesi eksik");
  assert.strictEqual(scriptDirective.indexOf("'unsafe-inline'"), -1, "script-src unsafe-inline içermemeli");
  assert.strictEqual(scriptDirective.indexOf("'unsafe-eval'"), -1, "script-src unsafe-eval içermemeli");
  assert.strictEqual(/\s\*(?:\s|$)/.test(scriptDirective), false, "script-src wildcard içermemeli");
  var scriptRe = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;
  var m, found = 0;
  while ((m = scriptRe.exec(html))) {
    found++;
    var digest = "'sha256-" + crypto.createHash("sha256").update(m[1], "utf8").digest("base64") + "'";
    assert.ok(scriptDirective.indexOf(digest) !== -1, "CSP hash uyuşmuyor: " + digest);
  }
  assert.strictEqual(found, 1);

  var textInputs = html.match(/<(?:input\b[^>]*type="text"|textarea\b)[^>]*>/gi) || [];
  assert.ok(textInputs.length >= 20, "PII metin alanları bulunamadı");
  textInputs.forEach(function (tag) {
    assert.ok(/\bautocomplete="off"/i.test(tag), "autocomplete=off eksik: " + tag);
  });

  var indexHtml = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8").replace(/\r\n?/g, "\n");
  var indexCspMatch = indexHtml.match(/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"/i);
  assert.ok(indexCspMatch, "index.html CSP meta etiketi eksik");
  assert.ok(indexCspMatch[1].indexOf("script-src 'none'") !== -1, "index.html script-src 'none' içermeli");
  assert.ok(/name="referrer"\s+content="no-referrer"/i.test(indexHtml));

  var pkg = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8"));
  assert.ok(pkg.scripts.start.indexOf("--bind 127.0.0.1") !== -1, "start scripti 127.0.0.1 loopback bağlamalı");
  assert.ok(pkg.scripts.serve.indexOf("--bind 127.0.0.1") !== -1, "serve scripti 127.0.0.1 loopback bağlamalı");
});

test("sürüm 1.3.0", function () {
  assert.strictEqual(E.SURUM, "1.3.0");
  var pkg = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8"));
  assert.strictEqual(pkg.version, "1.3.0");
});

test("AU-B-001 tüzel tipler ve tanınmayan tip", function () {
  ["T", "Tüzel", "Tüzel Kişi", "TÜZEL KİŞİ", "LTD", "LTD. ŞTİ.", "A.Ş.", "A.S.", "Anonim Şirket", "Limited Şirket", "Ticari", "Vakıf", "Dernek", "Kurumsal", "entity"].forEach(function (tip) {
    var out = E.evaluateRow(clean({ musteri_tipi: tip }), { today: TODAY });
    assert.strictEqual(out.scope, "entity", tip);
    assert.strictEqual(out.verdict.label, "Manuel inceleme", tip);
    assert.notStrictEqual(out.verdict.label, "Makul", tip);
    assert.ok(out.findings.some(function (f) { return f.id === "E01"; }), tip);
    out.findings.forEach(function (f) { fired[f.id] = 1; });
  });
  ["", "G", "Gerçek", "Bireysel", "gerçek kişi", "individual"].forEach(function (tip) {
    var out = E.evaluateRow(clean({ musteri_tipi: tip }), { today: TODAY });
    assert.strictEqual(out.scope, "individual", JSON.stringify(tip));
    assert.strictEqual(out.verdict.label, "Makul", JSON.stringify(tip));
  });
  ["XYZ", "Personel", "VIP", "Musteri"].forEach(function (tip) {
    var out = E.evaluateRow(clean({ musteri_tipi: tip }), { today: TODAY });
    assert.strictEqual(out.scope, "unknown", tip);
    assert.strictEqual(out.verdict.label, "Manuel / kapsam belirsiz", tip);
    assert.strictEqual(out.verdict.code, "man");
    assert.notStrictEqual(out.verdict.label, "Makul");
    setEq(out.findings.map(function (f) { return f.id; }), ["E03"], tip);
    out.findings.forEach(function (f) { fired[f.id] = 1; });
  });
  var form = E.checkForm({ fullName: "Ornek Ltd", accountHolderType: "LTD" }, { today: TODAY });
  assert.strictEqual(form.scope, "entity");
  assert.ok(form.findings.some(function (f) { return f.id === "E01"; }));
});

test("AU-B-011 TR TIN sağlama abcd ve hatalı TCKN geçmez", function () {
  assert.strictEqual(E.tcknGecerli("10000000146"), true);
  assert.strictEqual(E.tcknGecerli("10000000147"), false);
  assert.strictEqual(E.tinDogrula("TR", "abcd"), "hata");
  assert.strictEqual(E.tinDogrula("TR", "ABCD"), "hata");
  assert.strictEqual(E.tinDogrula("TR", "10000000147"), "hata");
  assert.strictEqual(E.tinDogrula("TR", "12345678901"), "hata");
  assert.strictEqual(E.vknGecerli("1234567890"), true);
  assert.strictEqual(E.tinDogrula("TR", "1234567890"), "ok");
  assert.strictEqual(E.tinDogrula("TR", "1234567891"), "hata");
  ["abcd", "10000000147", "01234567890"].forEach(function (tin) {
    var out = E.evaluateRow(clean({ tin_1: tin }), { today: TODAY });
    assert.notStrictEqual(out.verdict.label, "Makul", tin);
    assert.ok(out.findings.some(function (f) { return f.id === "C13" || f.id === "C14"; }), tin + " " + out.findings.map(function (f) { return f.id; }).join(","));
  });
});

test("AU-B-012 her mukimlik için ayrı TIN veya neden", function () {
  var eksik = E.evaluateRow(clean({ mukimlik_ulke_2: "DE" }), { today: TODAY });
  assert.ok(eksik.findings.some(function (f) { return f.id === "C08"; }));
  assert.ok(eksik.findings.some(function (f) { return f.id === "C16"; }));
  assert.strictEqual(eksik.verdict.label, "Makul değil");

  var ayniAlan = E.evaluateRow(clean({ mukimlik_ulke_1: "TR;DE" }), { today: TODAY });
  assert.ok(ayniAlan.findings.some(function (f) { return f.id === "C08"; }));
  assert.strictEqual(ayniAlan.verdict.label, "Makul değil");

  var neden = E.evaluateRow(clean({ mukimlik_ulke_2: "DE", tin_yok_nedeni_2: "B", tin_yok_aciklama: "numara henuz cikmadi" }), { today: TODAY });
  assert.ok(neden.findings.every(function (f) { return f.id !== "C08"; }));
  assert.strictEqual(neden.verdict.label, "Makul");

  var cakisma = E.evaluateRow(clean({ mukimlik_ulke_2: "DE", tin_yok_nedeni_2: "A" }), { today: TODAY });
  assert.ok(cakisma.findings.some(function (f) { return f.id === "C10"; }));
  assert.strictEqual(cakisma.verdict.label, "Makul değil");

  var form = E.checkForm({
    fullName: "Ornek Kisi",
    accountHolderType: "individual",
    dateOfBirth: "1985-05-05",
    declarationDate: "2024-03-01",
    signed: true,
    citizenship: "TR",
    birthCountry: "TR",
    residenceCountry: "TR",
    taxResidences: ["TR", "DE"],
    tin: "10000000146",
    addressCountry: "TR",
    mailCountry: "TR",
    kycCountry: "TR",
    phone1: "+90 532 000 00 01"
  }, { today: TODAY });
  assert.ok(form.findings.some(function (f) { return f.id === "C08"; }), form.findings.map(function (f) { return f.id; }).join(","));
  assert.strictEqual(form.verdict.label, "Makul değil");

  var kyc = E.checkForm({
    fullName: "Ornek Kisi",
    accountHolderType: "individual",
    dateOfBirth: "1985-05-05",
    declarationDate: "2024-03-01",
    signed: true,
    citizenship: "TR",
    birthCountry: "TR",
    residenceCountry: "DE",
    taxResidences: ["TR", "DE"],
    tin: "",
    noTinReason: "A",
    addressCountry: "DE",
    kycCountry: "TR",
    phone1: "+49 151 000000"
  }, { today: TODAY });
  assert.ok(kyc.findings.some(function (f) { return f.id === "C08"; }), "ikinci ülke TIN");
  assert.ok(kyc.findings.some(function (f) { return f.id === "C10"; }));
  assert.ok(kyc.findings.every(function (f) { return f.id !== "C24"; }), "KYC listede iken C24 yok");

  var hold = E.checkForm({
    fullName: "Ornek Kisi", accountHolderType: "individual", dateOfBirth: "1985-05-05",
    declarationDate: "2024-03-01", signed: true, citizenship: "TR", birthCountry: "TR",
    res1: "TR", tin1: "10000000146", addressCountry: "TR", mailCountry: "TR", kycCountry: "TR",
    phone1: "+90 532 000 00 01",
    address: { country: "TR", holdMail: true, soleAddress: true }
  }, { today: TODAY });
  assert.ok(hold.findings.some(function (f) { return f.id === "F08"; }));

  var uc = E.evaluateRow(clean({
    mukimlik_ulke_2: "DE",
    tin_2: "65929970489",
    mukimlik_ulke_3: "FR",
    tin_3: ""
  }), { today: TODAY });
  assert.ok(uc.findings.some(function (f) { return f.id === "C08"; }));
  assert.strictEqual(uc.verdict.label, "Makul değil");
});

test("güvenlik: toplu-kontrol CLI yol doğrulaması", function () {
  var cli = require("../scripts/toplu-kontrol");
  var sampleIn = path.join(__dirname, "..", "examples", "ornek-musteriler.csv");
  assert.throws(function () { cli.validateCliPaths(sampleIn, sampleIn); }, /aynı olamaz/);
  assert.throws(function () { cli.validateCliPaths("a\0b.csv", "/tmp/out.csv"); }, /NUL/);
  assert.throws(function () { cli.validateCliPaths(path.join(__dirname, ".."), "/tmp/out.csv"); }, /düzenli bir dosya/);
  var ok = cli.validateCliPaths(sampleIn, path.join(require("os").tmpdir(), "fatca-test-out.csv"));
  assert.strictEqual(ok.inputPath, path.resolve(sampleIn));
});

test("her kural en az bir testte tetiklendi", function () {
  var missing = Object.keys(E.RULES).filter(function (id) { return !fired[id]; });
  assert.deepStrictEqual(missing, []);
});

if (failed) {
  console.error(failed + " test başarısız");
  process.exit(1);
}
console.log("tüm testler geçti");
