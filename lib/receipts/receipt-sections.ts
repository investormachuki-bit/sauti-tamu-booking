import jsPDF from "jspdf";

import {
  PaymentReceiptData,
  PaymentReceiptItem,
  ReceiptBusinessSettings,
} from "./receipt-types";

import {
  DARK,
  GRAY,
  GREEN,
  LIGHT,
  LIGHT_GRAY,
  PALE_GREEN,
  RED,
  WHITE,
  drawLine,
  drawWrappedText,
  money,
  setText,
} from "./receipt-pdf";

/*
 * =========================================================
 * PAYMENT ROW
 * =========================================================
 */

function drawPaymentRow(
  doc: jsPDF,
  item: PaymentReceiptItem,
  index: number,
  y: number,
  currency: string,
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
    money(item.amount, currency),
    70,
    y,
    7.4,
    highlight ? GREEN : DARK,
    "bold",
    "right"
  );

  return y + rowHeight;
}

/*
 * =========================================================
 * SECTION LABEL
 * =========================================================
 */

export function sectionLabel(
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

/*
 * =========================================================
 * BUSINESS HEADER
 * =========================================================
 */

export function drawReceiptHeader(
  doc: jsPDF,
  business: ReceiptBusinessSettings,
  address: string,
  logoDataUrl: string | null,
  y: number
) {
  /*
   * Logo
   */

  if (logoDataUrl) {
    try {
      doc.addImage(
        logoDataUrl,
        "AUTO",
        27,
        y,
        26,
        16,
        undefined,
        "FAST"
      );

      y += 19;
    } catch (error) {
      console.error(
        "Could not add logo to receipt:",
        error
      );
    }
  }

  /*
   * Business name
   */

  const businessName =
    business.receipt_business_name ||
    business.business_name ||
    "Sauti Tamu Piano Center";

  const businessNameLines =
    doc.splitTextToSize(
      businessName,
      64
    );

  businessNameLines.forEach(
    (
      line: string,
      index: number
    ) => {
      setText(
        doc,
        line,
        40,
        y + index * 4.5,
        11,
        RED,
        "bold",
        "center"
      );
    }
  );

  y +=
    businessNameLines.length *
      4.5 +
    2;

  /*
   * Contact information
   */

  const contactParts = [
    business.phone,

    business.whatsapp_number &&
    business.whatsapp_number !==
      business.phone
      ? `WhatsApp ${business.whatsapp_number}`
      : null,

    business.email,
  ].filter(Boolean);

  if (contactParts.length > 0) {
    y =
      drawWrappedText(
        doc,
        contactParts.join(" · "),
        40,
        y,
        64,
        5.8,
        GRAY,
        "normal",
        3,
        "center"
      );
  }

  /*
   * Website
   */

  if (business.website) {
    y += 1;

    y =
      drawWrappedText(
        doc,
        business.website,
        40,
        y,
        64,
        5.8,
        GRAY,
        "normal",
        3,
        "center"
      );
  }

  /*
   * Address
   */

  if (address) {
    y += 1;

    y =
      drawWrappedText(
        doc,
        address,
        40,
        y,
        64,
        3.2,
        GRAY,
        "normal",
        3,
        "center"
      );
  }

  return y + 3;
}

/*
 * =========================================================
 * RECEIPT TITLE
 * =========================================================
 */

export function drawReceiptTitle(
  doc: jsPDF,
  receiptNumber: string,
  y: number
) {
  doc.setFillColor(
    RED[0],
    RED[1],
    RED[2]
  );

  doc.roundedRect(
    19,
    y,
    42,
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
    `Receipt No. ${receiptNumber}`,
    72,
    y,
    6.5,
    GRAY,
    "normal",
    "right"
  );

  y += 6;

  drawLine(doc, y);

  return y + 7;
}

/*
 * =========================================================
 * STUDENT SECTION
 * =========================================================
 */

export function drawStudentSection(
  doc: jsPDF,
  data: PaymentReceiptData,
  y: number
) {
  y =
    sectionLabel(
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

  if (data.studentEmail) {
    y =
      drawWrappedText(
        doc,
        data.studentEmail,
        8,
        y,
        64,
        6.2,
        GRAY,
        "normal",
        3.5
      );
  }

  if (data.studentPhone) {
    y += 1;

    setText(
      doc,
      data.studentPhone,
      8,
      y,
      6.5,
      GRAY
    );

    y += 4;
  }

  y += 3;

  drawLine(doc, y);

  return y + 7;
}

/*
 * =========================================================
 * PROGRAMME SECTION
 * =========================================================
 */

export function drawProgrammeSection(
  doc: jsPDF,
  data: PaymentReceiptData,
  currency: string,
  y: number
) {
  y =
    sectionLabel(
      doc,
      "Programme",
      y
    );

  y =
    drawWrappedText(
      doc,
      data.programmeName,
      8,
      y,
      64,
      8,
      DARK,
      "bold",
      4
    );

  y += 1;

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
   * Programme amount box
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
    money(
      data.programmeAmount,
      currency
    ),
    69,
    y + 4.8,
    8,
    DARK,
    "bold",
    "right"
  );

  y += 14;

  drawLine(doc, y);

  return y + 7;
}

/*
 * =========================================================
 * PAYMENT PROGRESS
 * =========================================================
 */

export function drawPaymentProgress(
  doc: jsPDF,
  data: PaymentReceiptData,
  currency: string,
  y: number
) {
  y =
    sectionLabel(
      doc,
      "Payment Progress",
      y
    );

  const history =
    data.paymentHistory ?? [];

  if (history.length > 0) {
    history.forEach(
      (
        payment,
        index
      ) => {
        const isCurrent =
          index ===
          history.length - 1;

        y =
          drawPaymentRow(
            doc,
            payment,
            index,
            y,
            currency,
            isCurrent
          );
      }
    );
  } else {
    y =
      drawPaymentRow(
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
        currency,
        true
      );
  }

  return y + 2;
}

/*
 * =========================================================
 * BALANCE SECTION
 * =========================================================
 */

export function drawBalanceSection(
  doc: jsPDF,
  data: PaymentReceiptData,
  currency: string,
  y: number
) {
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

  const suppliedBalance =
    Number(
      data.balanceAfterPayment
    );

  const balanceAfter =
    Number.isFinite(
      suppliedBalance
    )
      ? Math.max(
          suppliedBalance,
          0
        )
      : calculatedBalance;

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
    money(
      previousBalance,
      currency
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
    "Paid Today",
    8,
    y,
    7,
    GRAY
  );

  setText(
    doc,
    money(
      currentPayment,
      currency
    ),
    72,
    y,
    7.2,
    DARK,
    "bold",
    "right"
  );

  y += 8;

  /*
   * Balance after payment
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
    money(
      balanceAfter,
      currency
    ),
    69,
    y + 5.5,
    9,
    WHITE,
    "bold",
    "right"
  );

  y += 19;

  drawLine(doc, y);

  return y + 7;
}

/*
 * =========================================================
 * PAYMENT INFORMATION
 * =========================================================
 */

export function drawPaymentInformation(
  doc: jsPDF,
  data: PaymentReceiptData,
  y: number
) {
  y =
    sectionLabel(
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

  const method =
    String(
      data.paymentMethod ?? ""
    )
      .toLowerCase()
      .replace(
        /^./,
        (char) =>
          char.toUpperCase()
      );

  setText(
    doc,
    method,
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
    data.paymentDate,
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

    let reference =
      String(
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

  return y;
}

/*
 * =========================================================
 * PAYMENT INSTRUCTIONS
 * =========================================================
 */

export function drawPaymentInstructions(
  doc: jsPDF,
  instructions: string | null,
  y: number
) {
  if (!instructions) {
    return y;
  }

  y += 3;

  drawLine(doc, y);

  y += 6;

  y =
    sectionLabel(
      doc,
      "Payment Instructions",
      y
    );

  return drawWrappedText(
    doc,
    instructions,
    8,
    y,
    64,
    6,
    GRAY,
    "normal",
    3.5
  );
}

/*
 * =========================================================
 * STAMP
 * =========================================================
 */

export function drawReceiptStamp(
  doc: jsPDF,
  stampDataUrl: string | null,
  y: number
) {
  if (!stampDataUrl) {
    return y;
  }

  y += 4;

  try {
    doc.addImage(
      stampDataUrl,
      "AUTO",
      51,
      y,
      20,
      14,
      undefined,
      "FAST"
    );

    y += 16;
  } catch (error) {
    console.error(
      "Could not add receipt stamp:",
      error
    );
  }

  return y;
}

/*
 * =========================================================
 * FOOTER
 * =========================================================
 */

export function drawReceiptFooter(
  doc: jsPDF,
  business: ReceiptBusinessSettings,
  y: number
) {
  y += 3;

  drawLine(doc, y);

  y += 8;

  if (business.receipt_footer) {
    y =
      drawWrappedText(
        doc,
        business.receipt_footer,
        40,
        y,
        64,
        6.5,
        GRAY,
        "normal",
        3.5,
        "center"
      );

    y += 3;
  }

  setText(
    doc,
    business.receipt_business_name ||
      business.business_name ||
      "Sauti Tamu Piano Center",
    40,
    y,
    8.5,
    DARK,
    "bold",
    "center"
  );

  y += 5;

  const footerContact = [
    business.phone,
    business.email,
  ].filter(Boolean);

  if (footerContact.length > 0) {
    y =
      drawWrappedText(
        doc,
        footerContact.join(" · "),
        40,
        y,
        64,
        5.5,
        GRAY,
        "normal",
        3,
        "center"
      );
  }

  return y;
}