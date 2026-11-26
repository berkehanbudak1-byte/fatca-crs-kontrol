import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENGINE_PLACEHOLDER = "{{ENGINE_JS}}";
const CSP_PLACEHOLDER = "{{CSP_SCRIPT_HASHES}}";

export function extractScripts(html) {
  return [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
}

export function computeScriptHashes(html) {
  return extractScripts(html).map(
    (body) => `'sha256-${crypto.createHash("sha256").update(body, "utf8").digest("base64")}'`
  );
}

export function buildHtml({
  templatePath = path.join(__dirname, "src", "template.html"),
  enginePath = path.join(__dirname, "src", "engine.js"),
  outputPath = path.join(__dirname, "FATCA-CRS-Kontrol.html"),
  write = true
} = {}) {
  const template = fs.readFileSync(templatePath, "utf8").replace(/\r\n/g, "\n");
  const engineCode = fs.readFileSync(enginePath, "utf8").replace(/\r\n/g, "\n").trimEnd();

  if (!template.includes(ENGINE_PLACEHOLDER)) {
    throw new Error(`Template missing ${ENGINE_PLACEHOLDER}`);
  }
  if (!template.includes(CSP_PLACEHOLDER)) {
    throw new Error(`Template missing ${CSP_PLACEHOLDER}`);
  }
  if (engineCode.includes("</script>")) {
    throw new Error("Engine source must not contain </script>");
  }

  const withEngine = template.replace(ENGINE_PLACEHOLDER, () => engineCode);
  const hashes = computeScriptHashes(withEngine);
  const finalHtml = withEngine.replace(CSP_PLACEHOLDER, () => hashes.join(" "));

  if (write) {
    fs.writeFileSync(outputPath, finalHtml, "utf8");
  }
  return { html: finalHtml, hashes, outputPath };
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const { hashes, outputPath } = buildHtml();
  console.log(`Built ${path.basename(outputPath)} with ${hashes.length} CSP script hashes.`);
}
