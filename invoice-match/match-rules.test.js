const assert = require("assert");
const IM = require("./match-rules.js");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const match = IM.evaluateCase(IM.caseById("match"));
assert.strictEqual(match.status, "match");
assert.strictEqual(match.reasons.length, 0);
assert.strictEqual(match.invSub, 1200000);
assert.strictEqual(match.invVat, 84000);
assert.strictEqual(match.invTotal, 1284000);
assert.strictEqual(match.poSub, match.invSub);
assert.strictEqual(match.recSub, match.invSub);
assert.strictEqual(IM.formatTHB(match.invTotal), "THB 12,840.00");
assert.strictEqual(match.lines[0].invAmt, 1000000);
assert.strictEqual(match.lines[1].invAmt, 200000);
assert.ok(IM.matchSummary(match, "en").includes("does not approve"));

const check = IM.evaluateCase(IM.caseById("check"));
assert.strictEqual(check.status, "check");
assert.strictEqual(check.lines[0].varianceHundredths, 150);
assert.strictEqual(IM.formatPercentFromHundredths(150), "1.50%");
assert.strictEqual(check.invSub, 1015000);
assert.strictEqual(check.invVat, 71050);
assert.strictEqual(check.invTotal, 1086050);
assert.strictEqual(check.poSub, 1000000);
assert.strictEqual(check.poVat, 70000);
assert.strictEqual(check.poTotal, 1070000);
assert.strictEqual(IM.formatTHB(check.invTotal), "THB 10,860.50");
assert.ok(check.reasons.some((r) => r.code === "price"));
assert.ok(!check.reasons.some((r) => r.severity === "hold"));
assert.ok(IM.reasonText(check.reasons[0], "en").includes("1.50%"));
assert.ok(IM.reasonText(check.reasons[0], "en").includes("Needs check"));

const hold = IM.evaluateCase(IM.caseById("hold"));
assert.strictEqual(hold.status, "hold");
assert.strictEqual(hold.lines[0].invoiceQty, 120);
assert.strictEqual(hold.lines[0].receivedQty, 100);
assert.strictEqual(hold.lines[0].poQty, 100);
assert.strictEqual(hold.invSub, 960000);
assert.strictEqual(hold.invVat, 67200);
assert.strictEqual(hold.invTotal, 1027200);
assert.strictEqual(hold.poTotal, 856000);
assert.strictEqual(hold.recSub, 800000);
assert.strictEqual(IM.formatTHB(hold.invTotal), "THB 10,272.00");
assert.strictEqual(IM.formatTHB(hold.poTotal), "THB 8,560.00");
assert.ok(hold.reasons.some((r) => r.code === "qty-over" && r.overBy === 20));
const holdText = IM.reasonText(hold.reasons.find((r) => r.code === "qty-over"), "en");
assert.ok(holdText.includes("must Hold"));
assert.ok(holdText.includes("120"));
assert.ok(holdText.includes("100"));

["po", "grn", "invoice"].forEach((kind) => {
  const svg = IM.documentSvg(kind, hold, "en");
  assert.ok(svg.includes("Not proof of payment") || kind !== "grn");
  assert.ok(svg.includes("SAMPLE"));
  assert.ok(!/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/.test(svg));
  assert.ok(!/\b\d{13}\b/.test(svg));
});
assert.ok(IM.documentSvg("invoice", hold, "en").includes("THB 10,272.00"));
assert.ok(IM.documentSvg("invoice", hold, "en").includes(">120<"));
assert.ok(IM.documentSvg("grn", hold, "en").includes(">100<"));
assert.ok(IM.documentSvg("po", hold, "en").includes("THB 8,560.00"));
assert.ok(IM.documentSvg("grn", hold, "en").includes("Not proof of payment"));
assert.ok(IM.documentSvg("invoice", match, "en").includes("THB 12,840.00"));
assert.ok(IM.documentSvg("po", check, "en").includes("THB 10,700.00"));
assert.ok(IM.documentSvg("invoice", check, "en").includes("THB 10,860.50"));

function oneLine(line) {
  const next = clone(IM.caseById("match"));
  next.lines = [Object.assign({
    sku: "SMP-ONE",
    name: { en: "Single sample line", th: "บรรทัดตัวอย่างเดียว" },
    poQty: 1, poUnit: 100, receivedQty: 1, invoiceQty: 1, invoiceUnit: 100
  }, line)];
  return next;
}

const exactOnePercent = IM.evaluateCase(oneLine({
  poQty: 1, poUnit: 100, receivedQty: 1, invoiceQty: 1, invoiceUnit: 101
}));
assert.strictEqual(exactOnePercent.status, "match");
assert.strictEqual(exactOnePercent.invSub, 10100);
assert.strictEqual(exactOnePercent.invVat, 707);
assert.strictEqual(exactOnePercent.invTotal, 10807);
assert.strictEqual(IM.formatTHB(exactOnePercent.invTotal), "THB 108.07");

const justOver = IM.evaluateCase(oneLine({
  poQty: 1, poUnit: 100, receivedQty: 1, invoiceQty: 1, invoiceUnit: 101.01
}));
assert.strictEqual(justOver.status, "check");
assert.strictEqual(justOver.lines[0].varianceHundredths, 101);
assert.strictEqual(justOver.invVat, 707);
assert.strictEqual(justOver.invTotal, 10808);

const inside = IM.evaluateCase(oneLine({
  poQty: 2, poUnit: 100, receivedQty: 2, invoiceQty: 2, invoiceUnit: 100.5
}));
assert.strictEqual(inside.status, "match");
assert.strictEqual(inside.lines[0].varianceHundredths, 50);
assert.strictEqual(inside.invSub, 20100);
assert.strictEqual(inside.invVat, 1407);
assert.strictEqual(inside.invTotal, 21507);

const oneOver = IM.evaluateCase(oneLine({
  poQty: 10, poUnit: 10, receivedQty: 10, invoiceQty: 11, invoiceUnit: 10
}));
assert.strictEqual(oneOver.status, "hold");
assert.strictEqual(oneOver.invSub, 11000);
assert.strictEqual(oneOver.invVat, 770);
assert.strictEqual(oneOver.invTotal, 11770);

const both = IM.evaluateCase(oneLine({
  poQty: 10, poUnit: 100, receivedQty: 10, invoiceQty: 12, invoiceUnit: 110
}));
assert.strictEqual(both.status, "hold");
assert.ok(both.reasons.some((r) => r.code === "qty-over"));
assert.ok(both.reasons.some((r) => r.code === "price"));

const partial = IM.evaluateCase(oneLine({
  poQty: 100, poUnit: 10, receivedQty: 80, invoiceQty: 80, invoiceUnit: 10
}));
assert.strictEqual(partial.status, "check");
assert.ok(partial.reasons.some((r) => r.code === "qty-vs-po"));

const noPhoto = clone(IM.caseById("match"));
noPhoto.evidence.deliveryPhoto = false;
const noPhotoResult = IM.evaluateCase(noPhoto);
assert.strictEqual(noPhotoResult.status, "check");
assert.ok(noPhotoResult.reasons.some((r) => r.code === "no-photo"));

const noGrn = clone(IM.caseById("match"));
noGrn.evidence.grn = false;
noGrn.lines.forEach((ln) => { ln.receivedQty = null; });
const noGrnResult = IM.evaluateCase(noGrn);
assert.strictEqual(noGrnResult.status, "hold");
assert.ok(noGrnResult.reasons.some((r) => r.code === "no-grn"));
assert.strictEqual(noGrnResult.recSub, null);

const badVat = clone(IM.caseById("match"));
badVat.stated = { subtotal: 12000, vat: 840.01, total: 12840.01 };
const badVatResult = IM.evaluateCase(badVat);
assert.strictEqual(badVatResult.status, "check");
assert.ok(badVatResult.reasons.some((r) => r.code === "arith-vat"));
assert.strictEqual(badVatResult.invVat, 84000);

assert.strictEqual(IM.vatOn(10101), 707);
assert.strictEqual(IM.lineAmount(120, 80), 960000);
assert.strictEqual(IM.CASES.length, 3);

const blob = JSON.stringify(IM.CASES) + IM.documentSvg("grn", hold, "en") + IM.documentSvg("invoice", hold, "th");
assert.ok(!/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/.test(blob));
assert.ok(!/\b\d{13}\b/.test(blob));
assert.ok(!/malee/i.test(blob));
assert.ok(!/bank/i.test(blob));

console.log("match-rules: 3 sample cases and boundary totals ok");
