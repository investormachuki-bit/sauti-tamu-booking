import jsPDF from "jspdf";

import {
  PaymentReceiptData,
} from "./receipts/receipt-types";

import {
  loadReceiptSettings,
} from "./receipts/receipt-settings";

import {
  loadReceiptAssets,
} from "./receipts/receipt-assets";

import {
  drawReceiptHeader,
  drawReceiptTitle,
  drawStudentSection,
  drawProgrammeSection,
  drawPaymentProgress,
  drawBalanceSection,
  drawPaymentInformation,
  drawPaymentInstructions,
  drawReceiptStamp,
  drawReceiptFooter,
} from "./receipts/receipt-sections";

/*
 * =========================================================
 * PAYMENT RECEIPT GENERATOR
 * =========================================================
 *
 * Generates the receipt PDF and RETURNS the jsPDF document.
 *
 * IMPORTANT:
 *
 * This function does NOT automatically download the PDF.
 *
 * The caller decides whether to:
 *
 * - View
 * - Download
 * - Email
 *
 * This keeps receipt generation separate from receipt actions.
 * =========================================================
 */

export async function generatePaymentReceipt(
  data: PaymentReceiptData
): Promise<jsPDF> {
  /*
   * =========================================================
   * 1. LOAD CURRENT SAVED SETTINGS
   * =========================================================
   */

  const {
    business,
    address,
  } = await loadReceiptSettings();

  const currency =
    business.currency || "KES";

  /*
   * =========================================================
   * 2. LOAD LOGO + STAMP
   * =========================================================
   */

  const {
    logoDataUrl,
    stampDataUrl,
  } = await loadReceiptAssets(
    business.logo_url,
    business.stamp_url,
    business.receipt_show_logo,
    business.receipt_show_stamp
  );

  /*
   * =========================================================
   * 3. CALCULATE RECEIPT HEIGHT
   * =========================================================
   *
   * The previous version used a small fixed estimate.
   *
   * That could cause the lower sections, stamp or footer
   * to be placed beyond the actual PDF page.
   *
   * Give the receipt enough room based on payment history,
   * then add generous bottom space.
   */

  const history =
    data.paymentHistory ?? [];

  const historyHeight =
    Math.max(
      0,
      history.length - 3
    ) * 8;

  /*
   * Base receipt height + payment history growth
   * + stamp/footer safety space.
   */

  const estimatedHeight =
    Math.max(
      280,
      250 +
        historyHeight
    );

  /*
   * =========================================================
   * 4. CREATE PDF
   * =========================================================
   */

  const doc =
    new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [
        80,
        estimatedHeight,
      ],
      compress: true,
    });

  /*
   * =========================================================
   * 5. PDF METADATA
   * =========================================================
   */

  const receiptBusinessName =
    business.receipt_business_name ||
    business.business_name ||
    "Sauti Tamu Piano Center";

  doc.setProperties({
    title:
      `${receiptBusinessName} Payment Receipt ${data.receiptNumber}`,

    subject:
      "Payment Receipt",

    author:
      receiptBusinessName,

    creator:
      "Sauti Tamu",
  });

  /*
   * =========================================================
   * 6. DRAW RECEIPT
   * =========================================================
   */

  let y = 7;

  y =
    drawReceiptHeader(
      doc,
      business,
      address,
      logoDataUrl,
      y
    );

  y =
    drawReceiptTitle(
      doc,
      data.receiptNumber,
      y
    );

  y =
    drawStudentSection(
      doc,
      data,
      y
    );

  y =
    drawProgrammeSection(
      doc,
      data,
      currency,
      y
    );

  y =
    drawPaymentProgress(
      doc,
      data,
      currency,
      y
    );

  y =
    drawBalanceSection(
      doc,
      data,
      currency,
      y
    );

  y =
    drawPaymentInformation(
      doc,
      data,
      y
    );

  y =
    drawPaymentInstructions(
      doc,
      business.payment_instructions,
      y
    );

  /*
   * =========================================================
   * 7. STAMP
   * =========================================================
   */

  if (
    business.receipt_show_stamp &&
    stampDataUrl
  ) {
    y =
      drawReceiptStamp(
        doc,
        stampDataUrl,
        y
      );
  }

  /*
   * =========================================================
   * 8. FOOTER
   * =========================================================
   */

  drawReceiptFooter(
    doc,
    business,
    y
  );

  /*
   * =========================================================
   * 9. RETURN PDF
   * =========================================================
   *
   * DO NOT doc.save() HERE.
   *
   * The caller decides what action to perform.
   */

  return doc;
}

export default generatePaymentReceipt;
