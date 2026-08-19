import jsPDF from "jspdf";
import { supabase } from "@/lib/supabase";

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

  paymentHistory?: PaymentReceiptItem[];

  previousBalance: number;

  amountPaid: number;

  balanceAfterPayment: number;

  paymentMethod: string;
  paymentDate: string;

  reference?: string | null;
};

type ReceiptBusinessSettings = {
  business_name: string;
  phone: string | null;
  whatsapp_number: string | null;
  email: string | null;
  website: string | null;

  logo_url: string | null;
  stamp_url: string | null;

  receipt_business_name: string;

  receipt_show_logo: boolean;
  receipt_show_stamp: boolean;

  receipt_footer: string;

  currency: string;

  payment_instructions: string | null;
};

type ReceiptBookingSettings = {
  address: string | null;
};

/*
 * =========================================================
 * BRAND COLORS
 * =========================================================
 */

const RED: readonly [number, number, number] = [
  197,
  31,
  42,
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

/*
 * =========================================================
 * HELPERS
 * =========================================================
 */

function safeText(value: unknown) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value);
}

function money(
  amount: number,
  currency = "KES"
) {
  const formatted =
    new Intl.NumberFormat(
      "en-KE",
      {
        maximumFractionDigits: 0,
      }
    ).format(
      Number(amount) || 0
    );

  return `${currency} ${formatted}`;
}

function drawLine(
  doc: jsPDF,
  y: number,
  color: readonly [
    number,
    number,
    number
  ] = LIGHT_GRAY,
  lineWidth = 0.25
) {
  doc.setDrawColor(
    color[0],
    color[1],
    color[2]
  );

  doc.setLineWidth(
    lineWidth
  );

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
  color: readonly [
    number,
    number,
    number
  ] = DARK,
  weight:
    | "normal"
    | "bold" = "normal",
  align:
    | "left"
    | "center"
    | "right" = "left"
) {
  doc.setFont(
    "helvetica",
    weight
  );

  doc.setFontSize(
    size
  );

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
    highlight
      ? GREEN
      : GRAY,
    highlight
      ? "bold"
      : "normal"
  );

  setText(
    doc,
    money(
      item.amount,
      currency
    ),
    70,
    y,
    7.4,
    highlight
      ? GREEN
      : DARK,
    "bold",
    "right"
  );

  return y + rowHeight;
}

/*
 * =========================================================
 * STORAGE IMAGE HELPERS
 * =========================================================
 */

/**
 * Converts a signed/public image URL into a data URI
 * that jsPDF can safely embed in the PDF.
 */
async function imageUrlToDataUrl(
  url: string
): Promise<string | null> {
  try {
    const response =
      await fetch(url);

    if (!response.ok) {
      console.error(
        "Could not fetch receipt image:",
        response.status
      );

      return null;
    }

    const blob =
      await response.blob();

    return await new Promise(
      (resolve) => {
        const reader =
          new FileReader();

        reader.onloadend = () => {
          resolve(
            typeof reader.result ===
              "string"
              ? reader.result
              : null
          );
        };

        reader.onerror = () =>
          resolve(null);

        reader.readAsDataURL(
          blob
        );
      }
    );
  } catch (error) {
    console.error(
      "Image conversion error:",
      error
    );

    return null;
  }
}

/**
 * Gets a signed URL for an asset stored in the
 * private business-assets bucket.
 */
async function getBusinessAssetUrl(
  path: string | null
) {
  if (!path) {
    return null;
  }

  /*
   * Support older records where a complete URL
   * may already have been stored.
   */
  if (
    path.startsWith(
      "http://"
    ) ||
    path.startsWith(
      "https://"
    )
  ) {
    return path;
  }

  const {
    data,
    error,
  } =
    await supabase.storage
      .from(
        "business-assets"
      )
      .createSignedUrl(
        path,
        60 * 10
      );

  if (error) {
    console.error(
      "Receipt asset signed URL error:",
      error
    );

    return null;
  }

  return (
    data?.signedUrl ??
    null
  );
}

/*
 * =========================================================
 * LOAD RECEIPT SETTINGS
 * =========================================================
 */

async function loadReceiptSettings() {
  const [
    businessResult,
    bookingResult,
  ] = await Promise.all([
    supabase
      .from(
        "business_settings"
      )
      .select(
        `
          business_name,
          phone,
          whatsapp_number,
          email,
          website,
          logo_url,
          stamp_url,
          receipt_business_name,
          receipt_show_logo,
          receipt_show_stamp,
          receipt_footer,
          currency,
          payment_instructions
        `
      )
      .eq("id", true)
      .maybeSingle(),

    supabase
      .from(
        "booking_settings"
      )
      .select(
        "address"
      )
      .limit(1)
      .maybeSingle(),
  ]);

  if (businessResult.error) {
    throw businessResult.error;
  }

  if (bookingResult.error) {
    throw bookingResult.error;
  }

  const business =
    (businessResult.data ??
      null) as ReceiptBusinessSettings | null;

  const booking =
    (bookingResult.data ??
      null) as ReceiptBookingSettings | null;

  /*
   * Safe fallbacks.
   */
  const settings: ReceiptBusinessSettings =
    business ?? {
      business_name:
        "Sauti Tamu Piano Center",

      phone: null,
      whatsapp_number: null,
      email: null,
      website: null,

      logo_url: null,
      stamp_url: null,

      receipt_business_name:
        "Sauti Tamu Piano Center",

      receipt_show_logo: true,
      receipt_show_stamp: true,

      receipt_footer:
        "Thank you for choosing Sauti Tamu Piano Center.",

      currency: "KES",

      payment_instructions:
        null,
    };

  const address =
    booking?.address ??
    "Junction Trade Center, 4th Floor, Room F401, Nairobi CBD";

  return {
    business: settings,
    address,
  };
}

/*
 * =========================================================
 * TEXT WRAPPING
 * =========================================================
 */

function drawWrappedText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  size: number,
  color: readonly [
    number,
    number,
    number
  ] = GRAY,
  weight:
    | "normal"
    | "bold" = "normal",
  lineHeight = 3.5,
  align:
    | "left"
    | "center"
    | "right" = "left"
) {
  doc.setFont(
    "helvetica",
    weight
  );

  doc.setFontSize(
    size
  );

  const lines =
    doc.splitTextToSize(
      safeText(text),
      maxWidth
    );

  lines.forEach(
    (
      line: string,
      index: number
    ) => {
      setText(
        doc,
        line,
        x,
        y +
          index *
            lineHeight,
        size,
        color,
        weight,
        align
      );
    }
  );

  return (
    y +
    lines.length *
      lineHeight
  );
}

/*
 * =========================================================
 * RECEIPT GENERATOR
 * =========================================================
 */

export async function generatePaymentReceipt(
  data: PaymentReceiptData
) {
  /*
   * =========================================================
   * LOAD CURRENT BUSINESS SETTINGS
   * =========================================================
   */

  const {
    business,
    address,
  } =
    await loadReceiptSettings();

  const currency =
    business.currency ||
    "KES";

  /*
   * =========================================================
   * LOAD LOGO + STAMP
   * =========================================================
   */

  let logoDataUrl:
    | string
    | null = null;

  let stampDataUrl:
    | string
    | null = null;

  if (
    business.receipt_show_logo &&
    business.logo_url
  ) {
    const logoUrl =
      await getBusinessAssetUrl(
        business.logo_url
      );

    if (logoUrl) {
      logoDataUrl =
        await imageUrlToDataUrl(
          logoUrl
        );
    }
  }

  if (
    business.receipt_show_stamp &&
    business.stamp_url
  ) {
    const stampUrl =
      await getBusinessAssetUrl(
        business.stamp_url
      );

    if (stampUrl) {
      stampDataUrl =
        await imageUrlToDataUrl(
          stampUrl
        );
    }
  }

  /*
   * =========================================================
   * RECEIPT SIZE
   * =========================================================
   */

  const history =
    data.paymentHistory ??
    [];

  /*
   * Give receipts enough room for payment history,
   * contact information and optional payment instructions.
   */
  const estimatedHeight =
    Math.max(
      220,
      220 +
        Math.max(
          0,
          history.length - 3
        ) *
          8
    );

  const doc =
    new jsPDF({
      orientation:
        "portrait",
      unit: "mm",
      format: [
        80,
        estimatedHeight,
      ],
      compress: true,
    });

  doc.setProperties({
    title: `${business.receipt_business_name} Payment Receipt ${data.receiptNumber}`,
    subject:
      "Payment Receipt",
    author:
      business.receipt_business_name,
    creator:
      "Sauti Tamu",
  });

  let y = 7;

  /*
   * =========================================================
   * BUSINESS HEADER
   * =========================================================
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
   * Business name.
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
        y +
          index * 4.5,
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
   * Contact information.
   */

  const contactParts =
    [
      business.phone,
      business.whatsapp_number &&
      business.whatsapp_number !==
        business.phone
        ? `WhatsApp ${business.whatsapp_number}`
        : null,
      business.email,
    ].filter(Boolean);

  if (
    contactParts.length >
    0
  ) {
    y =
      drawWrappedText(
        doc,
        contactParts.join(
          " · "
        ),
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

  if (
    business.website
  ) {
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
   * Address from booking settings.
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

  y += 3;

  /*
   * =========================================================
   * RECEIPT TITLE
   * =========================================================
   */

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
    `Receipt No. ${data.receiptNumber}`,
    72,
    y,
    6.5,
    GRAY,
    "normal",
    "right"
  );

  y += 6;

  drawLine(
    doc,
    y
  );

  y += 7;

  /*
   * =========================================================
   * RECEIVED FROM
   * =========================================================
   */

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

  if (
    data.studentEmail
  ) {
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

  if (
    data.studentPhone
  ) {
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

  drawLine(
    doc,
    y
  );

  y += 7;

  /*
   * =========================================================
   * PROGRAMME
   * =========================================================
   */

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

  drawLine(
    doc,
    y
  );

  y += 7;

  /*
   * =========================================================
   * PAYMENT PROGRESS
   * =========================================================
   */

  y =
    sectionLabel(
      doc,
      "Payment Progress",
      y
    );

  if (
    history.length >
    0
  ) {
    history.forEach(
      (
        payment,
        index
      ) => {
        const isCurrent =
          index ===
          history.length -
            1;

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
          label:
            "Payment made",
          amount:
            data.amountPaid,
          date:
            data.paymentDate,
          method:
            data.paymentMethod,
          reference:
            data.reference,
        },
        0,
        y,
        currency,
        true
      );
  }

  y += 2;

  /*
   * =========================================================
   * BALANCE CALCULATION
   * =========================================================
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

  drawLine(
    doc,
    y
  );

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

  drawLine(
    doc,
    y
  );

  y += 7;

  /*
   * =========================================================
   * PAYMENT INFORMATION
   * =========================================================
   */

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
    safeText(
      data.paymentMethod
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

  if (
    data.reference
  ) {
    setText(
      doc,
      "Reference",
      8,
      y,
      7,
      GRAY
    );

    let reference =
      safeText(
        data.reference
      );

    if (
      reference.length >
      22
    ) {
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

  /*
   * =========================================================
   * PAYMENT INSTRUCTIONS
   * =========================================================
   */

  if (
    business.payment_instructions
  ) {
    y += 3;

    drawLine(
      doc,
      y
    );

    y += 6;

    y =
      sectionLabel(
        doc,
        "Payment Instructions",
        y
      );

    y =
      drawWrappedText(
        doc,
        business.payment_instructions,
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
   * E-STAMP
   * =========================================================
   */

  if (
    business.receipt_show_stamp &&
    stampDataUrl
  ) {
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
  }

  y += 3;

  drawLine(
    doc,
    y
  );

  y += 8;

  /*
   * =========================================================
   * FOOTER
   * =========================================================
   */

  if (
    business.receipt_footer
  ) {
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

  /*
   * Small business contact footer.
   */

  const footerContact =
    [
      business.phone,
      business.email,
    ].filter(Boolean);

  if (
    footerContact.length >
    0
  ) {
    y =
      drawWrappedText(
        doc,
        footerContact.join(
          " · "
        ),
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

  /*
   * =========================================================
   * DOWNLOAD
   * =========================================================
   */

  doc.save(
    `${business.receipt_business_name || business.business_name || "Payment"}-Receipt-${data.receiptNumber}.pdf`
  );
}

export default generatePaymentReceipt;