import jsPDF from "jspdf";

/*
 * =========================================================
 * SAUTI TAMU — PAYMENT RECEIPT GENERATOR
 * =========================================================
 *
 * Receipt format:
 * - 80mm thermal/receipt-style width
 * - Dynamic height based on number of payments
 * - Progressive payment history
 * - Programme amount
 * - Total paid
 * - Current balance
 * - Current payment details
 *
 * The generator can:
 * 1. Generate a jsPDF document
 * 2. Download the receipt
 * 3. Create a Blob for viewing/sharing
 */

/* =========================================================
   TYPES
   ========================================================= */

export type PaymentReceiptHistoryItem = {
  id?: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  reference?: string | null;
  isCurrent?: boolean;
};

export type PaymentReceiptData = {
  receiptNumber: string;

  studentName: string;
  studentEmail: string;
  studentPhone: string;

  programmeName: string;
  instrument: string;

  programmeAmount: number;

  /*
   * Balance before the current payment.
   */
  previousBalance: number;

  /*
   * Current payment.
   */
  amountPaid: number;

  /*
   * Balance after the current payment.
   *
   * Both names are supported because the student page
   * may use either one.
   */
  balanceAfterPayment: number;
  balance?: number;

  paymentMethod: string;
  paymentDate: string;
  reference?: string | null;

  /*
   * Complete payment history.
   *
   * Every receipt generated after a payment will contain
   * all payments made up to that point.
   */
  payments?: PaymentReceiptHistoryItem[];
};

/* =========================================================
   BRAND
   ========================================================= */

const RED = [197, 31, 42] as const;
const RED_DARK = [168, 23, 34] as const;

const DARK = [53, 53, 53] as const;
const GRAY = [120, 120, 120] as const;
const LIGHT_GRAY = [245, 245, 245] as const;
const LIGHT_RED = [245, 232, 232] as const;
const WHITE = [255, 255, 255] as const;

const BORDER = [220, 205, 205] as const;

/* =========================================================
   HELPERS
   ========================================================= */

function money(amount: number) {
  return `KES ${new Intl.NumberFormat("en-KE", {
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0)}`;
}

function normalisePaymentMethod(method: string) {
  if (!method) {
    return "Payment";
  }

  switch (method.toLowerCase()) {
    case "mpesa":
      return "M-Pesa";

    case "cash":
      return "Cash";

    case "bank":
      return "Bank";

    case "card":
      return "Card";

    case "other":
      return "Other";

    default:
      return (
        method.charAt(0).toUpperCase() +
        method.slice(1)
      );
  }
}

function formatDate(dateString: string) {
  if (!dateString) {
    return "";
  }

  const date = new Date(
    `${dateString}T00:00:00+03:00`
  );

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return new Intl.DateTimeFormat("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Nairobi",
  }).format(date);
}

function drawLine(
  doc: jsPDF,
  y: number,
  x1 = 8,
  x2 = 72
) {
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.25);
  doc.line(x1, y, x2, y);
}

function text(
  doc: jsPDF,
  value: string,
  x: number,
  y: number,
  size: number,
  color = DARK,
  weight: "normal" | "bold" = "normal",
  align: "left" | "center" | "right" = "left"
) {
  doc.setFont("helvetica", weight);
  doc.setFontSize(size);
  doc.setTextColor(...color);

  doc.text(value, x, y, {
    align,
  });
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
  text(
    doc,
    value,
    x,
    y,
    size,
    color,
    weight,
    "right"
  );
}

function sectionLabel(
  doc: jsPDF,
  label: string,
  y: number
) {
  text(
    doc,
    label,
    8,
    y,
    7,
    RED,
    "bold"
  );

  return y + 5;
}

/* =========================================================
   CALCULATE RECEIPT HEIGHT
   ========================================================= */

function calculateReceiptHeight(
  data: PaymentReceiptData
) {
  const payments =
    data.payments ?? [];

  /*
   * Base height for:
   * header
   * student
   * programme
   * summary
   * payment details
   * footer
   */
  let height = 184;

  /*
   * Each payment row requires approximately 11mm.
   */
  height += payments.length * 11;

  /*
   * Give additional space for larger histories.
   */
  if (payments.length > 5) {
    height += 8;
  }

  /*
   * Minimum and maximum safety bounds.
   */
  return Math.max(
    184,
    Math.min(height, 500)
  );
}

/* =========================================================
   NORMALISE PAYMENT HISTORY
   * ========================================================= */

function getPaymentHistory(
  data: PaymentReceiptData
): PaymentReceiptHistoryItem[] {
  const history = [
    ...(data.payments ?? []),
  ];

  /*
   * If the caller hasn't supplied payment history,
   * construct a one-payment history from the current
   * payment so the receipt still works.
   */
  if (history.length === 0) {
    history.push({
      amount: data.amountPaid,
      paymentDate: data.paymentDate,
      paymentMethod:
        data.paymentMethod,
      reference: data.reference,
      isCurrent: true,
    });
  }

  return history;
}

/* =========================================================
   GENERATE PDF DOCUMENT
   ========================================================= */

export function generatePaymentReceipt(
  data: PaymentReceiptData
) {
  const payments =
    getPaymentHistory(data);

  const receiptHeight =
    calculateReceiptHeight({
      ...data,
      payments,
    });

  /*
   * 80mm receipt width.
   *
   * Dynamic height prevents the bottom of the receipt
   * from being cut off when more payment rows are added.
   */
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [80, receiptHeight],
    compress: true,
  });

  doc.setProperties({
    title:
      `Sauti Tamu Payment Receipt ${data.receiptNumber}`,
    subject: "Payment Receipt",
    author:
      "Sauti Tamu Piano Center",
    creator: "Sauti Tamu",
  });

  let y = 9;

  /* =======================================================
     HEADER
     ======================================================= */

  text(
    doc,
    "Sauti Tamu",
    40,
    y,
    15,
    RED,
    "bold",
    "center"
  );

  y += 5;

  text(
    doc,
    "Piano Center",
    40,
    y,
    7,
    DARK,
    "bold",
    "center"
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

  text(
    doc,
    "Payment Receipt",
    40,
    y + 4.7,
    7,
    WHITE,
    "bold",
    "center"
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

  y += 6;

  drawLine(doc, y);

  y += 7;

  /* =======================================================
     RECEIVED FROM
     ======================================================= */

  y = sectionLabel(
    doc,
    "Received From",
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

  y += 7;

  drawLine(doc, y);

  y += 7;

  /* =======================================================
     PROGRAMME
     ======================================================= */

  y = sectionLabel(
    doc,
    "Programme",
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

  /* =======================================================
     PROGRAMME AMOUNT
     ======================================================= */

  doc.setFillColor(...LIGHT_RED);

  doc.roundedRect(
    8,
    y - 1,
    64,
    10,
    1.5,
    1.5,
    "F"
  );

  text(
    doc,
    "Programme Amount",
    11,
    y + 5.2,
    7,
    GRAY
  );

  rightText(
    doc,
    money(data.programmeAmount),
    69,
    y + 5.2,
    8,
    DARK,
    "bold"
  );

  y += 15;

  /* =======================================================
     PAYMENT PROGRESS
     ======================================================= */

  y = sectionLabel(
    doc,
    "Payment Progress",
    y
  );

  /*
   * Column headers
   */
  text(
    doc,
    "Payment",
    8,
    y,
    6.5,
    GRAY,
    "bold"
  );

  text(
    doc,
    "Date",
    35,
    y,
    6.5,
    GRAY,
    "bold"
  );

  rightText(
    doc,
    "Amount",
    72,
    y,
    6.5,
    GRAY,
    "bold"
  );

  y += 4;

  drawLine(doc, y);

  y += 6;

  /*
   * Progressive payments.
   */
  payments.forEach(
    (payment, index) => {
      const paymentNumber =
        index + 1;

      /*
       * Highlight the current/latest payment.
       */
      if (payment.isCurrent) {
        doc.setFillColor(
          ...LIGHT_RED
        );

        doc.roundedRect(
          7,
          y - 4,
          66,
          9,
          1.2,
          1.2,
          "F"
        );
      }

      text(
        doc,
        `${paymentNumber}${getOrdinalSuffix(
          paymentNumber
        )} Payment`,
        8,
        y + 1,
        6.8,
        payment.isCurrent
          ? RED
          : DARK,
        "bold"
      );

      text(
        doc,
        formatDate(
          payment.paymentDate
        ),
        35,
        y + 1,
        6.2,
        GRAY
      );

      rightText(
        doc,
        money(payment.amount),
        72,
        y + 1,
        7,
        payment.isCurrent
          ? RED
          : DARK,
        "bold"
      );

      y += 10;
    }
  );

  drawLine(doc, y);

  y += 7;

  /* =======================================================
     TOTAL PAID
     ======================================================= */

  const totalPaid =
    payments.reduce(
      (total, payment) =>
        total +
        Number(payment.amount || 0),
      0
    );

  text(
    doc,
    "Total Paid",
    8,
    y,
    8,
    DARK,
    "bold"
  );

  rightText(
    doc,
    money(totalPaid),
    72,
    y,
    8,
    DARK,
    "bold"
  );

  y += 8;

  /* =======================================================
     BALANCE
     ======================================================= */

  /*
   * Prefer the explicit balance supplied by the caller.
   * Fall back to balanceAfterPayment.
   */
  const currentBalance =
    Number(
      data.balance ??
        data.balanceAfterPayment ??
        Math.max(
          Number(
            data.programmeAmount
          ) - totalPaid,
          0
        )
    );

  /*
   * This is the important progressive calculation:
   *
   * Programme amount
   *       -
   * All payments to date
   *       =
   * Current balance
   */
  const calculatedBalance =
    Math.max(
      Number(
        data.programmeAmount
      ) - totalPaid,
      0
    );

  const finalBalance =
    Number.isFinite(currentBalance)
      ? currentBalance
      : calculatedBalance;

  doc.setFillColor(...RED);

  doc.roundedRect(
    8,
    y - 2,
    64,
    14,
    1.8,
    1.8,
    "F"
  );

  text(
    doc,
    "Current Balance",
    11,
    y + 6,
    7.5,
    WHITE,
    "bold"
  );

  rightText(
    doc,
    money(finalBalance),
    69,
    y + 6,
    9,
    WHITE,
    "bold"
  );

  y += 20;

  /* =======================================================
     CURRENT PAYMENT DETAILS
     ======================================================= */

  drawLine(doc, y);

  y += 7;

  y = sectionLabel(
    doc,
    "Latest Payment",
    y
  );

  /*
   * Payment amount
   */
  text(
    doc,
    "Amount Paid",
    8,
    y,
    7,
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

  y += 6;

  /*
   * Previous balance
   */
  text(
    doc,
    "Previous Balance",
    8,
    y,
    7,
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

  /*
   * Payment method
   */
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
    normalisePaymentMethod(
      data.paymentMethod
    ),
    72,
    y,
    7.5,
    DARK,
    "bold"
  );

  y += 6;

  /*
   * Payment date
   */
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
    formatDate(
      data.paymentDate
    ),
    72,
    y,
    7.5,
    DARK,
    "bold"
  );

  y += 6;

  /*
   * Reference
   */
  if (data.reference) {
    text(
      doc,
      "Reference",
      8,
      y,
      7,
      GRAY
    );

    /*
     * Long M-Pesa references can become too wide.
     */
    const reference =
      String(data.reference);

    rightText(
      doc,
      reference.length > 20
        ? `${reference.slice(
            0,
            20
          )}…`
        : reference,
      72,
      y,
      6.8,
      DARK,
      "bold"
    );

    y += 6;
  }

  y += 3;

  drawLine(doc, y);

  y += 8;

  /* =======================================================
     PAYMENT CALCULATION
     ======================================================= */

  text(
    doc,
    "Payment Calculation",
    8,
    y,
    7,
    RED,
    "bold"
  );

  y += 6;

  text(
    doc,
    "Programme Amount",
    8,
    y,
    7,
    GRAY
  );

  rightText(
    doc,
    money(data.programmeAmount),
    72,
    y,
    7,
    DARK,
    "bold"
  );

  y += 5;

  text(
    doc,
    "Less: Total Payments",
    8,
    y,
    7,
    GRAY
  );

  rightText(
    doc,
    `- ${money(totalPaid)}`,
    72,
    y,
    7,
    DARK,
    "bold"
  );

  y += 7;

  doc.setFillColor(
    ...LIGHT_GRAY
  );

  doc.roundedRect(
    8,
    y - 3,
    64,
    10,
    1.5,
    1.5,
    "F"
  );

  text(
    doc,
    "Balance",
    11,
    y + 3.5,
    7.5,
    DARK,
    "bold"
  );

  rightText(
    doc,
    money(finalBalance),
    69,
    y + 3.5,
    8,
    RED,
    "bold"
  );

  y += 15;

  /* =======================================================
     FOOTER
     ======================================================= */

  drawLine(doc, y);

  y += 8;

  text(
    doc,
    "Thank you for choosing",
    40,
    y,
    7,
    GRAY,
    "normal",
    "center"
  );

  y += 4.5;

  text(
    doc,
    "Sauti Tamu Piano Center",
    40,
    y,
    8.5,
    DARK,
    "bold",
    "center"
  );

  y += 6;

  text(
    doc,
    "Junction Trade Center · Nairobi CBD",
    40,
    y,
    6.5,
    GRAY,
    "normal",
    "center"
  );

  y += 4;

  text(
    doc,
    "Piano & Acoustic Guitar Training",
    40,
    y,
    6.5,
    GRAY,
    "normal",
    "center"
  );

  return doc;
}

/* =========================================================
   ORDINAL SUFFIX
   ========================================================= */

function getOrdinalSuffix(
  number: number
) {
  const mod100 = number % 100;

  if (
    mod100 >= 11 &&
    mod100 <= 13
  ) {
    return "th";
  }

  switch (number % 10) {
    case 1:
      return "st";

    case 2:
      return "nd";

    case 3:
      return "rd";

    default:
      return "th";
  }
}

/* =========================================================
   DOWNLOAD RECEIPT
   ========================================================= */

export function downloadPaymentReceipt(
  data: PaymentReceiptData
) {
  const doc =
    generatePaymentReceipt(
      data
    );

  doc.save(
    `Sauti-Tamu-Receipt-${data.receiptNumber}.pdf`
  );
}

/* =========================================================
   GET RECEIPT BLOB
   =========================================================
 *
 * Used by:
 *
 * - View Receipt
 * - Email Receipt
 * - Share Receipt
 */

export function getPaymentReceiptBlob(
  data: PaymentReceiptData
) {
  const doc =
    generatePaymentReceipt(
      data
    );

  return doc.output("blob");
}

/* =========================================================
   GET RECEIPT BLOB URL
   =========================================================
 *
 * Useful for opening the receipt in a browser tab.
 */

export function getPaymentReceiptBlobUrl(
  data: PaymentReceiptData
) {
  const blob =
    getPaymentReceiptBlob(
      data
    );

  return URL.createObjectURL(
    blob
  );
}

/* =========================================================
   DEFAULT EXPORT
   ========================================================= */

export default generatePaymentReceipt;