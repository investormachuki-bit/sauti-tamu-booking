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
 * This file:
 *
 * 1. Loads the current receipt settings
 * 2. Loads the receipt assets
 * 3. Creates the PDF
 * 4. Draws all receipt sections
 * 5. Either:
 *
 *    - VIEW     → opens the PDF in a new browser tab
 *    - DOWNLOAD → downloads the PDF
 *
 * The actual receipt design lives inside /receipts.
 * =========================================================
 */

export type ReceiptAction =
  | "view"
  | "download";

export async function generatePaymentReceipt(
  data: PaymentReceiptData,
  action: ReceiptAction = "view"
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
   * 16. RECEIPT FILE NAME
   * =========================================================
   */

  const fileName =
    `${receiptBusinessName}-Receipt-${data.receiptNumber}.pdf`;

  /*
   * =========================================================
   * 17. VIEW / DOWNLOAD
   * =========================================================
   *
   * VIEW:
   * - Creates a Blob URL
   * - Opens the PDF in a new browser tab
   * - Does NOT call doc.save()
   *
   * DOWNLOAD:
   * - Uses jsPDF's save()
   */

  if (action === "view") {
    const pdfBlob =
      doc.output("blob");

    const blobUrl =
      URL.createObjectURL(
        pdfBlob
      );

    const receiptWindow =
      window.open(
        blobUrl,
        "_blank"
      );

    /*
     * If the browser blocks the new tab,
     * revoke later rather than immediately.
     */

    if (receiptWindow) {
      setTimeout(() => {
        URL.revokeObjectURL(
          blobUrl
        );
      }, 60_000);
    } else {
      /*
       * If popup is blocked, clean up
       * immediately.
       */

      URL.revokeObjectURL(
        blobUrl
      );

      throw new Error(
        "Please allow pop-ups to view the receipt."
      );
    }

    return;
  }

  /*
   * =========================================================
   * DOWNLOAD
   * =========================================================
   */

  doc.save(fileName);
}

export default generatePaymentReceipt;
