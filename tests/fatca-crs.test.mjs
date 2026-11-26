import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { buildHtml, computeScriptHashes } from "../build.mjs";
import nodeEngine from "../src/engine.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.resolve(__dirname, "..", "FATCA-CRS-Kontrol.html");
const html = fs.readFileSync(htmlPath, "utf8");

function extractScripts(source) {
  return [...source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
}

function loadEngine() {
  const scripts = extractScripts(html);
  assert.ok(scripts.length >= 2, "Expected tin-rules and engine scripts");
  const context = {};
  vm.createContext(context);
  vm.runInContext(scripts[0], context);
  vm.runInContext(scripts[1], context);
  return context.ENGINE;
}

function baseInput(overrides = {}) {
  return {
    fullName: "Ayşe Örnek",
    accountHolderType: "individual",
    dateOfBirth: "1990-05-14",
    declarationDate: "2026-11-20",
    signed: true,
    residenceCountry: "TR",
    taxResidences: "TR",
    tin: "12345678901",
    noTinReason: "",
    noTinExplanation: "",
    countryIssuesTin: true,
    addressCountry: "TR",
    kycCountry: "TR",
    isPoBox: false,
    careOf: false,
    soleAddress: false,
    highValue: false,
    rmKnowsReportable: false,
    citizenship: "TR",
    birthCountry: "TR",
    phones: "+90 532 000 00 00",
    cureDocs: "",
    usPersonDeclared: false,
    standingUs: false,
    usPoa: false,
    usGreenCard: false,
    usDays183: false,
    ...overrides
  };
}

test("CSP meta tag enforces offline policy and matches exact UTF-8 <script> SHA-256 digests", () => {
  const cspMatch = html.match(/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"\s*\/?>/i);
  assert.ok(cspMatch, "CSP meta tag must exist");
  const csp = cspMatch[1];

  assert.match(csp, /\bdefault-src\s+'none'/);
  assert.match(csp, /\bconnect-src\s+'none'/);
  assert.match(csp, /\bimg-src\s+'none'/);
  assert.match(csp, /\bstyle-src\s+'unsafe-inline'/);
  assert.ok(!csp.includes("'unsafe-eval'"), "CSP must not allow unsafe-eval");

  const scriptSrcMatch = csp.match(/\bscript-src\s+([^;]+)/);
  assert.ok(scriptSrcMatch, "CSP must include script-src");
  assert.ok(!scriptSrcMatch[1].includes("'unsafe-inline'"), "script-src must not allow unsafe-inline");

  const cspHashes = [...scriptSrcMatch[1].matchAll(/'sha256-([^']+)'/g)].map((m) => m[1]);
  const scripts = extractScripts(html);
  assert.equal(scripts.length, 3, "Expected 3 inline <script> blocks");
  assert.equal(cspHashes.length, scripts.length, "Each <script> block must have one sha256 hash in script-src");

  const actualHashes = scripts.map((body) =>
    crypto.createHash("sha256").update(body, "utf8").digest("base64")
  );
  assert.deepEqual(cspHashes, actualHashes);
});

test("No innerHTML occurrences and PII inputs disable autocomplete", () => {
  const scripts = extractScripts(html);
  for (const body of scripts) {
    assert.equal(body.includes("innerHTML"), false, "Script must not use innerHTML");
  }
  for (const fieldId of ["fullName", "dateOfBirth", "tin"]) {
    const inputRe = new RegExp(`<input[^>]*id=["']${fieldId}["'][^>]*autocomplete=["']off["'][^>]*>`, "i");
    assert.match(html, inputRe, `PII field ${fieldId} must have autocomplete="off"`);
  }
});

test("UI script does not auto-fill missing declarationDate and SAMPLE resets all checkboxes", () => {
  const scripts = extractScripts(html);
  const uiScript = scripts[2];
  assert.equal(uiScript.includes("v.declarationDate = today"), false, "run() must not auto-fill declarationDate");
  for (const key of ["usGreenCard", "usDays183", "highValue", "rmKnowsReportable"]) {
    assert.match(uiScript, new RegExp(`\\b${key}\\s*:\\s*false\\b`), `SAMPLE must explicitly reset ${key}`);
  }
});

test("Baseline valid TR individual has zero errors and only manual C6 TIN format check", () => {
  const ENGINE = loadEngine();
  const out = ENGINE.check(baseInput(), "2026-11-25");
  assert.equal(out.results.fatca.errors.length, 0);
  assert.equal(out.results.crs.errors.length, 0);
  assert.equal(out.results.crs.warnings.length, 0);
  assert.deepEqual(
    Array.from(out.results.crs.manual.filter((m) => m.rule !== "R5"), (m) => m.rule),
    ["C6"]
  );
  assert.equal(out.verdict.code, "man");
});

test("parseDate rejects impossible calendar dates like 2026-02-31", () => {
  const ENGINE = loadEngine();
  const badDecl = ENGINE.check(baseInput({ declarationDate: "2026-02-31" }), "2026-11-25");
  assert.equal(badDecl.verdict.code, "bad");
  assert.ok(badDecl.results.crs.errors.some((e) => e.rule === "C1"));

  const badDob = ENGINE.check(baseInput({ dateOfBirth: "2026-02-31" }), "2026-11-25");
  assert.equal(badDob.verdict.code, "bad");
  assert.ok(badDob.results.crs.errors.some((e) => e.rule === "C1"));
});

test("Missing declarationDate triggers C1 error", () => {
  const ENGINE = loadEngine();
  const out = ENGINE.check(baseInput({ declarationDate: "" }), "2026-11-25");
  assert.equal(out.verdict.code, "bad");
  assert.ok(out.results.crs.errors.some((e) => e.rule === "C1"));
});

test("countryIssuesTin: false with empty TIN triggers R3 manual verification instead of silent MAKUL", () => {
  const ENGINE = loadEngine();
  const out = ENGINE.check(baseInput({ tin: "", countryIssuesTin: false }), "2026-11-25");
  assert.equal(out.verdict.code, "man");
  assert.ok(out.results.crs.manual.some((m) => m.rule === "R3"));
  assert.ok(out.docs.some((d) => d.rule === "R3"));
});

test("foreignPhones normalizes leading 00 prefix (0049176123456 triggers R6)", () => {
  const ENGINE = loadEngine();
  const out = ENGINE.check(baseInput({ phones: "0049176123456" }), "2026-11-25");
  assert.equal(out.verdict.code, "man");
  assert.ok(out.results.crs.manual.some((m) => m.rule === "R6"));
  assert.ok(out.docs.some((d) => d.rule === "R6"));
});

test("Multi-residence CC:TIN validation passes when all residence TINs are valid", () => {
  const ENGINE = loadEngine();
  for (const tinInput of ["TR:12345678901, DE:12345673900", "TR:12345678901; DE:12345673900"]) {
    const out = ENGINE.check(baseInput({ taxResidences: "TR, DE", tin: tinInput }), "2026-11-25");
    assert.equal(out.results.fatca.errors.length, 0);
    assert.equal(out.results.crs.errors.length, 0);
    assert.equal(out.results.crs.warnings.length, 0);
    assert.equal(out.verdict.code, "man");
    const c6Msgs = out.results.crs.manual.filter((m) => m.rule === "C6").map((m) => m.msg);
    assert.ok(c6Msgs.some((m) => m.startsWith("TR ")));
    assert.ok(c6Msgs.some((m) => m.startsWith("DE ")));
  }
});

test("Multi-residence CC:TIN flags missing 2nd country TIN", () => {
  const ENGINE = loadEngine();
  for (const tinInput of ["TR:12345678901", "12345678901"]) {
    const out = ENGINE.check(baseInput({ taxResidences: "TR, DE", tin: tinInput }), "2026-11-25");
    assert.equal(out.verdict.code, "bad");
    assert.ok(out.results.crs.errors.some((e) => e.rule === "C6" && e.msg.includes("DE")));
  }
});

test("Multi-residence CC:TIN flags invalid 2nd country TIN", () => {
  const ENGINE = loadEngine();
  const out = ENGINE.check(baseInput({ taxResidences: "TR, DE", tin: "TR:12345678901, DE:12" }), "2026-11-25");
  assert.equal(out.verdict.code, "bad");
  assert.ok(out.results.crs.errors.some((e) => e.rule === "C6" && e.msg.includes("DE")));
});

test("Single-TIN backward compatibility works for single residence and omitted taxResidences", () => {
  const ENGINE = loadEngine();
  const singleOut = ENGINE.check(baseInput({ taxResidences: "TR", tin: "12345678901" }), "2026-11-25");
  assert.equal(singleOut.results.crs.errors.length, 0);
  assert.equal(singleOut.verdict.code, "man");

  const directForm = ENGINE.buildForm(baseInput({ tin: "12345678901" }));
  delete directForm.taxResidences;
  const directCrs = ENGINE.validateCrs(directForm, { today: "2026-11-25" });
  assert.equal(directCrs.errors.length, 0);
  assert.ok(directCrs.manual.some((m) => m.rule === "C6"));
});

test("TR_CRS_PARTNERS version notice is documented in engine and UI", () => {
  const ENGINE = loadEngine();
  const expectedNotice = "2023 GİB listesi — güncel liste için OECD AEOI Portalını kontrol edin";
  assert.equal(ENGINE.TR_CRS_PARTNERS_VERSION, expectedNotice);
  assert.ok(html.includes(expectedNotice), "UI HTML must include TR_CRS_PARTNERS version notice");
});

test("build.mjs output matches FATCA-CRS-Kontrol.html and CSP hashes stay consistent", () => {
  const built = buildHtml({ write: false });
  assert.equal(built.html, html, "FATCA-CRS-Kontrol.html must match build.mjs output");
  assert.deepEqual(built.hashes, computeScriptHashes(html));

  const outFromNode = nodeEngine.check(baseInput({ taxResidences: "TR, DE", tin: "TR:12345678901, DE:12345673900" }), "2026-11-25");
  assert.equal(outFromNode.results.crs.errors.length, 0);
});

test("US entity EIN (XX-XXXXXXX) is accepted for entity accounts and rejected for individuals", () => {
  const ENGINE = loadEngine();
  const entityOut = ENGINE.check(baseInput({
    accountHolderType: "entity",
    dateOfBirth: "",
    residenceCountry: "US",
    taxResidences: "US",
    addressCountry: "US",
    kycCountry: "US",
    citizenship: "US",
    birthCountry: "US",
    phones: "+1 212 555 0100",
    usPersonDeclared: true,
    tin: "12-3456789"
  }), "2026-11-25");
  assert.equal(entityOut.results.fatca.errors.length, 0);

  const indivOut = ENGINE.check(baseInput({
    accountHolderType: "individual",
    residenceCountry: "US",
    taxResidences: "US",
    addressCountry: "US",
    kycCountry: "US",
    citizenship: "US",
    birthCountry: "US",
    phones: "+1 212 555 0100",
    usPersonDeclared: true,
    tin: "12-3456789"
  }), "2026-11-25");
  assert.ok(indivOut.results.fatca.errors.some((e) => e.rule === "F1"));
});
