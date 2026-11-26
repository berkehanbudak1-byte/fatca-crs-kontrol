"use strict";

// Sentetik CSV okur, sonuç CSV'si yazar. Ağ çağrısı yok.
var fs = require("fs");
var E = require("../lib/engine");

var girdi = process.argv[2];
var cikti = process.argv[3];
if (!girdi || !cikti) {
  console.error("Kullanım: node scripts/toplu-kontrol.js girdi.csv cikti.csv");
  process.exit(1);
}

var summary = E.screenCsv(fs.readFileSync(girdi, "utf8"));
if (summary.error) {
  console.error(summary.error);
  process.exit(1);
}
fs.writeFileSync(cikti, E.exportBatchCsv(summary), "utf8");
var c = summary.counts || {};
console.log(summary.total + " satır yazıldı.");
console.log("Makul: " + (c.ok || 0) + "  Manuel: " + (c.man || 0) + "  Makul değil: " + (c.bad || 0) + "  Tüzel: " + (c.entity || 0));
console.log(cikti);
