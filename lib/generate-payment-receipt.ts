import jsPDF from "jspdf";

export type PaymentReceiptData = {
  receiptNumber: string;

  studentName: string;
  studentEmail: string;
  studentPhone: string;

  programmeName: string;
  instrument: string;

  programmeAmount: number;
  amountPaid: number;
  balance: number;

  paymentMethod: string;
  reference?: string | null;
  paymentDate: string;
};

const RECEIPT_WIDTH = 80;

const MARGIN = 6;

const COLORS = {
  red: "#C51F2A",
  dark: "#353535",
  gray: "#777777",
  lightGray: "#E5E5E5",
  white: "#FFFFFF",
};

function money(amount: number) {
  return `KES ${new Intl.NumberFormat("en-KE", {
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0)}`;
}

function formatPaymentMethod(method: string) {
  switch (method) {
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
      return method
        ? method.charAt(0).toUpperCase() +
            method.slice(1)
        : "—";
  }
}

function formatDate(dateString: string) {
  if (!dateString) {
    return "—";
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

function addText(
  pdf: jsPDF,
  text: string,
  x: number,
  y: number,
  options?: {
    size?: number;
    bold?: boolean;
    color?: string;
    align?: "left" | "center" | "right";
  }
) {
  const size = options?.size ?? 9;

  pdf.setFont(
    "helvetica",
    options?.bold ? "bold" : "normal"
  );

  pdf.setFontSize(size);

  pdf.setTextColor(
    options?.color ?? COLORS.dark
  );

  pdf.text(text, x, y, {
    align: options?.align ?? "left",
  });
}

function drawLine(
  pdf: jsPDF,
  y: number
) {
  pdf.setDrawColor(COLORS.lightGray);

  pdf.setLineWidth(0.25);

  pdf.line(
    MARGIN,
    y,
    RECEIPT_WIDTH - MARGIN,
    y
  );
}

function drawLabelValue(
  pdf: jsPDF,
  label: string,
  value: string,
  y: number
) {
  addText(
    pdf,
    label,
    MARGIN,
    y,
    {
      size: 7.5,
      bold: true,
      color: COLORS.gray,
    }
  );

  addText(
    pdf,
    value,
    MARGIN,
    y + 4,
    {
      size: 9,
      bold: true,
      color: COLORS.dark,
    }
  );

  return y + 10;
}

export function generatePaymentReceipt(
  data: PaymentReceiptData
) {
  /*
   * ---------------------------------------------------------
   * RECEIPT HEIGHT
   * ---------------------------------------------------------
   *
   * We deliberately use a receipt-sized PDF instead of A4.
   *
   * 80mm wide.
   * Height is long enough for the complete receipt.
   */

  const receiptHeight = 145;

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [
      RECEIPT_WIDTH,
      receiptHeight,
    ],
  });

  /*
   * ---------------------------------------------------------
   * BACKGROUND
   * ---------------------------------------------------------
   */

  pdf.setFillColor(COLORS.white);

  pdf.rect(
    0,
    0,
    RECEIPT_WIDTH,
    receiptHeight,
    "F"
  );

  let y = 9;

  /*
   * ---------------------------------------------------------
   * BRAND HEADER
   * ---------------------------------------------------------
   */

  addText(
    pdf,
    "SAUTI TAMU",
    RECEIPT_WIDTH / 2,
    y,
    {
      size: 16,
      bold: true,
      color: COLORS.red,
      align: "center",
    }
  );

  y += 5;

  addText(
    pdf,
    "PIANO CENTER",
    RECEIPT_WIDTH / 2,
    y,
    {
      size: 7,
      bold: true,
      color: COLORS.gray,
      align: "center",
    }
  );

  y += 9;

  /*
   * ---------------------------------------------------------
   * RECEIPT TITLE
   * ---------------------------------------------------------
   */

  addText(
    pdf,
    "PAYMENT RECEIPT",
    RECEIPT_WIDTH / 2,
    y,
    {
      size: 11,
      bold: true,
      color: COLORS.dark,
      align: "center",
    }
  );

  y += 5;

  addText(
    pdf,
    `Receipt No. ${data.receiptNumber}`,
    RECEIPT_WIDTH / 2,
    y,
    {
      size: 7,
      color: COLORS.gray,
      align: "center",
    }
  );

  y += 7;

  drawLine(pdf, y);

  y += 7;

  /*
   * ---------------------------------------------------------
   * RECEIVED FROM
   * ---------------------------------------------------------
   */

  addText(
    pdf,
    "RECEIVED FROM",
    MARGIN,
    y,
    {
      size: 7,
      bold: true,
      color: COLORS.red,
    }
  );

  y += 5;

  addText(
    pdf,
    data.studentName || "—",
    MARGIN,
    y,
    {
      size: 10,
      bold: true,
      color: COLORS.dark,
    }
  );

  y += 5;

  if (data.studentEmail) {
    addText(
      pdf,
      data.studentEmail,
      MARGIN,
      y,
      {
        size: 7.5,
        color: COLORS.gray,
      }
    );

    y += 4;
  }

  if (data.studentPhone) {
    addText(
      pdf,
      data.studentPhone,
      MARGIN,
      y,
      {
        size: 7.5,
        color: COLORS.gray,
      }
    );

    y += 4;
  }

  y += 3;

  drawLine(pdf, y);

  y += 7;

  /*
   * ---------------------------------------------------------
   * PROGRAMME
   * ---------------------------------------------------------
   */

  addText(
    pdf,
    "PROGRAMME",
    MARGIN,
    y,
    {
      size: 7,
      bold: true,
      color: COLORS.red,
    }
  );

  y += 5;

  addText(
    pdf,
    data.programmeName || "Training Programme",
    MARGIN,
    y,
    {
      size: 9,
      bold: true,
      color: COLORS.dark,
    }
  );

  y += 5;

  addText(
    pdf,
    data.instrument
      ? `${data.instrument} Training`
      : "Music Training",
    MARGIN,
    y,
    {
      size: 7.5,
      color: COLORS.gray,
    }
  );

  y += 7;

  drawLine(pdf, y);

  y += 7;

  /*
   * ---------------------------------------------------------
   * PAYMENT BREAKDOWN
   * ---------------------------------------------------------
   */

  addText(
    pdf,
    "PAYMENT DETAILS",
    MARGIN,
    y,
    {
      size: 7,
      bold: true,
      color: COLORS.red,
    }
  );

  y += 6;

  /*
   * Programme amount
   */

  addText(
    pdf,
    "Programme amount",
    MARGIN,
    y,
    {
      size: 8,
      color: COLORS.gray,
    }
  );

  addText(
    pdf,
    money(data.programmeAmount),
    RECEIPT_WIDTH - MARGIN,
    y,
    {
      size: 8,
      bold: true,
      color: COLORS.dark,
      align: "right",
    }
  );

  y += 6;

  /*
   * Amount paid
   */

  addText(
    pdf,
    "Amount paid",
    MARGIN,
    y,
    {
      size: 8,
      color: COLORS.gray,
    }
  );

  addText(
    pdf,
    money(data.amountPaid),
    RECEIPT_WIDTH - MARGIN,
    y,
    {
      size: 9,
      bold: true,
      color: COLORS.red,
      align: "right",
    }
  );

  y += 6;

  /*
   * Balance
   */

  pdf.setFillColor("#FAF3F3");

  pdf.roundedRect(
    MARGIN,
    y - 3,
    RECEIPT_WIDTH - MARGIN * 2,
    12,
    2,
    2,
    "F"
  );

  addText(
    pdf,
    "BALANCE",
    MARGIN + 3,
    y + 4,
    {
      size: 8,
      bold: true,
      color: COLORS.dark,
    }
  );

  addText(
    pdf,
    money(data.balance),
    RECEIPT_WIDTH - MARGIN - 3,
    y + 4,
    {
      size: 10,
      bold: true,
      color:
        data.balance > 0
          ? COLORS.red
          : "#5F8F69",
      align: "right",
    }
  );

  y += 17;

  drawLine(pdf, y);

  y += 7;

  /*
   * ---------------------------------------------------------
   * PAYMENT INFORMATION
   * ---------------------------------------------------------
   */

  addText(
    pdf,
    "PAYMENT INFORMATION",
    MARGIN,
    y,
    {
      size: 7,
      bold: true,
      color: COLORS.red,
    }
  );

  y += 6;

  y = drawLabelValue(
    pdf,
    "Payment method",
    formatPaymentMethod(
      data.paymentMethod
    ),
    y
  );

  if (data.reference) {
    y = drawLabelValue(
      pdf,
      "Reference",
      data.reference,
      y
    );
  }

  y = drawLabelValue(
    pdf,
    "Payment date",
    formatDate(data.paymentDate),
    y
  );

  /*
   * ---------------------------------------------------------
   * FOOTER
   * ---------------------------------------------------------
   */

  y += 2;

  drawLine(pdf, y);

  y += 8;

  addText(
    pdf,
    "Thank you for choosing",
    RECEIPT_WIDTH / 2,
    y,
    {
      size: 7.5,
      color: COLORS.gray,
      align: "center",
    }
  );

  y += 4;

  addText(
    pdf,
    "Sauti Tamu Piano Center",
    RECEIPT_WIDTH / 2,
    y,
    {
      size: 8.5,
      bold: true,
      color: COLORS.dark,
      align: "center",
    }
  );

  y += 5;

  addText(
    pdf,
    "Junction Trade Center · Nairobi CBD",
    RECEIPT_WIDTH / 2,
    y,
    {
      size: 6.5,
      color: COLORS.gray,
      align: "center",
    }
  );

  y += 4;

  addText(
    pdf,
    "Piano & Acoustic Guitar Training",
    RECEIPT_WIDTH / 2,
    y,
    {
      size: 6.5,
      color: COLORS.gray,
      align: "center",
    }
  );

  /*
   * ---------------------------------------------------------
   * DOWNLOAD
   * ---------------------------------------------------------
   */

  const safeName =
    data.studentName
      .trim()
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() ||
    "student";

  const safeReceiptNumber =
    data.receiptNumber
      .replace(/[^a-zA-Z0-9-]/g, "")
      .toLowerCase();

  pdf.save(
    `sauti-tamu-receipt-${safeName}-${safeReceiptNumber}.pdf`
  );
}