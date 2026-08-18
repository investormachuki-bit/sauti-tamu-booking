import jsPDF from "jspdf";

export type PaymentReceiptHistoryItem = {
  id: string;
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

  previousBalance: number;
  amountPaid: number;
  balanceAfterPayment: number;

  paymentMethod: string;
  paymentDate: string;

  reference?: string | null;

  /*
   * Complete payment history up to and including
   * the payment represented by this receipt.
   */
  payments?: PaymentReceiptHistoryItem[];
};

/*
 * ============================================================
 * SETTINGS
 * ============================================================
 */

const PAGE_WIDTH = 80;

const MARGIN = 6;

const CONTENT_WIDTH =
  PAGE_WIDTH - MARGIN * 2;

const RED = [181, 31, 47] as const;
const DARK = [35, 35, 35] as const;
const GRAY = [105, 105, 105] as const;
const LIGHT_GRAY = [232, 232, 232] as const;
const SOFT = [248, 248, 248] as const;
const GREEN = [35, 125, 76] as const;

/*
 * ============================================================
 * FORMATTERS
 * ============================================================
 */

function formatCurrency(
  amount: number
) {
  const value = Number(amount) || 0;

  return `KES ${new Intl.NumberFormat(
    "en-KE",
    {
      maximumFractionDigits: 0,
    }
  ).format(value)}`;
}

function formatDate(
  dateString: string
) {
  if (!dateString) {
    return "—";
  }

  /*
   * The application stores dates as YYYY-MM-DD.
   * Adding the Nairobi offset prevents the date from
   * shifting backward in some browser environments.
   */
  const date = new Date(
    `${dateString}T00:00:00+03:00`
  );

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return new Intl.DateTimeFormat(
    "en-KE",
    {
      timeZone: "Africa/Nairobi",
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  ).format(date);
}

function cleanPaymentMethod(
  method: string
) {
  if (!method) {
    return "Other";
  }

  const normalized =
    method.toLowerCase();

  switch (normalized) {
    case "mpesa":
      return "M-Pesa";

    case "cash":
      return "Cash";

    case "bank":
      return "Bank";

    case "card":
      return "Card";

    default:
      return (
        method.charAt(0).toUpperCase() +
        method.slice(1)
      );
  }
}

function safeText(
  value: unknown
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value);
}

/*
 * ============================================================
 * PDF HELPERS
 * ============================================================
 */

function setFont(
  doc: jsPDF,
  size: number,
  style:
    | "normal"
    | "bold" = "normal",
  color = DARK
) {
  doc.setFont(
    "helvetica",
    style
  );

  doc.setFontSize(size);

  doc.setTextColor(
    color[0],
    color[1],
    color[2]
  );
}

function drawLine(
  doc: jsPDF,
  y: number,
  color = LIGHT_GRAY,
  lineWidth = 0.2
) {
  doc.setDrawColor(
    color[0],
    color[1],
    color[2]
  );

  doc.setLineWidth(lineWidth);

  doc.line(
    MARGIN,
    y,
    PAGE_WIDTH - MARGIN,
    y
  );
}

function drawRoundedBox(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  fillColor: readonly [
    number,
    number,
    number
  ],
  radius = 2
) {
  doc.setFillColor(
    fillColor[0],
    fillColor[1],
    fillColor[2]
  );

  doc.setDrawColor(
    fillColor[0],
    fillColor[1],
    fillColor[2]
  );

  doc.roundedRect(
    x,
    y,
    width,
    height,
    radius,
    radius,
    "F"
  );
}

function drawLabelValue(
  doc: jsPDF,
  label: string,
  value: string,
  y: number,
  valueBold = true
) {
  setFont(
    doc,
    7.2,
    "normal",
    GRAY
  );

  doc.text(
    label,
    MARGIN,
    y
  );

  setFont(
    doc,
    7.4,
    valueBold
      ? "bold"
      : "normal",
    DARK
  );

  doc.text(
    value,
    PAGE_WIDTH - MARGIN,
    y,
    {
      align: "right",
    }
  );
}

/*
 * ============================================================
 * MAIN GENERATOR
 * ============================================================
 */

export function generatePaymentReceipt(
  data: PaymentReceiptData
) {
  /*
   * We use a custom 80mm receipt width.
   *
   * Height is intentionally generous. This prevents the
   * progressive payment history from being cut off when
   * a student has several payments.
   */
  const payments =
    data.payments &&
    data.payments.length > 0
      ? [...data.payments]
      : [
          {
            id:
              data.receiptNumber,
            amount:
              Number(
                data.amountPaid
              ),
            paymentDate:
              data.paymentDate,
            paymentMethod:
              data.paymentMethod,
            reference:
              data.reference,
            isCurrent: true,
          },
        ];

  /*
   * Sort oldest -> newest.
   *
   * The receipt should read:
   * Payment 1
   * Payment 2
   * Payment 3
   * ...
   */
  payments.sort((a, b) => {
    const dateCompare =
      safeText(
        a.paymentDate
      ).localeCompare(
        safeText(
          b.paymentDate
        )
      );

    if (dateCompare !== 0) {
      return dateCompare;
    }

    return 0;
  });

  /*
   * Determine which payment is the current one.
   *
   * If the page supplied isCurrent, respect it.
   * Otherwise the latest payment becomes current.
   */
  let currentIndex =
    payments.findIndex(
      (payment) =>
        payment.isCurrent === true
    );

  if (currentIndex < 0) {
    currentIndex =
      payments.length - 1;
  }

  const currentPayment =
    payments[currentIndex];

  /*
   * Calculate total paid from the visible history.
   */
  const totalPaid =
    payments.reduce(
      (total, payment) =>
        total +
        Number(payment.amount || 0),
      0
    );

  /*
   * The programme amount is authoritative.
   */
  const programmeAmount =
    Number(
      data.programmeAmount
    ) || 0;

  /*
   * Calculate balance ourselves where possible.
   *
   * This prevents a receipt from displaying a stale
   * balance if the payment history is available.
   */
  const calculatedBalance =
    Math.max(
      programmeAmount -
        totalPaid,
      0
    );

  const balanceAfterPayment =
    Number.isFinite(
      calculatedBalance
    )
      ? calculatedBalance
      : Number(
          data.balanceAfterPayment
        ) || 0;

  /*
   * Previous balance is the balance before the current
   * payment.
   */
  const calculatedPreviousBalance =
    Math.max(
      programmeAmount -
        (totalPaid -
          Number(
            currentPayment?.amount ||
              0
          )),
      0
    );

  const previousBalance =
    Number.isFinite(
      calculatedPreviousBalance
    )
      ? calculatedPreviousBalance
      : Number(
          data.previousBalance
        ) || 0;

  /*
   * Estimate receipt height.
   *
   * This is deliberately calculated dynamically so a
   * student with 2 payments doesn't get an unnecessarily
   * huge receipt, while a student with 8 payments isn't
   * cut off.
   */
  const paymentRowsHeight =
    payments.length * 9;

  const baseHeight = 158;

  const receiptHeight =
    Math.max(
      180,
      baseHeight +
        paymentRowsHeight
    );

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [
      PAGE_WIDTH,
      receiptHeight,
    ],
    compress: true,
  });

  let y = 7;

  /*
   * ========================================================
   * HEADER
   * ========================================================
   */

  /*
   * Small brand mark.
   */
  doc.setFillColor(
    RED[0],
    RED[1],
    RED[2]
  );

  doc.circle(
    PAGE_WIDTH / 2,
    y + 4,
    4,
    "F"
  );

  setFont(
    doc,
    8,
    "bold",
    [255, 255, 255]
  );

  doc.text(
    "S",
    PAGE_WIDTH / 2,
    y + 6.1,
    {
      align: "center",
    }
  );

  y += 13;

  setFont(
    doc,
    14,
    "bold",
    RED
  );

  doc.text(
    "Sauti Tamu",
    PAGE_WIDTH / 2,
    y,
    {
      align: "center",
    }
  );

  y += 4.2;

  setFont(
    doc,
    6.5,
    "bold",
    DARK
  );

  doc.text(
    "PIANO CENTER",
    PAGE_WIDTH / 2,
    y,
    {
      align: "center",
    }
  );

  y += 5;

  setFont(
    doc,
    6.5,
    "normal",
    GRAY
  );

  doc.text(
    "Junction Trade Center · Nairobi CBD",
    PAGE_WIDTH / 2,
    y,
    {
      align: "center",
    }
  );

  y += 7;

  /*
   * ========================================================
   * RECEIPT TITLE
   * ========================================================
   */

  drawRoundedBox(
    doc,
    MARGIN,
    y,
    CONTENT_WIDTH,
    10,
    RED,
    2
  );

  setFont(
    doc,
    8.5,
    "bold",
    [255, 255, 255]
  );

  doc.text(
    "Payment Receipt",
    PAGE_WIDTH / 2,
    y + 6.5,
    {
      align: "center",
    }
  );

  y += 15;

  /*
   * Receipt number and date.
   */

  setFont(
    doc,
    6.5,
    "normal",
    GRAY
  );

  doc.text(
    "Receipt No.",
    MARGIN,
    y
  );

  setFont(
    doc,
    7,
    "bold",
    DARK
  );

  doc.text(
    safeText(
      data.receiptNumber
    ),
    MARGIN,
    y + 3.8
  );

  setFont(
    doc,
    6.5,
    "normal",
    GRAY
  );

  doc.text(
    "Payment Date",
    PAGE_WIDTH - MARGIN,
    y,
    {
      align: "right",
    }
  );

  setFont(
    doc,
    7,
    "bold",
    DARK
  );

  doc.text(
    formatDate(
      currentPayment?.paymentDate ||
        data.paymentDate
    ),
    PAGE_WIDTH - MARGIN,
    y + 3.8,
    {
      align: "right",
    }
  );

  y += 10;

  drawLine(doc, y);

  y += 6;

  /*
   * ========================================================
   * RECEIVED FROM
   * ========================================================
   */

  setFont(
    doc,
    6.5,
    "bold",
    RED
  );

  doc.text(
    "RECEIVED FROM",
    MARGIN,
    y
  );

  y += 5;

  setFont(
    doc,
    9.5,
    "bold",
    DARK
  );

  const studentNameLines =
    doc.splitTextToSize(
      safeText(
        data.studentName
      ),
      CONTENT_WIDTH
    );

  doc.text(
    studentNameLines,
    MARGIN,
    y
  );

  y +=
    studentNameLines.length * 4;

  if (data.studentEmail) {
    setFont(
      doc,
      6.8,
      "normal",
      GRAY
    );

    const emailLines =
      doc.splitTextToSize(
        safeText(
          data.studentEmail
        ),
        CONTENT_WIDTH
      );

    doc.text(
      emailLines,
      MARGIN,
      y
    );

    y +=
      emailLines.length * 3.5;
  }

  if (data.studentPhone) {
    setFont(
      doc,
      6.8,
      "normal",
      GRAY
    );

    doc.text(
      safeText(
        data.studentPhone
      ),
      MARGIN,
      y
    );

    y += 4;
  }

  y += 2;

  drawLine(doc, y);

  y += 6;

  /*
   * ========================================================
   * PROGRAMME
   * ========================================================
   */

  setFont(
    doc,
    6.5,
    "bold",
    RED
  );

  doc.text(
    "PROGRAMME",
    MARGIN,
    y
  );

  y += 5;

  setFont(
    doc,
    8,
    "bold",
    DARK
  );

  const programmeLines =
    doc.splitTextToSize(
      safeText(
        data.programmeName
      ),
      CONTENT_WIDTH
    );

  doc.text(
    programmeLines,
    MARGIN,
    y
  );

  y +=
    programmeLines.length * 3.8;

  setFont(
    doc,
    6.8,
    "normal",
    GRAY
  );

  doc.text(
    `${safeText(
      data.instrument
    )} Training`,
    MARGIN,
    y
  );

  y += 5;

  /*
   * Programme amount.
   */

  drawRoundedBox(
    doc,
    MARGIN,
    y,
    CONTENT_WIDTH,
    11,
    SOFT,
    2
  );

  setFont(
    doc,
    6.5,
    "normal",
    GRAY
  );

  doc.text(
    "Programme Amount",
    MARGIN + 4,
    y + 6.8
  );

  setFont(
    doc,
    9,
    "bold",
    DARK
  );

  doc.text(
    formatCurrency(
      programmeAmount
    ),
    PAGE_WIDTH - MARGIN - 4,
    y + 6.8,
    {
      align: "right",
    }
  );

  y += 16;

  /*
   * ========================================================
   * PAYMENT PROGRESS
   * ========================================================
   */

  setFont(
    doc,
    6.5,
    "bold",
    RED
  );

  doc.text(
    "PAYMENT PROGRESS",
    MARGIN,
    y
  );

  y += 5;

  /*
   * Header row.
   */

  drawRoundedBox(
    doc,
    MARGIN,
    y,
    CONTENT_WIDTH,
    7,
    SOFT,
    1.5
  );

  setFont(
    doc,
    5.8,
    "bold",
    GRAY
  );

  doc.text(
    "PAYMENT",
    MARGIN + 3,
    y + 4.6
  );

  doc.text(
    "DATE",
    MARGIN + 29,
    y + 4.6
  );

  doc.text(
    "AMOUNT",
    PAGE_WIDTH - MARGIN - 3,
    y + 4.6,
    {
      align: "right",
    }
  );

  y += 9;

  /*
   * Payment rows.
   */

  payments.forEach(
    (payment, index) => {
      const rowHeight = 8.5;

      const isCurrent =
        payment.isCurrent ===
          true ||
        index === currentIndex;

      if (isCurrent) {
        drawRoundedBox(
          doc,
          MARGIN,
          y - 1,
          CONTENT_WIDTH,
          rowHeight,
          [253, 239, 241],
          1.5
        );
      }

      setFont(
        doc,
        6.5,
        "bold",
        isCurrent
          ? RED
          : DARK
      );

      doc.text(
        `Payment ${index + 1}`,
        MARGIN + 3,
        y + 4
      );

      setFont(
        doc,
        5.9,
        "normal",
        GRAY
      );

      doc.text(
        formatDate(
          payment.paymentDate
        ),
        MARGIN + 29,
        y + 4
      );

      setFont(
        doc,
        6.7,
        "bold",
        isCurrent
          ? RED
          : DARK
      );

      doc.text(
        formatCurrency(
          Number(
            payment.amount
          )
        ),
        PAGE_WIDTH - MARGIN - 3,
        y + 4,
        {
          align: "right",
        }
      );

      /*
       * Payment method / reference sits beneath the
       * main row only when useful.
       */
      const methodText =
        cleanPaymentMethod(
          payment.paymentMethod
        );

      if (
        payment.reference
      ) {
        setFont(
          doc,
          5.2,
          "normal",
          GRAY
        );

        doc.text(
          `${methodText} · Ref: ${safeText(
            payment.reference
          )}`,
          MARGIN + 3,
          y + 7
        );
      } else {
        setFont(
          doc,
          5.2,
          "normal",
          GRAY
        );

        doc.text(
          methodText,
          MARGIN + 3,
          y + 7
        );
      }

      y += rowHeight;
    }
  );

  /*
   * ========================================================
   * PAYMENT TOTALS
   * ========================================================
   */

  y += 2;

  drawLine(doc, y);

  y += 6;

  drawLabelValue(
    doc,
    "Total paid to date",
    formatCurrency(
      totalPaid
    ),
    y
  );

  y += 6;

  /*
   * Current balance box.
   */

  drawRoundedBox(
    doc,
    MARGIN,
    y,
    CONTENT_WIDTH,
    15,
    RED,
    2
  );

  setFont(
    doc,
    6.5,
    "bold",
    [255, 255, 255]
  );

  doc.text(
    "CURRENT BALANCE",
    MARGIN + 4,
    y + 6
  );

  setFont(
    doc,
    11,
    "bold",
    [255, 255, 255]
  );

  doc.text(
    formatCurrency(
      balanceAfterPayment
    ),
    PAGE_WIDTH - MARGIN - 4,
    y + 9,
    {
      align: "right",
    }
  );

  y += 20;

  /*
   * ========================================================
   * LATEST PAYMENT DETAILS
   * ========================================================
   */

  setFont(
    doc,
    6.5,
    "bold",
    RED
  );

  doc.text(
    "LATEST PAYMENT",
    MARGIN,
    y
  );

  y += 6;

  drawLabelValue(
    doc,
    "Amount received",
    formatCurrency(
      Number(
        currentPayment?.amount ||
          data.amountPaid
      )
    ),
    y
  );

  y += 5.5;

  drawLabelValue(
    doc,
    "Payment method",
    cleanPaymentMethod(
      currentPayment?.paymentMethod ||
        data.paymentMethod
    ),
    y
  );

  y += 5.5;

  if (
    currentPayment?.reference ||
    data.reference
  ) {
    drawLabelValue(
      doc,
      "Reference",
      safeText(
        currentPayment?.reference ||
          data.reference
      ),
      y
    );

    y += 5.5;
  }

  drawLabelValue(
    doc,
    "Balance before payment",
    formatCurrency(
      previousBalance
    ),
    y
  );

  y += 7;

  /*
   * ========================================================
   * PAYMENT STATUS
   * ========================================================
   */

  drawRoundedBox(
    doc,
    MARGIN,
    y,
    CONTENT_WIDTH,
    10,
    [239, 249, 243],
    2
  );

  setFont(
    doc,
    7,
    "bold",
    GREEN
  );

  doc.text(
    balanceAfterPayment <= 0
      ? "Programme fully paid"
      : "Payment successfully received",
    PAGE_WIDTH / 2,
    y + 6.3,
    {
      align: "center",
    }
  );

  y += 16;

  /*
   * ========================================================
   * FOOTER
   * ========================================================
   */

  drawLine(doc, y);

  y += 6;

  setFont(
    doc,
    7,
    "bold",
    DARK
  );

  doc.text(
    "Thank you for choosing Sauti Tamu.",
    PAGE_WIDTH / 2,
    y,
    {
      align: "center",
    }
  );

  y += 4;

  setFont(
    doc,
    5.8,
    "normal",
    GRAY
  );

  doc.text(
    "Learn with confidence. Grow with music.",
    PAGE_WIDTH / 2,
    y,
    {
      align: "center",
    }
  );

  y += 5;

  setFont(
    doc,
    5.5,
    "normal",
    GRAY
  );

  doc.text(
    "Junction Trade Center · 4th Floor · Room F401",
    PAGE_WIDTH / 2,
    y,
    {
      align: "center",
    }
  );

  y += 3.5;

  doc.text(
    "Above Equity Bank Tearoom Branch · Nairobi CBD",
    PAGE_WIDTH / 2,
    y,
    {
      align: "center",
    }
  );

  /*
   * ========================================================
   * RETURN PDF DOCUMENT
   * ========================================================
   */

  return doc;
}