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
 * This file is intentionally kept small.
 *
 * It:
 * 1. Loads the CURRENT saved receipt settings
 * 2. Loads the logo/stamp according to those settings
 * 3. Creates the PDF
 * 4. Draws each receipt section
 * 5. Downloads the receipt
 *
 * The actual PDF design lives inside /receipts.
 * =========================================================
 */

export async function generatePaymentReceipt(
  data: PaymentReceiptData
) {
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
   *
   * IMPORTANT:
   * The visibility settings come directly from the
   * current business_settings record.
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
   * 3. DETERMINE RECEIPT HEIGHT
   * =========================================================
   */

  const history =
    data.paymentHistory ?? [];

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

  let y = 7;

  /*
   * =========================================================
   * 6. BUSINESS HEADER
   * =========================================================
   */

  y =
    drawReceiptHeader(
      doc,
      business,
      address,
      logoDataUrl,
      y
    );

  /*
   * =========================================================
   * 7. RECEIPT TITLE
   * =========================================================
   */

  y =
    drawReceiptTitle(
      doc,
      data.receiptNumber,
      y
    );

  /*
   * =========================================================
   * 8. STUDENT
   * =========================================================
   */

  y =
    drawStudentSection(
      doc,
      data,
      y
    );

  /*
   * =========================================================
   * 9. PROGRAMME
   * =========================================================
   */

  y =
    drawProgrammeSection(
      doc,
      data,
      currency,
      y
    );

  /*
   * =========================================================
   * 10. PAYMENT HISTORY
   * =========================================================
   */

  y =
    drawPaymentProgress(
      doc,
      data,
      currency,
      y
    );

  /*
   * =========================================================
   * 11. BALANCE
   * =========================================================
   */

  y =
    drawBalanceSection(
      doc,
      data,
      currency,
      y
    );

  /*
   * =========================================================
   * 12. PAYMENT INFORMATION
   * =========================================================
   */

  y =
    drawPaymentInformation(
      doc,
      data,
      y
    );

  /*
   * =========================================================
   * 13. PAYMENT INSTRUCTIONS
   * =========================================================
   */

  y =
    drawPaymentInstructions(
      doc,
      business.payment_instructions,
      y
    );

  /*
   * =========================================================
   * 14. STAMP
   * =========================================================
   */

  y =
    drawReceiptStamp(
      doc,
      stampDataUrl,
      y
    );

  /*
   * =========================================================
   * 15. FOOTER
   * =========================================================
   */

  drawReceiptFooter(
    doc,
    business,
    y
  );

  /*
   * =========================================================
   * 16. DOWNLOAD
   * =========================================================
   */

  doc.save(
    `${receiptBusinessName}-Receipt-${data.receiptNumber}.pdf`
  );
}

export default generatePaymentReceipt;