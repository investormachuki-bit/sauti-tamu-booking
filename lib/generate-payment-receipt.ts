import jsPDF from "jspdf";

export type PaymentReceiptData = {
  receiptNumber: string;
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  programmeName: string;
  instrument: string;
  programmeAmount: number;
  previousBalance: number;
  amountPaid: number;
  balanceAfterPayment: number;
  paymentMethod: string;
  paymentDate: string;
  reference?: string | null;
};

const RED = [197, 31, 42] as const;
const DARK = [53, 53, 53] as const;
const GRAY = [120, 120, 120] as const;
const LIGHT = [245, 232, 232] as const;
const BORDER = [220, 205, 205] as const;

function money(amount: number) {
  return `KES ${new Intl.NumberFormat("en-KE", {
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0)}`;
}

function drawLine(doc: jsPDF, y: number) {
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.25);
  doc.line(8, y, 72, y);
}

function text(
  doc: jsPDF,
  value: string,
  x: number,
  y: number,
  size: number,
  color = DARK,
  weight: "normal" | "bold" = "normal"
) {
  doc.setFont("helvetica", weight);
  doc.setFontSize(size);
  doc.setTextColor(...color);
  doc.text(value, x, y);
}

function rightText(
  doc: jsPDF,
  value: string,
  x: number,
  y: number,
  size: number,
  color = DARK,
  weight: "normal" | "bold" = "normal"
) {
  doc.setFont("helvetica", weight);
  doc.setFontSize(size);
  doc.setTextColor(...color);
  doc.text(value, x, y, { align: "right" });
}

function sectionLabel(
  doc: jsPDF,
  label: string,
  y: number
) {
  text(doc, label, 8, y, 7, RED, "bold");
  return y + 5;
}

export function generatePaymentReceipt(
  data: PaymentReceiptData
) {
  /*
   * 80mm receipt width.
   *
   * 190mm height gives the receipt enough vertical space
   * while keeping it as a proper receipt rather than A4.
   */
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [80, 190],
    compress: true,
  });

  doc.setProperties({
    title: `Sauti Tamu Payment Receipt ${data.receiptNumber}`,
    subject: "Payment Receipt",
    author: "Sauti Tamu Piano Center",
    creator: "Sauti Tamu",
  });

  let y = 10;

  // =====================================================
  // HEADER
  // =====================================================

  text(
    doc,
    "SAUTI TAMU",
    40,
    y,
    15,
    RED,
    "bold"
  );

  y += 5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...DARK);

  doc.text(
    "PIANO CENTER",
    40,
    y,
    { align: "center" }
  );

  y += 7;

  doc.setFillColor(...RED);

  doc.roundedRect(
    20,
    y,
    40,
    7,
    1.5,
    1.5,
    "F"
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);

  doc.text(
    "PAYMENT RECEIPT",
    40,
    y + 4.7,
    { align: "center" }
  );

  y += 12;

  rightText(
    doc,
    `Receipt No. ${data.receiptNumber}`,
    72,
    y,
    6.5,
    GRAY
  );

  y += 7;

  drawLine(doc, y);

  y += 7;

  // =====================================================
  // RECEIVED FROM
  // =====================================================

  y = sectionLabel(
    doc,
    "RECEIVED FROM",
    y
  );

  text(
    doc,
    data.studentName,
    8,
    y,
    10,
    DARK,
    "bold"
  );

  y += 5;

  text(
    doc,
    data.studentEmail,
    8,
    y,
    7,
    GRAY
  );

  y += 4;

  text(
    doc,
    data.studentPhone,
    8,
    y,
    7,
    GRAY
  );

  y += 8;

  drawLine(doc, y);

  y += 7;

  // =====================================================
  // PROGRAMME
  // =====================================================

  y = sectionLabel(
    doc,
    "PROGRAMME",
    y
  );

  text(
    doc,
    data.programmeName,
    8,
    y,
    8,
    DARK,
    "bold"
  );

  y += 5;

  text(
    doc,
    `${data.instrument} Training`,
    8,
    y,
    7,
    GRAY
  );

  y += 7;

  // =====================================================
  // PROGRAMME AMOUNT
  // =====================================================

  doc.setFillColor(...LIGHT);

  doc.roundedRect(
    8,
    y - 1,
    64,
    9,
    1.5,
    1.5,
    "F"
  );

  text(
    doc,
    "Programme Amount",
    11,
    y + 4.8,
    7,
    GRAY
  );

  rightText(
    doc,
    money(data.programmeAmount),
    69,
    y + 4.8,
    8,
    DARK,
    "bold"
  );

  y += 14;

  drawLine(doc, y);

  y += 7;

  // =====================================================
  // PAYMENT SUMMARY
  // =====================================================

  y = sectionLabel(
    doc,
    "PAYMENT SUMMARY",
    y
  );

  // Previous balance
  text(
    doc,
    "Previous Balance",
    8,
    y,
    7.5,
    GRAY
  );

  rightText(
    doc,
    money(data.previousBalance),
    72,
    y,
    7.5,
    DARK,
    "bold"
  );

  y += 6;

  // Current payment
  text(
    doc,
    "Amount Paid Today",
    8,
    y,
    7.5,
    GRAY
  );

  rightText(
    doc,
    money(data.amountPaid),
    72,
    y,
    7.5,
    DARK,
    "bold"
  );

  y += 8;

  // =====================================================
  // BALANCE AFTER PAYMENT
  // =====================================================

  doc.setFillColor(...RED);

  doc.roundedRect(
    8,
    y - 2,
    64,
    13,
    1.8,
    1.8,
    "F"
  );

  text(
    doc,
    "BALANCE AFTER PAYMENT",
    11,
    y + 5.5,
    7,
    [255, 255, 255],
    "bold"
  );

  rightText(
    doc,
    money(data.balanceAfterPayment),
    69,
    y + 5.5,
    9,
    [255, 255, 255],
    "bold"
  );

  y += 19;

  drawLine(doc, y);

  y += 7;

  // =====================================================
  // PAYMENT INFORMATION
  // =====================================================

  y = sectionLabel(
    doc,
    "PAYMENT INFORMATION",
    y
  );

  text(
    doc,
    "Payment Method",
    8,
    y,
    7,
    GRAY
  );

  rightText(
    doc,
    data.paymentMethod.toUpperCase(),
    72,
    y,
    7.5,
    DARK,
    "bold"
  );

  y += 6;

  text(
    doc,
    "Payment Date",
    8,
    y,
    7,
    GRAY
  );

  rightText(
    doc,
    data.paymentDate,
    72,
    y,
    7.5,
    DARK,
    "bold"
  );

  y += 6;

  if (data.reference) {
    text(
      doc,
      "Reference",
      8,
      y,
      7,
      GRAY
    );

    rightText(
      doc,
      data.reference,
      72,
      y,
      7,
      DARK,
      "bold"
    );

    y += 6;
  }

  y += 3;

  drawLine(doc, y);

  y += 8;

  // =====================================================
  // FOOTER
  // =====================================================

  text(
    doc,
    "Thank you for choosing",
    40,
    y,
    7,
    GRAY
  );

  y += 4.5;

  text(
    doc,
    "Sauti Tamu Piano Center",
    40,
    y,
    8.5,
    DARK,
    "bold"
  );

  y += 6;

  text(
    doc,
    "Junction Trade Center · Nairobi CBD",
    40,
    y,
    6.5,
    GRAY
  );

  y += 4;

  text(
    doc,
    "Piano & Acoustic Guitar Training",
    40,
    y,
    6.5,
    GRAY
  );

  // =====================================================
  // DOWNLOAD
  // =====================================================

  doc.save(
    `Sauti-Tamu-Receipt-${data.receiptNumber}.pdf`
  );
}

export default generatePaymentReceipt;