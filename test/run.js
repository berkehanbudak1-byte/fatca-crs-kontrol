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

test("kapsam tablosu her kuralı kaynakla listeler", function () {
  var md = fs.readFileSync(path.join(__dirname, "..", "docs", "kapsam.md"), "utf8");
  Object.keys(E.RULES).forEach(function (id) {
    assert.ok(md.indexOf("| " + id + " |") !== -1, id + " tabloda yok");
    assert.ok(E.RULES[id].source && E.RULES[id].source.length > 10, id + " kaynaksız");
  });
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
