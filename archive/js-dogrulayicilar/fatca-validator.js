// FATCA (IRS 26 CFR 1.1471-4) öz beyan kontrolü. Yalnızca F kuralları (F1–F9).
// Sonuç: { valid, errors, warnings, manual } — her öğe { rule, msg }.
// Ön kontroldür, hukuki karar değildir.

const isIso2 = (c) => typeof c === "string" && /^[A-Z]{2}$/.test(c);
const US_TIN_SSN = /^\d{3}-\d{2}-\d{4}$/;
const US_TIN_ITIN = /^9\d{2}-(5\d|6[0-5]|7\d|8[0-8]|9[0-2]|9[4-9])-\d{4}$/;
const isUsPhone = (n) => typeof n === "string" && /^\+?1[\s-]?\(?\d{3}\)?/.test(n.trim());

// F1–F7: ABD göstergeleri
function indicia(form) {
  const out = [];
  const a = form.address || {};
  if (form.citizenship === "US") out.push({ rule: "F1", msg: "ABD vatandaşlığı" });
  if (form.residenceCountry === "US") out.push({ rule: "F1", msg: "ABD ikametgâhı" });
  if (form.birthCountry === "US") out.push({ rule: "F2", msg: "ABD doğum yeri" });
  if (a.country === "US") out.push({ rule: "F3", msg: "Mevcut ABD adresi" });
  if (a.isPoBox && a.country === "US") out.push({ rule: "F3", msg: "ABD posta kutusu" });
  if ((form.usPhoneNumbers || []).length > 0 || (form.phones || []).some(isUsPhone)) {
    out.push({ rule: "F4", msg: "ABD telefonu (+1)" });
  }
  if (Array.isArray(form.standingUsInstructions) && form.standingUsInstructions.length > 0) {
    out.push({ rule: "F5", msg: "ABD hesabına sabit ödeme talimatı" });
  }
  if (Array.isArray(form.usPoaOrSigners) && form.usPoaOrSigners.some((p) => p && p.usAddress)) {
    out.push({ rule: "F6", msg: "ABD adresli vekil ya da imza yetkilisi" });
  }
  if (a.careOf && a.soleAddress === true) out.push({ rule: "F7", msg: "Care-of adres tek adres olarak kullanılıyor" });
  return out;
}

function validateFatca(form, options = {}) {
  const errors = [];
  const warnings = [];
  const manual = [];
  const add = (list, rule, msg) => list.push({ rule, msg });

  if (!form || typeof form !== "object") {
    add(errors, "F1", "Form boş ya da geçersiz.");
    return { valid: false, errors, warnings, manual };
  }

  const ind = indicia(form);
  const declared = form.usPersonDeclared === true;

  // F1: ABD göstergesi var, ABD kişisi beyan edilmemiş
  if (ind.length > 0 && !declared) {
    const list = ind.map((i) => `${i.rule} (${i.msg})`).join("; ");
    if (form.residenceCountry === "US") add(errors, "F1", `ABD ikametgâhı var ama ABD kişisi beyan edilmemiş: ${list}`);
    else add(warnings, "F1", `ABD göstergeleri var, ABD kişisi beyan edilmemiş: ${list}`);
    add(manual, "F8", "ABD göstergesi cure ya da recalcitrant adımlarına karar gerektirebilir.");
  }

  // F2: doğum yeri cure belgeleri
  if (ind.some((i) => i.rule === "F2") && !String(form.birthCountryCureDocs || "").trim()) {
    add(manual, "F2", "ABD doğum yeri cure: non-US vatandaşlık belgesi ve Certificate of Loss of Nationality ya da açıklama gerekiyor.");
  }

  // F4: +1 numara, ABD ya da Kanada olabilir
  if (ind.some((i) => i.rule === "F4")) {
    add(manual, "F4", "Telefon +1 ile başlıyor, ABD ya da Kanada olabilir. Yabancı numara varsa cure farklı.");
  }

  // F7: care-of tek adres
  if (ind.some((i) => i.rule === "F7")) {
    add(manual, "F7", "Care-of adres tek adres. Kural bu durumda geçerli, cure gerekir.");
  }

  // F3, F5, F6: ABD adresi, sabit talimat ve vekil bilgisi doğrulanmalı
  if (ind.some((i) => ["F3", "F5", "F6"].includes(i.rule))) {
    add(manual, "F9", "ABD adresi, sabit talimat ya da vekil bilgisi hesap kayıtlarıyla doğrulanmalı.");
  }

  // F9: her zaman manuel gözden geçirme
  add(manual, "F9", "Yeni hesap açılış ve idame bilgilerinin gözden geçirilmesi manuel yapılmalı.");

  // ABD TIN biçimi (ABD ikametgâhı ve beyan edilmişse)
  if (form.residenceCountry === "US" && typeof form.tin === "string" && form.tin.trim()) {
    const t = form.tin.trim();
    if (!US_TIN_SSN.test(t) && !US_TIN_ITIN.test(t)) {
      add(errors, "F1", "ABD TIN'i SSN (XXX-XX-XXXX) ya da ITIN biçiminde olmalı.");
    }
  }

  return { valid: errors.length === 0, errors, warnings, manual };
}

module.exports = { validateFatca };
