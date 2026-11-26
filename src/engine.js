const _getCountryTable = () => (typeof COUNTRY_TABLE !== "undefined" ? COUNTRY_TABLE : []);
const _getTinValidator = () => ({
  $n: typeof $n !== "undefined" ? $n : class { constructor(e = null) { this.value = e; } },
  vo: typeof vo !== "undefined" ? vo : () => false
});

// ===== FATCA (IRS 26 CFR 1.1471-4) — F1–F9 =====
const US_TIN_SSN = /^\d{3}-\d{2}-\d{4}$/;
const US_TIN_ITIN = /^9\d{2}-(5\d|6[0-5]|7\d|8[0-8]|9[0-2]|9[4-9])-\d{4}$/;
const US_TIN_EIN = /^\d{2}-\d{7}$/;
const isUsPhone = (n) => typeof n === "string" && /^\+?1[\s-]?\(?\d{3}\)?/.test(n.trim());

function parseTinEntries(tinRaw, primaryCountry) {
  const raw = typeof tinRaw === "string" ? tinRaw.trim() : "";
  if (!raw) return { mode: "empty", map: new Map(), invalidSegments: [], duplicates: [] };
  const parts = raw.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
  const hasColon = parts.some((p) => p.includes(":"));
  if (!hasColon) {
    if (parts.length > 1) {
      return { mode: "single-multi-error", map: new Map(), invalidSegments: parts, duplicates: [] };
    }
    const map = new Map();
    if (isIso2(primaryCountry)) map.set(primaryCountry, parts[0]);
    return { mode: "single", singleTin: parts[0], map, invalidSegments: [], duplicates: [] };
  }
  const map = new Map();
  const invalidSegments = [];
  const duplicates = [];
  for (const p of parts) {
    const m = p.match(/^([A-Za-z]{2})\s*:\s*(.*)$/);
    if (!m) {
      invalidSegments.push(p);
      continue;
    }
    const cc = m[1].toUpperCase();
    const val = m[2].trim();
    if (map.has(cc)) duplicates.push(cc);
    map.set(cc, val);
  }
  return { mode: "keyed", map, invalidSegments, duplicates };
}

function indicia(form) {
  const out = [];
  const a = form.address || {};
  if (form.citizenship === "US") out.push({ rule: "F1", msg: "ABD vatandaşlığı" });
  if (form.residenceCountry === "US") out.push({ rule: "F1", msg: "ABD ikametgâhı" });
  if (form.birthCountry === "US") out.push({ rule: "F2", msg: "ABD doğum yeri" });
  if (a.country === "US") out.push({ rule: "F3", msg: "Mevcut ABD adresi" });
  if (a.isPoBox && a.country === "US") out.push({ rule: "F3", msg: "ABD posta kutusu" });
  if ((form.phones || []).some(isUsPhone)) out.push({ rule: "F4", msg: "ABD telefonu (+1)" });
  if (Array.isArray(form.standingUsInstructions) && form.standingUsInstructions.length > 0) {
    out.push({ rule: "F5", msg: "ABD hesabına sabit ödeme talimatı" });
  }
  if (Array.isArray(form.usPoaOrSigners) && form.usPoaOrSigners.some((p) => p && p.usAddress)) {
    out.push({ rule: "F6", msg: "ABD adresli vekil ya da imza yetkilisi" });
  }
  if (a.careOf && a.soleAddress === true) out.push({ rule: "F7", msg: "Care-of adres tek adres olarak kullanılıyor" });
  return out;
}

function validateFatca(form) {
  const errors = [], warnings = [], manual = [];
  const add = (list, rule, msg) => list.push({ rule, msg });
  const ind = indicia(form);
  const declared = form.usPersonDeclared === true;
  // ABD kişi testi (IRS): yeşil kart (LPR) ya da cari yılda 183+ gün ABD kişisi olmayı gösterir
  const usTest = form.usGreenCard === true || form.usDays183 === true;
  if (usTest && !declared) add(errors, "F1", "ABD kişi testi pozitif (yeşil kart ya da 183 gün) ama ABD kişisi beyan edilmemiş.");
  if (usTest && declared) add(manual, "F1", "ABD kişi testi pozitif: W-9 ve ABD TIN'inin alınması gerekir.");
  if (ind.length > 0 && !declared) {
    const list = ind.map((i) => `${i.rule} (${i.msg})`).join("; ");
    if (form.residenceCountry === "US") add(errors, "F1", `ABD ikametgâhı var ama ABD kişisi beyan edilmemiş: ${list}`);
    else add(warnings, "F1", `ABD göstergeleri var, ABD kişisi beyan edilmemiş: ${list}`);
    add(manual, "F8", "ABD göstergesi cure ya da recalcitrant adımlarına karar gerektirebilir.");
  }
  if (ind.some((i) => i.rule === "F2") && !String(form.birthCountryCureDocs || "").trim()) {
    add(manual, "F2", "ABD doğum yeri cure: non-US vatandaşlık belgesi ve Certificate of Loss of Nationality ya da açıklama gerekiyor.");
  }
  if (ind.some((i) => i.rule === "F4")) {
    add(manual, "F4", "Telefon +1 ile başlıyor, ABD ya da Kanada olabilir. Yabancı numara varsa cure farklı.");
  }
  if (ind.some((i) => i.rule === "F7")) add(manual, "F7", "Care-of adres tek adres. Kural bu durumda geçerli, cure gerekir.");
  if (ind.some((i) => ["F3", "F5", "F6"].includes(i.rule))) {
    add(manual, "F9", "ABD adresi, sabit talimat ya da vekil bilgisi hesap kayıtlarıyla doğrulanmalı.");
  }
  add(manual, "F9", "Yeni hesap açılış ve idame bilgilerinin gözden geçirilmesi manuel yapılmalı.");
  const hasUsRes = form.residenceCountry === "US" || (Array.isArray(form.taxResidences) && form.taxResidences.includes("US"));
  if (hasUsRes && typeof form.tin === "string" && form.tin.trim()) {
    const parsed = parseTinEntries(form.tin, form.residenceCountry);
    const usTin = parsed.mode === "keyed"
      ? (parsed.map.get("US") || "")
      : (form.residenceCountry === "US" ? (parsed.singleTin || "") : "");
    const isEntity = form.accountHolderType === "entity";
    if (usTin && !US_TIN_SSN.test(usTin) && !US_TIN_ITIN.test(usTin) && !(isEntity && US_TIN_EIN.test(usTin))) {
      add(errors, "F1", "ABD TIN'i SSN (XXX-XX-XXXX) ya da ITIN biçiminde olmalı.");
    }
  }
  return { valid: errors.length === 0, errors, warnings, manual };
}

// ===== CRS (OECD) — C1–C7 =====
// Ülke TIN kontrolü: yukarıdaki tin-rules bloğundaki ülke tablosunu kullanır.
// Tabloda olmayan ülke (ör. TR) için TIN elle kontrol edilir.
function tinCountryCheck(code, tin) {
  const table = _getCountryTable();
  if (!table.some((c) => c.code === code)) return null;
  const { $n: InfoBox, vo: validateFn } = _getTinValidator();
  const info = new InfoBox(), msg = new InfoBox();
  const ok = validateFn(tin, code, info, msg);
  return { ok: ok === true, msg: msg.value || `${code} TIN'i format kuralına uymuyor.` };
}

function validateTin(code, tin) {
  const cc = isIso2(code) ? code : "";
  const val = typeof tin === "string" ? tin.trim() : "";
  if (!val) {
    return { ok: false, manual: false, msg: cc ? `${cc} için TIN girilmemiş.` : "TIN girilmemiş." };
  }
  const rule = cc ? tinCountryCheck(cc, val) : null;
  if (rule) {
    return { ok: rule.ok, manual: false, msg: rule.ok ? "" : rule.msg };
  }
  if (!/^[A-Za-z0-9-]{4,25}$/.test(val)) {
    return {
      ok: false,
      manual: false,
      msg: cc
        ? `${cc} için TIN biçimi geçersiz (4-25 karakter, harf, rakam, tire).`
        : "TIN biçimi geçersiz (4-25 karakter, harf, rakam, tire)."
    };
  }
  return {
    ok: true,
    manual: true,
    msg: `${cc || "Ülke"} için TIN formatı bu araçta tanımlı değil, elle kontrol edilmeli.`
  };
}

const REASON_CODES = new Set(["A", "B", "C"]);
// BNZ Reasonableness Test Guide: OECD'nin 13 yüksek riskli CBI/RBI ülkesi (ISO-2)
// Kontrol listesi maddeleri: ekranda gösterilir ama karara ve belge listesine girmez
const CHECKLIST_ONLY = ["F9", "R4", "R5"];
// Kurumun (banka) ülkesi: CRS göstergeleri bu ülkeye göre değerlendirilir
const RFI_COUNTRY = "TR";
// Türkiye'nin CRS Çok Taraflı Yetkili Makam Anlaşması ortakları
// Sürüm: 2023 GİB listesi — güncel liste için OECD AEOI Portalını kontrol edin (GİB rehberi, Yayın 485, 2023, Ek 2: 120 ülke).
// Liste zamanla değişir; kullanmadan önce güncel listeyle karşılaştırılmalı. TR kendi listesinde yer alır.
const TR_CRS_PARTNERS_VERSION = "2023 GİB listesi — güncel liste için OECD AEOI Portalını kontrol edin";
const TR_CRS_PARTNERS = [
  "DE","AD","AI","AG","AR","AL","AW","AU","AT","AZ","BS","BH","BB","BE","BZ","BM","AE","GB","BR","BN","BG","KY","GI","CK","CW","CZ","CN",
  "DK","DM","EC","ID","EE","FO","MA","FI","FR","GH","CY","GD","GL","GG","ZA","GE","HR","IN","NL","HK","VG","IE","ES","IL","SE","CH",
  "IT","IS","JM","JP","JE","CA","ME","QA","KZ","KE","CO","KR","CR","KW","LV","LR","LI","LT","LB","LU","HU","MO","MV","MY","MT","IM",
  "MH","MX","MD","MC","MS","MU","NR","NG","NU","NO","PK","PA","PE","PT","PL","RO","RW","RU","KN","LC","VC","WS","SM","SC","SG","SX",
  "SK","SI","SA","CL","TH","TC","TR","UG","UA","OM","UY","VU","NC","NZ","GR"
];
// Ülke telefon kodları (ITU-T E.164). Bir ülkenin birden fazla alan kodu olabilir (ör. NANP "1").
// Tabloda olmayan kod eşleşmez ve manuel kalır.
const DIAL_CODES = {
  AF:"93", AL:"355", DZ:"213", AD:"376", AO:"244", AI:"1264", AG:"1268", AR:"54", AM:"374", AW:"297", AU:"61", AT:"43", AZ:"994",
  BS:"1242", BH:"973", BD:"880", BB:"1246", BY:"375", BE:"32", BZ:"501", BJ:"229", BT:"975", BO:"591", BA:"387", BW:"267", BR:"55",
  BN:"673", BG:"359", BF:"226", BI:"257", CV:"238", KH:"855", CM:"237", CA:"1", KY:"1345", CF:"236", CK:"682", CL:"56", CN:"86",
  CO:"57", CD:"243", CR:"506", CI:"225", HR:"385", CU:"53", CW:"599", CY:"357", CZ:"420", DK:"45", DM:"1767", DO:"1809", EC:"593",
  EG:"20", SV:"503", EE:"372", FO:"298", FI:"358", FR:"33", GE:"995", DE:"49", GH:"233", GI:"350", GR:"30", GL:"299", GD:"1473",
  GT:"502", GN:"224", HT:"509", HN:"504", HK:"852", HU:"36", IS:"354", IN:"91", ID:"62", IQ:"964", IE:"353", IM:"44", IL:"972",
  IT:"39", JM:"1876", JP:"81", JE:"44", JO:"962", KZ:"7", KE:"254", KR:"82", KW:"965", KG:"996", LA:"856", LV:"371", LB:"961",
  LS:"266", LR:"231", LY:"218", LI:"423", LT:"370", LU:"352", MO:"853", MK:"389", MG:"261", MW:"265", MY:"60", MV:"960", ML:"223",
  MT:"356", MH:"692", MU:"230", MX:"52", MD:"373", MC:"377", MN:"976", ME:"382", MA:"212", MZ:"258", NA:"264", NR:"674", NP:"977",
  NL:"31", NZ:"64", NG:"234", NO:"47", OM:"968", PK:"92", PW:"680", PA:"507", PY:"595", PE:"51", PH:"63", PL:"48", PT:"351",
  QA:"974", RO:"40", RU:"7", RW:"250", LC:"1758", SM:"378", SA:"966", SN:"221", RS:"381", SC:"248", SG:"65", SX:"1721", SK:"421",
  SI:"386", ZA:"27", ES:"34", LK:"94", SD:"249", SR:"597", SE:"46", CH:"41", SY:"963", TW:"886", TJ:"992", TZ:"255", TH:"66",
  TT:"1868", TN:"216", TR:"90", TM:"993", TC:"1649", UA:"380", AE:"971", GB:"44", US:"1", UY:"598", UZ:"998", VU:"678", VE:"58",
  VN:"84", YE:"967", ZM:"260", ZW:"263", XK:"383"
};
// Bir telefon numarasının olası ülkelerini bulur (en uzun eşleşen kod). Eşleşme yoksa boş liste.
function dialCountries(phone) {
  const digits = String(phone || "").replace(/^\+/, "");
  let best = 0, out = [];
  for (const [iso, code] of Object.entries(DIAL_CODES)) {
    if (digits.startsWith(code)) {
      if (code.length > best) { best = code.length; out = [iso]; }
      else if (code.length === best) out.push(iso);
    }
  }
  return out;
}
const HIGH_RISK_CBI = ["AG", "BS", "BH", "BB", "CY", "DM", "GD", "KN", "LC", "SC", "TC", "AE", "VU"];
const ISO2 = /^[A-Z]{2}$/;
const isIso2 = (c) => typeof c === "string" && ISO2.test(c);

function parseDate(v) {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const [y, m, day] = v.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, day));
  if (Number.isNaN(d.getTime())) return null;
  if (d.getUTCFullYear() !== y || d.getUTCMonth() !== m - 1 || d.getUTCDate() !== day) return null;
  return d;
}
const yearsBetween = (a, b) => (b - a) / (365.25 * 24 * 3600 * 1000);

function validateCrs(form, options = {}) {
  const errors = [], warnings = [], manual = [];
  const add = (list, rule, msg) => list.push({ rule, msg });
  const today = options.today ? new Date(options.today) : new Date();

  // OECD FAQ 1: tek isimli (mononym) kişi geçerlidir; ad "NFN", soyad bu isim olarak raporlanır
  const nameParts = String(form.fullName || "").trim().split(/\s+/).filter(Boolean);
  if (nameParts.join("").length < 2) add(errors, "C1", "Ad soyad eksik.");
  else if (form.accountHolderType === "individual" && nameParts.length === 1) {
    add(manual, "R7", "Tek isimli (mononym) müşteri: ad NFN, soyad bu isim olarak raporlanır. Kimlik belgesiyle doğrulayın.");
  }
  if (form.accountHolderType !== "individual" && form.accountHolderType !== "entity") {
    add(errors, "C1", "Hesap sahibi türü 'individual' ya da 'entity' olmalı.");
  }
  if (!isIso2(form.residenceCountry)) add(errors, "C1", "Vergi ikametgâh ülkesi geçerli ISO kodu olmalı (örn. TR).");
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
    if (!dob) add(errors, "C1", "Gerçek kişi için doğum tarihi zorunlu ve geçerli olmalı.");
    else {
      const age = yearsBetween(dob, today);
      if (age < 0) add(errors, "C1", "Doğum tarihi gelecekte görünüyor.");
      else if (age > 120) add(errors, "C1", "Doğum tarihi makul aralığın dışında.");
      else if (age < 18) add(warnings, "C1", "18 yaşından küçük, vasi beyanı gerekebilir.");
    }
  }

  if (Array.isArray(form.taxResidences)) {
    if (form.taxResidences.length === 0) add(errors, "C5", "Vergi ikametgâh listesi boş (ADGM: beyan 'vergi ikametgâhı yok' ise adres ile çelişki olup olmadığına bakılmalı).");
    if (!form.taxResidences.every(isIso2)) add(errors, "C5", "Vergi ikametgâh listesinde geçersiz ülke kodu var.");
    if (isIso2(form.residenceCountry) && !form.taxResidences.includes(form.residenceCountry)) {
      add(errors, "C5", "Beyan edilen ikametgâh ülkesi vergi ikametgâh listesinde yok.");
    }
  }
  // BNZ tamlık kontrolü: adres ülkesi zorunlu
  if (!form.address || !isIso2(form.address.country)) add(errors, "C1", "Adres ülkesi eksik (tamlık kontrolü).");
  // BNZ tutarlılık kontrolü: adres ile vergi ikametgâhı çelişiyorsa test başarısız
  if (form.address && isIso2(form.address.country) && isIso2(form.residenceCountry) && form.address.country !== form.residenceCountry) {
    add(errors, "C5", "Adres ülkesi ile vergi ikametgâh ülkesi çelişiyor (BNZ tutarlılık kontrolü).");
  }
  // BNZ tamlık kontrolü: kurum beyanlarında kontrol eden kişiler
  if (form.accountHolderType === "entity") {
    add(manual, "R1", "Kontrol eden kişiler (controlling persons) ve rolleri belirlendi mi, bilgileri eksiksiz mi?");
  }
  // BNZ CBI/RBI: yüksek riskli ülkelerde ek due diligence
  const cbiHits = [form.residenceCountry, form.address && form.address.country, ...(form.taxResidences || [])]
    .filter((c, i, a) => HIGH_RISK_CBI.includes(c) && a.indexOf(c) === i);
  if (cbiHits.length > 0) {
    add(manual, "R2", `CBI/RBI yüksek riskli ülke (${cbiHits.join(", ")}): ek due diligence gerekir. Sor: CBI/RBI ile ikametgâh hakkı alındı mı? Başka ülkede ikametgâh hakkı var mı? Son yıl 90 günden fazla başka ülkede kalındı mı? Son yıl hangi ülkelere gelir vergisi beyanı verildi?`);
  }

  const tin = typeof form.tin === "string" ? form.tin.trim() : "";
  const countryIssuesTin = form.countryIssuesTin !== false;
  if (!tin) {
    if (countryIssuesTin) {
      if (!REASON_CODES.has(form.noTinReason)) add(errors, "C6", "TIN yok ve geçerli neden kodu (A, B veya C) girilmemiş.");
      else if (form.noTinReason === "B" && !String(form.noTinExplanation || "").trim()) {
        add(errors, "C6", "Neden kodu B için TIN alınamamasının açıklaması zorunlu.");
      }
      // BNZ doğruluk kontrolü: neden kodu A, ülkenin TIN vermediği iddiasıdır; tabloda TIN formatı olan bir ülkede şüphelidir
      if (form.noTinReason === "A" && isIso2(form.residenceCountry) && _getCountryTable().some((c) => c.code === form.residenceCountry)) {
        add(manual, "R3", `${form.residenceCountry} için neden kodu A seçildi. OECD AEOI TIN sayfasından ülkenin TIN verip vermediğini kontrol edin.`);
      }
    } else {
      add(manual, "R3", `${form.residenceCountry || "Ülke"} için 'ülke TIN vermiyor' işaretlendi. OECD AEOI TIN sayfasından ülkenin TIN verip vermediğini belgeyle doğrulayın.`);
    }
  } else {
    // BNZ tutarlılık: TIN ve neden kodu birlikte girilemez
    if (REASON_CODES.has(form.noTinReason)) add(errors, "C6", "TIN ve neden kodu birlikte girilmiş. Yalnızca biri olmalı (BNZ tutarlılık kontrolü).");
    const parsedTin = parseTinEntries(tin, form.residenceCountry);
    const declaredResidences = Array.isArray(form.taxResidences) && form.taxResidences.length > 0
      ? [...new Set(form.taxResidences.filter(isIso2))]
      : (isIso2(form.residenceCountry) ? [form.residenceCountry] : []);

    if (parsedTin.mode === "single-multi-error") {
      add(errors, "C6", "Birden fazla TIN girildiğinde her değer ÜlkeKodu:TIN biçiminde olmalı (örn. TR:12345678901, DE:12345673900).");
    } else if (parsedTin.mode === "single") {
      const primary = isIso2(form.residenceCountry) ? form.residenceCountry : (declaredResidences[0] || "");
      const res = validateTin(primary, parsedTin.singleTin);
      if (!res.ok) add(errors, "C6", res.msg);
      else if (res.manual) add(manual, "C6", res.msg);

      const missingCountries = declaredResidences.filter((cc) => cc !== primary);
      for (const cc of missingCountries) {
        add(errors, "C6", `${cc} için TIN girilmemiş (birden fazla vergi ikametgâhı için Ülke:TIN biçiminde tüm ülkelerin TIN'ini girin).`);
      }
    } else if (parsedTin.mode === "keyed") {
      for (const seg of parsedTin.invalidSegments) {
        add(errors, "C6", `Geçersiz TIN girişi (${seg}): ÜlkeKodu:TIN biçiminde olmalı (örn. TR:12345678901).`);
      }
      for (const dup of [...new Set(parsedTin.duplicates)]) {
        add(errors, "C6", `${dup} için birden fazla TIN girilmiş.`);
      }
      const validatedCountries = new Set();
      for (const cc of declaredResidences) {
        if (!parsedTin.map.has(cc)) {
          add(errors, "C6", `${cc} için TIN girilmemiş.`);
          continue;
        }
        const res = validateTin(cc, parsedTin.map.get(cc));
        validatedCountries.add(cc);
        if (!res.ok) add(errors, "C6", res.msg);
        else if (res.manual) add(manual, "C6", res.msg);
      }
      for (const [cc, val] of parsedTin.map.entries()) {
        if (validatedCountries.has(cc)) continue;
        const res = validateTin(cc, val);
        if (!res.ok) add(errors, "C6", res.msg);
        else if (res.manual) add(manual, "C6", res.msg);
        if (declaredResidences.length > 0 && !declaredResidences.includes(cc)) {
          add(warnings, "C6", `${cc} için TIN girilmiş ancak vergi ikametgâh listesinde yer almıyor.`);
        }
      }
    }
  }

  if (isIso2(form.kycCountry) && isIso2(form.residenceCountry) && form.kycCountry !== form.residenceCountry) {
    add(errors, "C3", "Açılış (KYC) ülkesi ile beyan edilen ikametgâh ülkesi farklı.");
  }
  if (!isIso2(form.kycCountry)) add(manual, "C2", "Açılış (KYC) ülkesi yok, makululuk testi tamamlanamadı.");
  // ADGM/BNZ kontrol listesi maddeleri: manuel kontrol, karar ve belge listesine girmez
  add(manual, "R5", "Müşterinin kimlik belgesi (pasaport/kimlik) doğrulandı mı?");
  // CRS göstergesi (c): kurumun ülkesi (TR) dışında telefon var ve TR telefonu yoksa gösterge tetiklenir
  const phoneList = (form.phones || [])
    .map((p) => String(p).replace(/[\s()-]/g, "").replace(/^00(?=\d)/, "+"))
    .filter(Boolean);
  const hasTrPhone = phoneList.some((p) => /^(\+90|0090)/.test(p) || /^05\d{9}$/.test(p));
  const foreignPhones = phoneList.filter((p) => p.startsWith("+") && !/^\+90/.test(p));
  if (foreignPhones.length > 0 && !hasTrPhone) {
    // Telefonun ülkesi beyan edilen bir vergi ikametgâhıysa gösterge beyanla kapanır; değilse ya da bilinmiyorsa manuel
    const declared = form.taxResidences || [];
    const unmatched = foreignPhones.filter((p) => !dialCountries(p).some((c) => declared.includes(c)));
    if (unmatched.length > 0) {
      add(manual, "R6", `CRS göstergesi (c): TR dışında telefon (${unmatched.join(", ")}) var, TR telefonu yok ve bu ülke beyan edilen ikametgâhlar arasında değil. Belgeyle ya da yeni beyanla kapatılmalı.`);
    }
  }
  // CRS raporlanabilir ülke kontrolü: OECD taahhüdü (katılım) tek başına yeterli değil; kurumun yerel listesinde ve
  // değişim anlaşması olan ülke olmalı. Yabancı ikametgâh varsa manuel kontrol gerekir.
  const foreignRes = (form.taxResidences || []).filter((c) => isIso2(c) && c !== RFI_COUNTRY);
  const notPartner = foreignRes.filter((c) => !TR_CRS_PARTNERS.includes(c));
  if (notPartner.length > 0) {
    add(manual, "R9", `Raporlanabilir ülke kontrolü: ${notPartner.join(", ")} Türkiye'nin CRS ortak listesinde (${TR_CRS_PARTNERS_VERSION}) yok. Değişim anlaşması ve güncel liste elle doğrulanmalı.`);
  }
  // R10: ilişki yöneticisi bilgisi ve yüksek değerli hesap incelemesi
  if (form.rmKnowsReportable === true) add(errors, "R10", "İlişki yöneticisi müşterinin raporlanabilir kişi olduğunu biliyor; beyan güvenilir kabul edilemez (reason to know).");
  if (form.highValue === true) add(manual, "R10", "Yüksek değerli hesap: ilişki yöneticisi incelemesi ve insan onayı gerekli.");
  // CRS göstergesi (b): kurumun ülkesi dışında güncel adres
  if (form.address && isIso2(form.address.country) && form.address.country !== RFI_COUNTRY
      && !(form.taxResidences || []).includes(form.address.country)) {
    add(manual, "R8", `CRS göstergesi (b): güncel adres TR dışında (${form.address.country}). Beyan ikametgâhı ile ilişkisi belgeyle kapatılmalı.`);
  }
  if (form.accountHolderType === "entity") {
    add(manual, "R4", "İmzalayan yetkilinin ad, ünvan ve sıfatı kayıtlı mı? Kuruluş tarihi/ülkesi, kayıt veya lisans no, e-posta ve telefon alındı mı?");
  }

  if (errors.some((e) => ["C1", "C3", "C5", "C6"].includes(e.rule))) {
    add(manual, "C4", "Test başarısız: yeni geçerli beyan ya da belgeli makul açıklama istenmeli.");
  }
  return { valid: errors.length === 0, errors, warnings, manual };
}

// ===== Belge eşlemesi: hangi kural hangi belgeyi istiyor =====
const DOCS = {
  C1: "İmzalı, tarihli ve eksiksiz CRS self-certification formu",
  C2: "Açılış (KYC) ülkesini gösteren kimlik ya da adres belgesi",
  C3: "Açılış ülkesiyle uyumlu yeni self-certification ya da ikametgâh kanıtı",
  C4: "Yeni geçerli beyan ya da belgeli makul açıklama",
  C5: "Vergi ikametgâhı belgesi ve güncel vergi ikametgâh listesi",
  C6: "TIN, ya da geçerli neden kodu (A, B, C); B için yazılı açıklama",
  C6M: "TIN'in ülkenin resmi formatına göre elle doğrulanması (bu araçta o ülkenin tablosu yok)",
  C7: "Geçici prosedür kararı ve imzalı beyan",
  R1: "Kontrol eden kişilerin kimlik ve rol bilgileri ile kayıtları",
  R2: "CBI/RBI ek due diligence: müşteri görüşmesi kaydı ve yanıtlar, ikametgâh/vatandaşlık ve vergi beyanı belgeleri",
  R3: "OECD AEOI TIN sayfası ile ülkenin TIN vermeme durumunun / neden kodu A'nın doğrulama kaydı",
  R6: "Yabancı telefonun ikametgâh ile ilişkisini gösteren belge ya da yeni self-certification (CRS gösterge c)",
  R8: "Yabancı adresin ikametgâh ile ilişkisini gösteren belge ya da self-certification (CRS gösterge b)",
  R9: "Kurumun yerel raporlanabilir ülke listesi ile değişim anlaşmasının doğrulama kaydı (OECD taahhüdü tek başına yeterli değil)",
  R10: "İlişki yöneticisinin değerlendirme notu ve yüksek değerli hesap incelemesi kaydı",
  R7: "Tek isimli müşterinin kimlik belgesi (ad NFN, soyad olarak raporlama kaydı)",
  F1: "ABD kişisi beyanı (W-9) ya da non-US beyanı (W-8BEN)",
  F2: "Non-US vatandaşlık belgesi ve Certificate of Loss of Nationality ya da açıklama",
  F3: "ABD adresinin hesap kayıtlarıyla doğrulanması",
  F4: "Telefon numarasının hangi ülkeye ait olduğunu gösteren belge ya da açıklama",
  F5: "Sabit ödeme talimatının iptali ya da ABD dışı hesaba yönlendirme kaydı",
  F6: "Vekil ya da imza yetkilisinin non-US adres belgesi",
  F7: "Care-of adres yerine kalıcı ikametgâh kanıtı",
  F8: "Cure ya da recalcitrant adımları için uzman kararı",
  F9: "Hesap açılış ve idame gözden geçirme kayıtları"
};

// Kararı verir: MAKUL DEĞİL / MANUEL İNCELEME / MAKUL
// F9 her formda standart olarak manuel çıktığı için karara dahil edilmez.
function verdict(results) {
  const all = Object.values(results).filter(Boolean);
  const errors = all.flatMap((r) => r.errors);
  const action = all.flatMap((r) => [...r.warnings, ...r.manual]).filter((m) => !CHECKLIST_ONLY.includes(m.rule));
  if (errors.length > 0) return { code: "bad", label: "MAKUL DEĞİL", sub: "Formda düzeltilmesi gereken hatalar var." };
  if (action.length > 0) return { code: "man", label: "MANUEL İNCELEME GEREKİYOR", sub: "Otomatik karar verilemedi, aşağıdaki maddeleri belgeyle kapatın." };
  return { code: "ok", label: "MAKUL", sub: "Ön kontrolde hata ya da eksik bulunmadı." };
}

// Hatalı ve manuel maddelerden istenecek belgeleri çıkarır (tekrarsız)
function requiredDocs(results) {
  const all = Object.values(results).filter(Boolean);
  const items = [];
  for (const r of all) {
    items.push(...r.errors, ...r.warnings);
    for (const m of r.manual) items.push({ ...m, rule: m.rule === "C6" ? "C6M" : m.rule });
  }
  const seen = new Map();
  for (const it of items) {
    if (CHECKLIST_ONLY.includes(it.rule)) continue;
    const doc = DOCS[it.rule];
    if (!doc) continue;
    if (!seen.has(doc)) seen.set(doc, { rule: it.rule === "C6M" ? "C6" : it.rule, doc });
  }
  return [...seen.values()];
}

// Ham form değerlerinden kontrol nesnesi üretir
function buildForm(v) {
  const up = (s) => String(s || "").trim().toUpperCase();
  const list = (s) => Array.isArray(s)
    ? s.map((x) => String(x || "").trim()).filter(Boolean)
    : String(s || "").split(/[,;]/).map((x) => x.trim()).filter(Boolean);
  return {
    fullName: v.fullName,
    accountHolderType: v.accountHolderType,
    residenceCountry: up(v.residenceCountry),
    taxResidences: list(v.taxResidences).map(up),
    dateOfBirth: v.dateOfBirth,
    declarationDate: v.declarationDate,
    signed: v.signed === true,
    tin: v.tin,
    noTinReason: v.noTinReason,
    noTinExplanation: v.noTinExplanation,
    countryIssuesTin: v.countryIssuesTin === true,
    kycCountry: up(v.kycCountry),
    address: { country: up(v.addressCountry), isPoBox: v.isPoBox === true, careOf: v.careOf === true, soleAddress: v.soleAddress === true },
    citizenship: up(v.citizenship),
    birthCountry: up(v.birthCountry),
    phones: list(v.phones),
    usPersonDeclared: v.usPersonDeclared === true,
    usGreenCard: v.usGreenCard === true,
    highValue: v.highValue === true,
    rmKnowsReportable: v.rmKnowsReportable === true,
    usDays183: v.usDays183 === true,
    standingUsInstructions: v.standingUs === true ? [{}] : [],
    usPoaOrSigners: v.usPoa === true ? [{ usAddress: true }] : [],
    birthCountryCureDocs: v.cureDocs
  };
}

function check(v, today) {
  const form = buildForm(v);
  const results = {
    fatca: validateFatca(form),
    crs: validateCrs(form, { today })
  };
  return { results, verdict: verdict(results), docs: requiredDocs(results) };
}

var ENGINE = {
  check,
  buildForm,
  verdict,
  requiredDocs,
  validateFatca,
  validateCrs,
  validateTin,
  tinCountryCheck,
  parseTinEntries,
  TR_CRS_PARTNERS,
  TR_CRS_PARTNERS_VERSION,
  get COUNTRY_TABLE() { return _getCountryTable(); },
  DOCS
};

if (typeof module === "object" && module.exports) {
  module.exports = {
    check: ENGINE.check,
    buildForm: ENGINE.buildForm,
    verdict: ENGINE.verdict,
    requiredDocs: ENGINE.requiredDocs,
    validateFatca: ENGINE.validateFatca,
    validateCrs: ENGINE.validateCrs,
    validateTin: ENGINE.validateTin,
    tinCountryCheck: ENGINE.tinCountryCheck,
    parseTinEntries: ENGINE.parseTinEntries,
    TR_CRS_PARTNERS: ENGINE.TR_CRS_PARTNERS,
    TR_CRS_PARTNERS_VERSION: ENGINE.TR_CRS_PARTNERS_VERSION,
    COUNTRY_TABLE: ENGINE.COUNTRY_TABLE,
    DOCS: ENGINE.DOCS
  };
}
