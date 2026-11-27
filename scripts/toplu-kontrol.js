"use strict";

// Sentetik CSV okur, sonuç CSV'si yazar. Ağ çağrısı yok.
var fs = require("fs");
var path = require("path");
var E = require("../lib/engine");

var MAX_INPUT_BYTES = E.MAX_CSV_BYTES || (10 * 1024 * 1024);

function validateCliPaths(girdi, cikti) {
  if (typeof girdi !== "string" || typeof cikti !== "string" || !girdi.trim() || !cikti.trim()) {
    throw new Error("Girdi ve çıktı dosya yolları boş olamaz.");
  }
  if (girdi.indexOf("\0") !== -1 || cikti.indexOf("\0") !== -1) {
    throw new Error("Dosya yolunda geçersiz karakter (NUL) bulundu.");
  }
  var resolvedIn = path.resolve(girdi);
  var resolvedOut = path.resolve(cikti);
  if (resolvedIn === resolvedOut) {
    throw new Error("Çıktı dosyası girdi dosyasıyla aynı olamaz.");
  }
  var stat;
  try {
    stat = fs.statSync(resolvedIn);
  } catch (err) {
    throw new Error("Girdi dosyası okunamadı: " + resolvedIn);
  }
  if (!stat.isFile()) {
    throw new Error("Girdi yolu düzenli bir dosya olmalıdır.");
  }
  if (stat.size > MAX_INPUT_BYTES) {
    throw new Error("Girdi dosyası izin verilen boyut sınırını aşıyor (" + MAX_INPUT_BYTES + " bayt).");
  }
  var outDir = path.dirname(resolvedOut);
  if (!fs.existsSync(outDir) || !fs.statSync(outDir).isDirectory()) {
    throw new Error("Çıktı klasörü mevcut değil: " + outDir);
  }
  return { inputPath: resolvedIn, outputPath: resolvedOut };
}

function runCli(argv) {
  var girdi = argv[2];
  var cikti = argv[3];
  if (!girdi || !cikti) {
    console.error("Kullanım: node scripts/toplu-kontrol.js girdi.csv cikti.csv");
    process.exit(1);
  }
  var paths;
  try {
    paths = validateCliPaths(girdi, cikti);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  var summary = E.screenCsv(fs.readFileSync(paths.inputPath, "utf8"));
  if (summary.error) {
    console.error(summary.error);
    process.exit(1);
  }
  fs.writeFileSync(paths.outputPath, E.exportBatchCsv(summary), "utf8");
  var c = summary.counts || {};
  console.log(summary.total + " satır yazıldı.");
  console.log("Makul: " + (c.ok || 0) + "  Manuel: " + (c.man || 0) + "  Makul değil: " + (c.bad || 0) + "  Tüzel: " + (c.entity || 0));
  console.log(paths.outputPath);
}

if (require.main === module) {
  runCli(process.argv);
}

module.exports = {
  MAX_INPUT_BYTES: MAX_INPUT_BYTES,
  validateCliPaths: validateCliPaths,
  runCli: runCli
};
