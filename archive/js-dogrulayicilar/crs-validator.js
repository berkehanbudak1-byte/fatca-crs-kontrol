// OECD CRS öz beyan (self-certification) kontrolü. Yalnızca C kuralları (C1–C7).
// Sonuç: { valid, errors, warnings, manual } — her öğe { rule, msg }.
// Ön kontroldür, hukuki karar değildir.
//
// TIN kontrolü iki kaynaktan yapılabilir:
//  1. options.useTinChecker === true ise TINChecker (MIT) Python köprüsü (tin-bridge.py).
//     Köprü başarısız olursa yedek moda (tin-formats.json) geçilir.
//  2. Varsayılan: tin-formats.json tablosu.

const { spawnSync } = require("child_process");
const path = require("path");

const REASON_CODES = new Set(["A", "B", "C"]);
const BRIDGE = path.join(__dirname, "tin-bridge.py");
const tinRules = require("./tin-rules"); // 142 ülke, vkn-tin-checker kuralları

// Python köprüsü üzerinden TINChecker doğrulaması. Başarısızsa null döner.
function tinCheckerValidate(country, tin, lang = "en") {
  const res = spawnSync("py", ["-3", BRIDGE], {
    input: JSON.stringify({ country, tin, lang }),
    encoding: "utf8",
    timeout: 15000,
  });
  if (res.error || res.status !== 0 || !res.stdout) return null;
  try {
    const out = JSON.parse(res.stdout);
    return out.ok ? out : null;
  } catch {
    return null;
  }
}
const ISO2 = /^[A-Z]{2}$/;

const isIso2 = (c) => typeof c === "string" && ISO2.test(c);

function parseDate(v) {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(v + "T00:00:00Z");
  return Number.isNaN(d.getTime()) ? null : d;
}

const yearsBetween = (a, b) => (b - a) / (365.25 * 24 * 3600 * 1000);

function validateCrs(form, options = {}) {
  const errors = [];
  const warnings = [];
  const manual = [];
  const add = (list, rule, msg) => list.push({ rule, msg });
  const today = options.today ? new Date(options.today) : new Date();
  const tinFormats = options.tinFormats || {};

  if (!form || typeof form !== "object") {
    add(errors, "C1", "Form boş ya da geçersiz.");
    return { valid: false, errors, warnings, manual };
  }

  // C1: geçerli self-certification
  if (!form.fullName || String(form.fullName).trim().length < 2) add(errors, "C1", "Ad soyad eksik.");
  if (form.accountHolderType !== "individual" && form.accountHolderType !== "entity") {
    add(errors, "C1", "Hesap sahibi türü 'individual' ya da 'entity' olmalı.");
  }
  if (!isIso2(form.residenceCountry)) add(errors, "C1", "Vergi ikametgâh ülkesi geçerli ISO-2 kodu olmalı.");
  if (form.signed !== true) {
    add(errors, "C1", "Beyan imzalanmamış ya da onaylanmamış.");
    add(manual, "C7", "İmza yoksa geçici prosedür uygulanıp uygulanmayacağına karar verilmeli.");
  }
  const decl = parseDate(form.declarationDate);
  if (!decl) add(errors, "C1", "Beyan tarihi geçersiz (YYYY-MM-DD).");
  else if (decl > today) add(errors, "C1", "Beyan tarihi gelecekte görünüyor.");
  else if (yearsBetween(decl, today) > 1) add(warnings, "C1", "Beyan bir yıldan eski, yenilenmesi gerekebilir.");

  if (form.accountHolderType === "individual") {
    const dob = parseDate(form.dateOfBirth);
    if (!dob) add(errors, "C1", "Bireyler için doğum tarihi zorunlu ve geçerli olmalı.");
    else {
      const age = yearsBetween(dob, today);
      if (age < 0) add(errors, "C1", "Doğum tarihi gelecekte görünüyor.");
      else if (age > 120) add(errors, "C1", "Doğum tarihi makul aralığın dışında.");
      else if (age < 18) add(warnings, "C1", "18 yaşından küçük, vasi beyanı gerekebilir.");
    }
  }

  // C5: ikametgâh vergi listesinde olmalı, adres uyumu
  if (Array.isArray(form.taxResidences)) {
    if (!form.taxResidences.every(isIso2)) add(errors, "C5", "Vergi ikametgâh listesinde geçersiz ülke kodu var.");
    if (isIso2(form.residenceCountry) && !form.taxResidences.includes(form.residenceCountry)) {
      add(errors, "C5", "Beyan edilen ikametgâh ülkesi vergi ikametgâh listesinde yok.");
    }
  }
  if (form.address && isIso2(form.address.country) && isIso2(form.residenceCountry) && form.address.country !== form.residenceCountry) {
    add(options.addressMismatchAsError ? errors : warnings, "C5", "Adres ülkesi ile vergi ikametgâh ülkesi farklı. Politikaya göre açıklama gerekir.");
  }

  // C6: TIN raporlama
  const tin = typeof form.tin === "string" ? form.tin.trim() : "";
  const countryIssuesTin = form.countryIssuesTin !== false;
  if (!tin) {
    if (countryIssuesTin) {
      if (!REASON_CODES.has(form.noTinReason)) add(errors, "C6", "TIN yok ve geçerli neden kodu (A, B veya C) girilmemiş.");
      else if (form.noTinReason === "B" && !String(form.noTinExplanation || "").trim()) {
        add(errors, "C6", "Neden kodu B için TIN alınamamasının açıklaması zorunlu.");
      }
    }
  } else {
    const country = form.residenceCountry;
    const kind = form.accountHolderType === "entity" ? "entity" : "individual";
    // Sıra: 1) TINChecker (isteğe bağlı) 2) tin-formats.json'daki açık tanım 3) 142 ülke tablosu 4) manuel
    const tc = isIso2(country) && options.useTinChecker === true ? tinCheckerValidate(country, tin, "en") : null;
    const jsonEntry = isIso2(country) ? tinFormats[country] : null;
    const jsonRule = jsonEntry && jsonEntry[kind] ? jsonEntry[kind] : null;
    const bundle = isIso2(country) ? tinRules.tinCountryCheck(country, tin) : null;
    if (tc) {
      if (tc.isValid === false) add(errors, "C6", `TINChecker: ${tc.errorMsg || "TIN, ülke kuralına uymuyor."}`);
    } else if (jsonRule) {
      if (!new RegExp(jsonRule).test(tin)) add(errors, "C6", `TIN, ${country} ${kind} format kuralına uymuyor.`);
    } else if (bundle) {
      if (!bundle.ok) add(errors, "C6", bundle.msg);
    } else if (isIso2(country)) {
      // Tabloda olmayan ülke (ör. TR): genel biçim kontrolü ve elle doğrulama
      if (!/^[A-Za-z0-9-]{4,25}$/.test(tin)) add(errors, "C6", "TIN biçimi geçersiz (4-25 karakter, harf, rakam, tire).");
      add(manual, "C6", `${country} için TIN formatı bu araçta tanımlı değil, elle kontrol edilmeli.`);
    }
  }

  // C3: KYC ülkesi ile beyan çelişkisi
  if (isIso2(form.kycCountry) && isIso2(form.residenceCountry) && form.kycCountry !== form.residenceCountry) {
    add(errors, "C3", "KYC ülkesi ile beyan edilen ikametgâh ülkesi farklı. Yeni beyan ya da belgeli açıklama gerekir.");
  }

  // C2: makululuk — açılış bilgisi yoksa test otomatik geçemez
  if (!isIso2(form.kycCountry)) {
    add(manual, "C2", "Açılış (KYC) ülkesi yok, makululuk testi tamamlanamadı.");
  }

  // C4: test başarısızsa yeni beyan
  if (errors.some((e) => ["C1", "C3", "C5", "C6"].includes(e.rule))) {
    add(manual, "C4", "Test başarısız: yeni geçerli self-certification ya da belgeli makul açıklama istenmeli.");
  }

  return { valid: errors.length === 0, errors, warnings, manual };
}

function loadTinFormats(path) {
  try {
    const data = JSON.parse(require("fs").readFileSync(path, "utf8"));
    const out = {};
    for (const [k, v] of Object.entries(data)) if (!k.startsWith("_")) out[k] = v;
    return out;
  } catch {
    return {};
  }
}

module.exports = { validateCrs, loadTinFormats };
