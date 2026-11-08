/* Fictional invoice-match sample rules. No network, no uploads, no payment. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.InvoiceMatch = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  var VAT_RATE = 0.07;
  var PRICE_THRESHOLD = 0.01;

  function satang(thb) {
    if (typeof thb !== "number" || !isFinite(thb)) throw new Error("Amount must be a finite number");
    return Math.round(thb * 100);
  }

  function formatQty(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function formatTHB(satangValue) {
    var sign = satangValue < 0 ? "-" : "";
    var abs = Math.abs(satangValue);
    var whole = Math.floor(abs / 100);
    var frac = String(abs % 100).padStart(2, "0");
    var grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return sign + "THB " + grouped + "." + frac;
  }

  /* Hundredths of a percent, so 1% is 100 and 1.50% is 150. */
  function varianceHundredths(diffSatang, poUnitSatang) {
    if (poUnitSatang === 0) return diffSatang === 0 ? 0 : Infinity;
    return Math.round((diffSatang * 10000) / poUnitSatang);
  }

  function formatPercentFromHundredths(hundredths) {
    if (hundredths === Infinity) return "n/a";
    var sign = hundredths < 0 ? "-" : "";
    var abs = Math.abs(hundredths);
    var whole = Math.floor(abs / 100);
    var frac = String(abs % 100).padStart(2, "0");
    return sign + whole + "." + frac + "%";
  }

  function priceOverThreshold(diffSatang, poUnitSatang) {
    if (poUnitSatang === 0) return diffSatang !== 0;
    return diffSatang * 100 > poUnitSatang;
  }

  function lineAmount(qty, unitThb) {
    if (!Number.isInteger(qty) || qty < 0) throw new Error("Quantity must be a whole number of 0 or more");
    return qty * satang(unitThb);
  }

  function vatOn(subtotalSatang) {
    return Math.round(subtotalSatang * 7 / 100);
  }

  function xmlEscape(value) {
    return String(value).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function text(entry, lang) {
    if (entry == null) return "";
    if (typeof entry === "string") return entry;
    return entry[lang] || entry.en || "";
  }

  var CASES = [
    {
      id: "match",
      poNo: "PO-SAMPLE-1001",
      invoiceNo: "INV-SAMPLE-1001",
      grnNo: "GRN-SAMPLE-1001",
      poDate: "2026-10-20",
      receivedDate: "2026-10-28",
      invoiceDate: "2026-11-01",
      supplier: { en: "Northwind Sample Supply (fictional)", th: "นอร์ธวินด์ ซัพพลายตัวอย่าง (สมมติ)" },
      buyer: { en: "Sample Buyer Co. (fictional)", th: "บริษัทผู้ซื้อตัวอย่าง (สมมติ)" },
      dock: { en: "Sample receiving dock (placeholder)", th: "จุดรับของตัวอย่าง (ตัวแทน)" },
      evidence: { po: true, grn: true, deliveryPhoto: true, invoicePdf: true },
      lines: [
        {
          sku: "SMP-CTN-01",
          name: { en: "Plain sample carton", th: "กล่องตัวอย่างธรรมดา" },
          poQty: 80, poUnit: 125, receivedQty: 80, invoiceQty: 80, invoiceUnit: 125
        },
        {
          sku: "SMP-DIV-02",
          name: { en: "Sample divider sheet", th: "แผ่นกั้นตัวอย่าง" },
          poQty: 40, poUnit: 50, receivedQty: 40, invoiceQty: 40, invoiceUnit: 50
        }
      ]
    },
    {
      id: "check",
      poNo: "PO-SAMPLE-1002",
      invoiceNo: "INV-SAMPLE-1002",
      grnNo: "GRN-SAMPLE-1002",
      poDate: "2026-10-22",
      receivedDate: "2026-10-29",
      invoiceDate: "2026-11-02",
      supplier: { en: "Fabrikam Sample Goods (fictional)", th: "ฟาบริคัมสินค้าตัวอย่าง (สมมติ)" },
      buyer: { en: "Sample Buyer Co. (fictional)", th: "บริษัทผู้ซื้อตัวอย่าง (สมมติ)" },
      dock: { en: "Sample receiving dock (placeholder)", th: "จุดรับของตัวอย่าง (ตัวแทน)" },
      evidence: { po: true, grn: true, deliveryPhoto: true, invoicePdf: true },
      lines: [
        {
          sku: "SMP-FLV-03",
          name: { en: "Sample flavour base", th: "ฐานกลิ่นตัวอย่าง" },
          poQty: 50, poUnit: 200, receivedQty: 50, invoiceQty: 50, invoiceUnit: 203
        }
      ]
    },
    {
      id: "hold",
      poNo: "PO-SAMPLE-1003",
      invoiceNo: "INV-SAMPLE-1003",
      grnNo: "GRN-SAMPLE-1003",
      poDate: "2026-10-24",
      receivedDate: "2026-10-30",
      invoiceDate: "2026-11-03",
      supplier: { en: "Contoso Sample Ingredients (fictional)", th: "คอนโตโซวัตถุดิบตัวอย่าง (สมมติ)" },
      buyer: { en: "Sample Buyer Co. (fictional)", th: "บริษัทผู้ซื้อตัวอย่าง (สมมติ)" },
      dock: { en: "Sample receiving dock (placeholder)", th: "จุดรับของตัวอย่าง (ตัวแทน)" },
      evidence: { po: true, grn: true, deliveryPhoto: true, invoicePdf: true },
      lines: [
        {
          sku: "SMP-DRM-04",
          name: { en: "Sample ingredient drum", th: "ถังวัตถุดิบตัวอย่าง" },
          poQty: 100, poUnit: 80, receivedQty: 100, invoiceQty: 120, invoiceUnit: 80
        }
      ]
    }
  ];

  function caseById(id) {
    for (var i = 0; i < CASES.length; i++) if (CASES[i].id === id) return CASES[i];
    return null;
  }

  function evaluateCase(raw) {
    if (!raw || !Array.isArray(raw.lines) || raw.lines.length === 0) throw new Error("A sample case needs at least one line");
    var evidence = {
      po: !!(raw.evidence && raw.evidence.po),
      grn: !!(raw.evidence && raw.evidence.grn),
      deliveryPhoto: !!(raw.evidence && raw.evidence.deliveryPhoto),
      invoicePdf: !!(raw.evidence && raw.evidence.invoicePdf)
    };
    var reasons = [];
    var lines = raw.lines.map(function (ln) {
      var poUnit = satang(ln.poUnit);
      var invoiceUnit = satang(ln.invoiceUnit);
      var diff = Math.abs(invoiceUnit - poUnit);
      var receivedKnown = ln.receivedQty !== null && ln.receivedQty !== undefined;
      return {
        sku: ln.sku,
        name: ln.name,
        poQty: ln.poQty,
        poUnit: poUnit,
        receivedQty: receivedKnown ? ln.receivedQty : null,
        invoiceQty: ln.invoiceQty,
        invoiceUnit: invoiceUnit,
        poAmt: lineAmount(ln.poQty, ln.poUnit),
        recAmt: receivedKnown ? lineAmount(ln.receivedQty, ln.poUnit) : null,
        invAmt: lineAmount(ln.invoiceQty, ln.invoiceUnit),
        diff: diff,
        varianceHundredths: varianceHundredths(diff, poUnit),
        priceOver: priceOverThreshold(diff, poUnit)
      };
    });

    var allReceivedKnown = lines.every(function (ln) { return ln.receivedQty !== null; });
    if (!evidence.grn || !allReceivedKnown) {
      reasons.push({ code: "no-grn", severity: "hold" });
    }
    lines.forEach(function (ln) {
      if (ln.receivedQty !== null && ln.invoiceQty > ln.receivedQty) {
        reasons.push({
          code: "qty-over",
          severity: "hold",
          sku: ln.sku,
          name: ln.name,
          invoiceQty: ln.invoiceQty,
          receivedQty: ln.receivedQty,
          poQty: ln.poQty,
          overBy: ln.invoiceQty - ln.receivedQty
        });
      }
    });
    lines.forEach(function (ln) {
      if (ln.priceOver) {
        reasons.push({
          code: "price",
          severity: "check",
          sku: ln.sku,
          name: ln.name,
          poUnit: ln.poUnit,
          invoiceUnit: ln.invoiceUnit,
          varianceHundredths: ln.varianceHundredths
        });
      }
      if (ln.receivedQty !== null && ln.invoiceQty <= ln.receivedQty && ln.invoiceQty !== ln.poQty) {
        reasons.push({
          code: "qty-vs-po",
          severity: "check",
          sku: ln.sku,
          name: ln.name,
          invoiceQty: ln.invoiceQty,
          poQty: ln.poQty,
          receivedQty: ln.receivedQty
        });
      }
    });
    if (!evidence.po) reasons.push({ code: "no-po", severity: "check" });
    if (!evidence.invoicePdf) reasons.push({ code: "no-invoice", severity: "check" });
    if (evidence.grn && allReceivedKnown && !evidence.deliveryPhoto) reasons.push({ code: "no-photo", severity: "check" });

    var poSub = lines.reduce(function (s, ln) { return s + ln.poAmt; }, 0);
    var invSub = lines.reduce(function (s, ln) { return s + ln.invAmt; }, 0);
    var recSub = allReceivedKnown ? lines.reduce(function (s, ln) { return s + ln.recAmt; }, 0) : null;
    var poVat = vatOn(poSub);
    var invVat = vatOn(invSub);
    var recVat = recSub === null ? null : vatOn(recSub);
    var computed = { subtotal: invSub, vat: invVat, total: invSub + invVat };
    if (raw.stated) {
      if (satang(raw.stated.subtotal) !== invSub) reasons.push({ code: "arith-sub", severity: "check", expected: invSub, stated: satang(raw.stated.subtotal) });
      if (satang(raw.stated.vat) !== invVat) reasons.push({ code: "arith-vat", severity: "check", expected: invVat, stated: satang(raw.stated.vat) });
      if (satang(raw.stated.total) !== computed.total) reasons.push({ code: "arith-total", severity: "check", expected: computed.total, stated: satang(raw.stated.total) });
    }

    var status = "match";
    if (reasons.some(function (r) { return r.severity === "hold"; })) status = "hold";
    else if (reasons.length) status = "check";

    return {
      id: raw.id,
      status: status,
      reasons: reasons,
      lines: lines,
      evidence: evidence,
      poSub: poSub,
      poVat: poVat,
      poTotal: poSub + poVat,
      recSub: recSub,
      recVat: recVat,
      recTotal: recSub === null ? null : recSub + recVat,
      invSub: invSub,
      invVat: invVat,
      invTotal: computed.total,
      vatRate: VAT_RATE,
      priceThreshold: PRICE_THRESHOLD,
      source: raw
    };
  }

  function reasonText(reason, lang) {
    var th = lang === "th";
    if (reason.code === "qty-over") {
      return th
        ? "จำนวนที่วางบิล " + formatQty(reason.invoiceQty) + " หน่วย มากกว่าจำนวนที่รับของ " + formatQty(reason.receivedQty) + " หน่วย (" + text(reason.name, lang) + ", เกิน " + formatQty(reason.overBy) + " หน่วย) ใบสั่งซื้อคือ " + formatQty(reason.poQty) + " หน่วย กฎตัวอย่าง: ถ้าวางบิลเกินของที่รับ ต้องพักไว้"
        : "Quantity billed is " + formatQty(reason.invoiceQty) + " and quantity received is " + formatQty(reason.receivedQty) + " for " + text(reason.name, lang) + " (" + formatQty(reason.overBy) + " over). The purchase order is " + formatQty(reason.poQty) + ". Sample rule: quantity billed beyond received must Hold.";
    }
    if (reason.code === "no-grn") {
      return th
        ? "ยังไม่มีใบรับของ ดังนั้นจำนวนที่รับจึงยืนยันไม่ได้ ต้องพักไว้ ใบรับของและรูปส่งของเป็นหลักฐานว่าของมาถึง ไม่ใช่หลักฐานการจ่ายเงิน"
        : "No goods-received note is on file, so the received quantity cannot be confirmed. Hold. A goods-received note and delivery photo are evidence that goods arrived. They are not proof of payment.";
    }
    if (reason.code === "price") {
      return th
        ? "ราคาต่อหน่วยในใบแจ้งหนี้ " + formatTHB(reason.invoiceUnit) + " ต่างจากใบสั่งซื้อ " + formatTHB(reason.poUnit) + " อยู่ " + formatPercentFromHundredths(reason.varianceHundredths) + " ซึ่งเกินเกณฑ์ตัวอย่าง 1% (" + text(reason.name, lang) + ") จึงต้องตรวจเรื่องราคา"
        : "Invoice unit price " + formatTHB(reason.invoiceUnit) + " differs from the purchase order " + formatTHB(reason.poUnit) + " by " + formatPercentFromHundredths(reason.varianceHundredths) + ", over the 1% sample threshold (" + text(reason.name, lang) + "). Needs check on price.";
    }
    if (reason.code === "qty-vs-po") {
      return th
        ? "จำนวนที่วางบิล " + formatQty(reason.invoiceQty) + " ไม่เท่ากับใบสั่งซื้อ " + formatQty(reason.poQty) + " แต่ไม่ได้เกินจำนวนที่รับ " + formatQty(reason.receivedQty) + " (" + text(reason.name, lang) + ") จึงต้องตรวจ ไม่ถึงขั้นพักเพราะวางบิลไม่เกินของที่รับ"
        : "Quantity billed (" + formatQty(reason.invoiceQty) + ") does not equal the purchase order (" + formatQty(reason.poQty) + ") and does not exceed quantity received (" + formatQty(reason.receivedQty) + ") for " + text(reason.name, lang) + ". Needs check. It is not a Hold, because billed does not exceed received.";
    }
    if (reason.code === "no-po") {
      return th
        ? "ไม่มีใบสั่งซื้อจากระบบจัดซื้อ (ตัวแทน) จึงต้องตรวจ"
        : "The purchase order from the procurement ERP (placeholder) is missing. Needs check.";
    }
    if (reason.code === "no-invoice") {
      return th
        ? "ไม่มีไฟล์ใบแจ้งหนี้ที่ซัพพลายเออร์ส่งผ่านบัญชีจ่าย (ช่องทางตัวแทน) จึงต้องตรวจ"
        : "The invoice PDF supplied by the supplier via AP (placeholder channel) is missing. Needs check.";
    }
    if (reason.code === "no-photo") {
      return th
        ? "มีจำนวนที่รับแล้ว แต่ยังไม่มีรูปส่งของจากคลัง จึงต้องตรวจ รูปนี้เป็นหลักฐานการรับของ ไม่ใช่หลักฐานการจ่ายเงิน"
        : "Received quantity is on file, but the warehouse delivery photo is missing. Needs check. That photo is delivery evidence, not proof of payment.";
    }
    if (reason.code === "arith-sub" || reason.code === "arith-vat" || reason.code === "arith-total") {
      return th
        ? "ยอดในเอกสาร (" + formatTHB(reason.stated) + ") ไม่ตรงกับยอดที่คำนวณได้ (" + formatTHB(reason.expected) + ") ยอดก่อนภาษีคือผลรวมของจำนวนคูณราคาต่อหน่วย ภาษีตัวอย่างคือ 7% ปัดเป็นสตางค์ และยอดรวมคือยอดก่อนภาษีบวกภาษี จึงต้องตรวจ"
        : "A document total (" + formatTHB(reason.stated) + ") does not equal the calculated total (" + formatTHB(reason.expected) + "). Amount before tax is quantity times unit price, sample VAT is 7% rounded to the satang, and the total is those two added. Needs check.";
    }
    return reason.code;
  }

  function matchSummary(result, lang) {
    var th = lang === "th";
    if (result.status !== "match") return "";
    var priceNote = result.lines.every(function (ln) { return ln.diff === 0; })
      ? (th ? "ราคาต่อหน่วยตรงกับใบสั่งซื้อทุกบรรทัด (ส่วนต่าง 0% ซึ่งไม่เกินเกณฑ์ 1%)" : "Every unit price matches the purchase order (0% difference, inside the 1% threshold).")
      : (th ? "ส่วนต่างราคาต่อหน่วยไม่เกินเกณฑ์ตัวอย่าง 1%" : "Every unit-price difference is within the 1% sample threshold.");
    return th
      ? "จำนวนที่วางบิลตรงกับจำนวนที่รับและใบสั่งซื้อ " + priceNote + " ภาษีมูลค่าเพิ่ม 7% ของยอดก่อนภาษีเท่ากับ " + formatTHB(result.invVat) + " เอกสารครบ สถานะคือตรงกัน คนในบัญชีจ่ายยังต้องตรวจเอง เครื่องมือนี้ไม่ได้อนุมัติหรือปล่อยจ่าย"
      : "Quantities billed match quantities received and the purchase order. " + priceNote + " VAT at 7% of the amount before tax is " + formatTHB(result.invVat) + ". The documents are present. The result is Match. A person in AP still has to review it. This tool does not approve or release payment.";
  }

  function statusLabel(status, lang) {
    var labels = {
      match: { en: "Match", th: "ตรงกัน" },
      check: { en: "Needs check", th: "ต้องตรวจ" },
      hold: { en: "Hold", th: "พักไว้" }
    };
    return labels[status][lang === "th" ? "th" : "en"];
  }

  function documentSvg(kind, result, lang) {
    var src = result.source;
    var th = lang === "th";
    var title = kind === "po"
      ? (th ? "ใบสั่งซื้อตัวอย่าง" : "Sample purchase order")
      : kind === "grn"
        ? (th ? "ใบรับของตัวอย่าง" : "Sample goods-received note")
        : (th ? "ใบแจ้งหนี้ตัวอย่าง" : "Sample supplier invoice");
    var docNo = kind === "po" ? src.poNo : kind === "grn" ? src.grnNo : src.invoiceNo;
    var docDate = kind === "po" ? src.poDate : kind === "grn" ? src.receivedDate : src.invoiceDate;
    var sourceLine = kind === "po"
      ? (th ? "ผู้ให้ข้อมูล: จัดซื้อ ผ่านระบบ ERP จัดซื้อ (ตัวแทนระบบ)" : "Supplied by procurement, from the procurement ERP (placeholder system)")
      : kind === "grn"
        ? (th ? "ผู้ให้ข้อมูล: คลัง หลักฐานรับของ/ส่งของ ไม่ใช่หลักฐานการจ่ายเงิน" : "Supplied by warehouse. Goods-received / delivery evidence. Not proof of payment.")
        : (th ? "ผู้ให้ข้อมูล: ซัพพลายเออร์ ส่งผ่านบัญชีจ่าย (ช่องทางตัวแทน ไม่ใช่ที่อยู่จริง)" : "Supplied by the supplier via AP (placeholder channel, not a real address)");
    var rows = result.lines.map(function (ln, i) {
      var qty = kind === "po" ? ln.poQty : kind === "grn" ? (ln.receivedQty === null ? "—" : ln.receivedQty) : ln.invoiceQty;
      var unit = kind === "invoice" ? ln.invoiceUnit : ln.poUnit;
      var amt = kind === "po" ? ln.poAmt : kind === "grn" ? ln.recAmt : ln.invAmt;
      var y = 318 + i * 36;
      return '<text x="36" y="' + y + '" font-size="13">' + xmlEscape(ln.sku + " · " + text(ln.name, lang)) + "</text>" +
        '<text x="430" y="' + y + '" font-size="13" text-anchor="end">' + xmlEscape(qty === "—" ? "—" : formatQty(qty)) + "</text>" +
        '<text x="520" y="' + y + '" font-size="13" text-anchor="end">' + (kind === "grn" ? "—" : xmlEscape(formatTHB(unit))) + "</text>" +
        '<text x="640" y="' + y + '" font-size="13" text-anchor="end">' + (amt === null ? "—" : xmlEscape(formatTHB(amt))) + "</text>";
    }).join("");
    var sub = kind === "po" ? result.poSub : kind === "grn" ? result.recSub : result.invSub;
    var vat = kind === "po" ? result.poVat : kind === "grn" ? result.recVat : result.invVat;
    var total = kind === "po" ? result.poTotal : kind === "grn" ? result.recTotal : result.invTotal;
    var totalsY = 318 + result.lines.length * 36 + 16;
    var afterTotals = totalsY + 108;
    var photo = "";
    if (kind === "grn") {
      var photoY = afterTotals + 8;
      photo = '<rect x="36" y="' + photoY + '" width="604" height="150" rx="12" fill="#f8fafc" stroke="#94a3b8" stroke-dasharray="6 4"/>' +
        '<rect x="70" y="' + (photoY + 36) + '" width="70" height="52" rx="4" fill="#cbd5e1" stroke="#64748b"/>' +
        '<rect x="150" y="' + (photoY + 24) + '" width="70" height="64" rx="4" fill="#e2e8f0" stroke="#64748b"/>' +
        '<rect x="230" y="' + (photoY + 40) + '" width="70" height="48" rx="4" fill="#cbd5e1" stroke="#64748b"/>' +
        '<text x="330" y="' + (photoY + 58) + '" font-size="14" font-weight="700">' + xmlEscape(th ? "รูปส่งของตัวอย่าง" : "Sample delivery photo") + "</text>" +
        '<text x="330" y="' + (photoY + 80) + '" font-size="12" fill="#334155">' + xmlEscape(th ? "ภาพประกอบ ไม่ใช่รูปจริง และไม่ใช่หลักฐานการจ่ายเงิน" : "Illustration only. Not a real photo and not proof of payment.") + "</text>" +
        '<text x="36" y="' + (photoY + 176) + '" font-size="12" fill="#334155">' + xmlEscape(th ? "เครื่องหมายผู้รับตัวอย่าง — ไม่ใช่ลายมือชื่อของบุคคลจริง" : "Sample receiver mark — not a real person's signature.") + "</text>";
    }
    var height = kind === "grn" ? afterTotals + 250 : Math.max(620, afterTotals + 56);
    var totalBlock = sub === null
      ? '<text x="36" y="' + (totalsY + 28) + '" font-size="14">' + xmlEscape(th ? "ไม่มีจำนวนที่รับ" : "Received quantity is not on file") + "</text>"
      : '<text x="360" y="' + (totalsY + 28) + '" font-size="14" text-anchor="end">' + xmlEscape(th ? "ก่อนภาษี" : "Before tax") + "</text>" +
        '<text x="640" y="' + (totalsY + 28) + '" font-size="14" text-anchor="end">' + xmlEscape(formatTHB(sub)) + "</text>" +
        '<text x="360" y="' + (totalsY + 52) + '" font-size="14" text-anchor="end">' + xmlEscape(th ? "ภาษีมูลค่าเพิ่ม 7%" : "VAT 7%") + "</text>" +
        '<text x="640" y="' + (totalsY + 52) + '" font-size="14" text-anchor="end">' + xmlEscape(formatTHB(vat)) + "</text>" +
        '<text x="360" y="' + (totalsY + 80) + '" font-size="16" font-weight="700" text-anchor="end">' + xmlEscape(th ? "รวม" : "Total") + "</text>" +
        '<text x="640" y="' + (totalsY + 80) + '" font-size="16" font-weight="700" text-anchor="end">' + xmlEscape(formatTHB(total)) + "</text>";
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 ' + height + '" width="680" height="' + height + '" role="img">' +
      "<title>" + xmlEscape(title + " " + docNo) + "</title>" +
      '<rect width="680" height="' + height + '" fill="#fff" rx="12"/>' +
      '<rect x="0" y="0" width="680" height="64" fill="#115e59"/>' +
      '<text x="24" y="40" fill="#fff" font-size="20" font-family="system-ui,sans-serif" font-weight="700">' + xmlEscape(title) + "</text>" +
      '<text x="656" y="40" fill="#fef3c7" font-size="14" font-weight="700" text-anchor="end" font-family="system-ui,sans-serif">SAMPLE</text>' +
      '<g font-family="system-ui,sans-serif" fill="#0f172a">' +
      '<text x="36" y="104" font-size="13" fill="#64748b">' + xmlEscape(th ? "เลขที่" : "Number") + "</text>" +
      '<text x="36" y="126" font-size="18" font-weight="700">' + xmlEscape(docNo) + "</text>" +
      '<text x="360" y="104" font-size="13" fill="#64748b">' + xmlEscape(th ? "วันที่" : "Date") + "</text>" +
      '<text x="360" y="126" font-size="18" font-weight="700">' + xmlEscape(docDate) + "</text>" +
      '<text x="36" y="168" font-size="13" fill="#64748b">' + xmlEscape(th ? "ซัพพลายเออร์ (สมมติ)" : "Supplier (fictional)") + "</text>" +
      '<text x="36" y="190" font-size="15">' + xmlEscape(text(src.supplier, lang)) + "</text>" +
      '<text x="36" y="224" font-size="13" fill="#64748b">' + xmlEscape(th ? "ผู้ซื้อ (สมมติ)" : "Buyer (fictional)") + "</text>" +
      '<text x="36" y="246" font-size="15">' + xmlEscape(text(src.buyer, lang)) + "</text>" +
      '<text x="36" y="278" font-size="13" fill="#64748b">' + xmlEscape(sourceLine) + "</text>" +
      '<rect x="24" y="294" width="632" height="28" fill="#f1f5f9"/>' +
      '<text x="36" y="313" font-size="12" font-weight="700" fill="#475569">' + xmlEscape(th ? "รายการ" : "Item") + "</text>" +
      '<text x="430" y="313" font-size="12" font-weight="700" fill="#475569" text-anchor="end">' + xmlEscape(th ? "จำนวน" : "Qty") + "</text>" +
      '<text x="520" y="313" font-size="12" font-weight="700" fill="#475569" text-anchor="end">' + xmlEscape(th ? "ราคา/หน่วย" : "Unit") + "</text>" +
      '<text x="640" y="313" font-size="12" font-weight="700" fill="#475569" text-anchor="end">' + xmlEscape(th ? "จำนวนเงิน" : "Amount") + "</text>" +
      rows + totalBlock + photo +
      '<text x="36" y="' + (height - 28) + '" font-size="12" fill="#64748b">' + xmlEscape(th ? "เอกสารสมมติเท่านั้น ไม่ใช่เอกสารจริง และไม่ได้เชื่อมระบบใด" : "Fictional sample document only. Not a real record and not connected to any system.") + "</text>" +
      "</g></svg>";
  }

  return {
    VAT_RATE: VAT_RATE,
    PRICE_THRESHOLD: PRICE_THRESHOLD,
    CASES: CASES,
    caseById: caseById,
    evaluateCase: evaluateCase,
    reasonText: reasonText,
    matchSummary: matchSummary,
    statusLabel: statusLabel,
    formatTHB: formatTHB,
    formatQty: formatQty,
    formatPercentFromHundredths: formatPercentFromHundredths,
    documentSvg: documentSvg,
    satang: satang,
    vatOn: vatOn,
    lineAmount: lineAmount,
    text: text
  };
});
