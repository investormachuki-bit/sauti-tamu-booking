import jsPDF from "jspdf";

export type PaymentReceiptItem = {
  label: string;
  amount: number;
  date?: string;
  method?: string;
  reference?: string | null;
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
   * Every payment made up to and including
   * the payment represented by this receipt.
   *
   * This allows the receipt to show:
   *
   * Programme amount
   * 1st payment
   * 2nd payment
   * 3rd payment
   * Balance
   */
  paymentHistory?: PaymentReceiptItem[];

  /*
   * The balance before the current payment.
   */
  previousBalance: number;

  /*
   * The payment being receipted now.
   */
  amountPaid: number;

  /*
   * Balance remaining after the current payment.
   */
  balanceAfterPayment: number;

  paymentMethod: string;
  paymentDate: string;

  reference?: string | null;
};

const RED: readonly [number, number, number] = [
  197,
  31,
  42,
];

const RED_DARK: readonly [number, number, number] = [
  168,
  23,
  34,
];

const DARK: readonly [number, number, number] = [
  53,
  53,
  53,
];

const GRAY: readonly [number, number, number] = [
  105,
  105,
  105,
];

const LIGHT_GRAY: readonly [number, number, number] = [
  225,
  225,
  225,
];

const LIGHT: readonly [number, number, number] = [
  245,
  232,
  232,
];

const WHITE: readonly [number, number, number] = [
  255,
  255,
  255,
];

const GREEN: readonly [number, number, number] = [
  45,
  125,
  70,
];

const PALE_GREEN: readonly [number, number, number] = [
  235,
  248,
  238,
];

function money(amount: number) {
  return `KES ${new Intl.NumberFormat("en-KE", {
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0)}`;
}

function safeText(value: unknown) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value);
}

function drawLine(
  doc: jsPDF,
  y: number,
  color: readonly [number, number, number] = LIGHT_GRAY,
  lineWidth = 0.25
) {
  doc.setDrawColor(
    color[0],
    color[1],
    color[2]
  );

  doc.setLineWidth(lineWidth);

  doc.line(
    8,
    y,
    72,
    y
  );
}

function setText(
  doc: jsPDF,
  value: string,
  x: number,
  y: number,
  size: number,
  color: readonly [number, number, number] = DARK,
  weight: "normal" | "bold" = "normal",
  align: "left" | "center" | "right" = "left"
) {
  doc.setFont(
    "helvetica",
    weight
  );

  doc.setFontSize(size);

  doc.setTextColor(
    color[0],
    color[1],
    color[2]
  );

  doc.text(
    safeText(value),
    x,
    y,
    {
      align,
    }
  );
}

function sectionLabel(
  doc: jsPDF,
  label: string,
  y: number
) {
  setText(
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

function drawPaymentRow(
  doc: jsPDF,
  item: PaymentReceiptItem,
  index: number,
  y: number,
  highlight = false
) {
  const rowHeight = 8;

  if (highlight) {
    doc.setFillColor(
      PALE_GREEN[0],
      PALE_GREEN[1],
      PALE_GREEN[2]
    );

    doc.roundedRect(
      8,
      y - 4.5,
      64,
      rowHeight,
      1.2,
      1.2,
      "F"
    );
  }

  const label =
    item.label ||
    `Payment ${index + 1}`;

  setText(
    doc,
    label,
    10,
    y,
    7.2,
    highlight ? GREEN : GRAY,
    highlight ? "bold" : "normal"
  );

  setText(
    doc,
    money(item.amount),
    70,
    y,
    7.4,
    highlight ? GREEN : DARK,
    "bold",
    "right"
  );

  return y + rowHeight;
}

export function generatePaymentReceipt(
  data: PaymentReceiptData
) {
  /*
   * =========================================================
   * RECEIPT SIZE
   * =========================================================
   *
   * 80mm wide receipt.
   *
   * We deliberately use a longer receipt height so that
   * multiple payments can be displayed without being cut off.
   *
   * This is NOT A4.
   */

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [80, 220],
    compress: true,
  });

  doc.setProperties({
    title: `Sauti Tamu Payment Receipt ${data.receiptNumber}`,
    subject: "Payment Receipt",
    author: "Sauti Tamu Piano Center",
    creator: "Sauti Tamu",
  });

  let y = 9;

  /*
   * =========================================================
   * HEADER
   * =========================================================
   */

  setText(
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

  setText(
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

  /*
   * Receipt title.
   *
   * Natural capitalization rather than all caps.
   */

  doc.setFillColor(
    RED[0],
    RED[1],
    RED[2]
  );

  doc.roundedRect(
    20,
    y,
    40,
    7,
    1.5,
    1.5,
    "F"
  );

  setText(
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

  setText(
    doc,
    `Receipt No. ${data.receiptNumber}`,
    72,
    y,
    6.5,
    GRAY,
    "normal",
    "right"
  );

  y += 6;

  drawLine(doc, y);

  y += 7;

  /*
   * =========================================================
   * RECEIVED FROM
   * =========================================================
   */

  y = sectionLabel(
    doc,
    "Received from",
    y
  );

  setText(
    doc,
    data.studentName,
    8,
    y,
    9.5,
    DARK,
    "bold"
  );

  y += 4.5;

  /*
   * Email may be long, so shrink it slightly.
   */

  const email =
    safeText(data.studentEmail);

  setText(
    doc,
    email,
    8,
    y,
    6.5,
    GRAY
  );

  y += 4;

  setText(
    doc,
    safeText(data.studentPhone),
    8,
    y,
    6.5,
    GRAY
  );

  y += 7;

  drawLine(doc, y);

  y += 7;

  /*
   * =========================================================
   * PROGRAMME
   * =========================================================
   */

  y = sectionLabel(
    doc,
    "Programme",
    y
  );

  setText(
    doc,
    data.programmeName,
    8,
    y,
    8,
    DARK,
    "bold"
  );

  y += 5;

  setText(
    doc,
    `${data.instrument} training`,
    8,
    y,
    7,
    GRAY
  );

  y += 7;

  /*
   * =========================================================
   * PROGRAMME AMOUNT
   * =========================================================
   */

  doc.setFillColor(
    LIGHT[0],
    LIGHT[1],
    LIGHT[2]
  );

  doc.roundedRect(
    8,
    y - 1,
    64,
    9,
    1.5,
    1.5,
    "F"
  );

  setText(
    doc,
    "Programme Amount",
    11,
    y + 4.8,
    7,
    GRAY
  );

  setText(
    doc,
    money(data.programmeAmount),
    69,
    y + 4.8,
    8,
    DARK,
    "bold",
    "right"
  );

  y += 14;

  drawLine(doc, y);

  y += 7;

  /*
   * =========================================================
   * PAYMENT PROGRESS
   * =========================================================
   */

  y = sectionLabel(
    doc,
    "Payment Progress",
    y
  );

  /*
   * If payment history is supplied, show ALL payments.
   *
   * Example:
   *
   * 1st Payment             KES 5,000
   * 2nd Payment             KES 5,000
   * 3rd Payment             KES 3,000
   */

  const history =
    data.paymentHistory ??
    [];

  if (history.length > 0) {
    history.forEach(
      (payment, index) => {
        const isCurrent =
          index ===
          history.length - 1;

        y = drawPaymentRow(
          doc,
          payment,
          index,
          y,
          isCurrent
        );
      }
    );
  } else {
    /*
     * Backward-compatible fallback.
     */

    y = drawPaymentRow(
      doc,
      {
        label: "Payment made",
        amount: data.amountPaid,
        date: data.paymentDate,
        method: data.paymentMethod,
        reference: data.reference,
      },
      0,
      y,
      true
    );
  }

  y += 2;

  /*
   * =========================================================
   * BALANCE CALCULATION
   * =========================================================
   */

  /*
   * Previous balance is what the student owed before
   * today's payment.
   *
   * Current payment is deducted from it.
   *
   * The final balance is the balance AFTER this receipt.
   */

  const previousBalance =
    Math.max(
      Number(
        data.previousBalance
      ) || 0,
      0
    );

  const currentPayment =
    Math.max(
      Number(
        data.amountPaid
      ) || 0,
      0
    );

  const calculatedBalance =
    Math.max(
      previousBalance -
        currentPayment,
      0
    );

  /*
   * Prefer the explicitly supplied balance from
   * the payment record.
   */

  const balanceAfter =
    Number.isFinite(
      Number(
        data.balanceAfterPayment
      )
    )
      ? Math.max(
          Number(
            data.balanceAfterPayment
          ),
          0
        )
      : calculatedBalance;

  /*
   * =========================================================
   * BALANCE SUMMARY
   * =========================================================
   */

  y += 2;

  drawLine(doc, y);

  y += 6;

  setText(
    doc,
    "Previous Balance",
    8,
    y,
    7,
    GRAY
  );

  setText(
    doc,
    money(previousBalance),
    72,
    y,
    7.2,
    DARK,
    "bold",
    "right"
  );

  y += 6;

  setText(
    doc,
    "Paid Today",
    8,
    y,
    7,
    GRAY
  );

  setText(
    doc,
    money(currentPayment),
    72,
    y,
    7.2,
    DARK,
    "bold",
    "right"
  );

  y += 8;

  /*
   * =========================================================
   * BALANCE AFTER PAYMENT
   * =========================================================
   */

  doc.setFillColor(
    RED[0],
    RED[1],
    RED[2]
  );

  doc.roundedRect(
    8,
    y - 2,
    64,
    13,
    1.8,
    1.8,
    "F"
  );

  setText(
    doc,
    "Balance After Payment",
    11,
    y + 5.5,
    7,
    WHITE,
    "bold"
  );

  setText(
    doc,
    money(balanceAfter),
    69,
    y + 5.5,
    9,
    WHITE,
    "bold",
    "right"
  );

  y += 19;

  drawLine(doc, y);

  y += 7;

  /*
   * =========================================================
   * PAYMENT INFORMATION
   * =========================================================
   */

  y = sectionLabel(
    doc,
    "Payment Information",
    y
  );

  setText(
    doc,
    "Payment Method",
    8,
    y,
    7,
    GRAY
  );

  setText(
    doc,
    safeText(
      data.paymentMethod
    )
      .replace(
        /^./,
        (char) =>
          char.toUpperCase()
      ),
    72,
    y,
    7.2,
    DARK,
    "bold",
    "right"
  );

  y += 6;

  setText(
    doc,
    "Payment Date",
    8,
    y,
    7,
    GRAY
  );

  setText(
    doc,
    safeText(
      data.paymentDate
    ),
    72,
    y,
    7.2,
    DARK,
    "bold",
    "right"
  );

  y += 6;

  if (data.reference) {
    setText(
      doc,
      "Reference",
      8,
      y,
      7,
      GRAY
    );

    /*
     * Long M-Pesa references are allowed to fit
     * inside the receipt.
     */

    let reference =
      safeText(
        data.reference
      );

    if (reference.length > 22) {
      reference =
        reference.slice(
          0,
          22
        ) + "…";
    }

    setText(
      doc,
      reference,
      72,
      y,
      6.7,
      DARK,
      "bold",
      "right"
    );

    y += 6;
  }

  y += 3;

  drawLine(doc, y);

  y += 8;

  /*
   * =========================================================
   * FOOTER
   * =========================================================
   */

  setText(
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

  setText(
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

  setText(
    doc,
    "Junction Trade Center · Nairobi CBD",
    40,
    y,
    6.3,
    GRAY,
    "normal",
    "center"
  );

  y += 4;

  setText(
    doc,
    "Piano & Acoustic Guitar Training",
    40,
    y,
    6.3,
    GRAY,
    "normal",
    "center"
  );

  /*
   * =========================================================
   * DOWNLOAD
   * =========================================================
   */

  doc.save(
    `Sauti-Tamu-Receipt-${data.receiptNumber}.pdf`
  );
}

export default generatePaymentReceipt;