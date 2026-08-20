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

export type ReceiptAction =
  | "view"
  | "download";

export async function generatePaymentReceipt(
  data: PaymentReceiptData,
  action: ReceiptAction = "download"
) {
  /*
   * =========================================================
   * 1. LOAD SETTINGS
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
   * 2. LOAD ASSETS
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
   * 3. RECEIPT HEIGHT
   * =========================================================
   *
   * Give the receipt enough room for:
   * - payment history
   * - balance
   * - payment information
   * - instructions
   * - stamp
   * - footer
   */

  const history =
    data.paymentHistory ?? [];

  const estimatedHeight =
    Math.max(
      260,
      250 +
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
      format: [80, estimatedHeight],
      compress: true,
    });

  /*
   * =========================================================
   * 5. METADATA
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
   * 6. HEADER
   * =========================================================
   */

  y = drawReceiptHeader(
    doc,
    business,
    address,
    logoDataUrl,
    y
  );

  /*
   * =========================================================
   * 7. TITLE
   * =========================================================
   */

  y = drawReceiptTitle(
    doc,
    data.receiptNumber,
    y
  );

  /*
   * =========================================================
   * 8. STUDENT
   * =========================================================
   */

  y = drawStudentSection(
    doc,
    data,
    y
  );

  /*
   * =========================================================
   * 9. PROGRAMME
   * =========================================================
   */

  y = drawProgrammeSection(
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

  y = drawPaymentProgress(
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

  y = drawBalanceSection(
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

  y = drawPaymentInformation(
    doc,
    data,
    y
  );

  /*
   * =========================================================
   * 13. PAYMENT INSTRUCTIONS
   * =========================================================
   */

  y = drawPaymentInstructions(
    doc,
    business.payment_instructions,
    y
  );

  /*
   * =========================================================
   * 14. STAMP
   * =========================================================
   */

  y = drawReceiptStamp(
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
   * 16. FILE NAME
   * =========================================================
   */

  const fileName =
    `${receiptBusinessName}-Receipt-${data.receiptNumber}.pdf`;

  /*
   * =========================================================
   * 17. VIEW
   * =========================================================
   *
   * IMPORTANT:
   * Do NOT call doc.save() here.
   *
   * Convert the PDF to a Blob and open it in a
   * new browser tab.
   */

  if (action === "view") {
    const blob =
      doc.output("blob");

    const blobUrl =
      URL.createObjectURL(blob);

    const newWindow =
      window.open(
        blobUrl,
        "_blank"
      );

    /*
     * If the browser blocks the new tab,
     * revoke later anyway.
     */

    if (!newWindow) {
      console.warn(
        "Browser blocked the receipt preview window."
      );
    }

    setTimeout(() => {
      URL.revokeObjectURL(
        blobUrl
      );
    }, 60_000);

    return;
  }

  /*
   * =========================================================
   * 18. DOWNLOAD
   * =========================================================
   */

  doc.save(fileName);
}

export default generatePaymentReceipt;
