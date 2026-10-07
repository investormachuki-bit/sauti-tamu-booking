import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

type ReceiptPayload = {
  receiptNumber: string;
  studentName: string;
  studentEmail: string;
  programmeName: string;
  amountPaid: number;
  paymentDate: string;
  paymentMethod: string;
  balanceAfterPayment: number;
  fileName: string;
  base64: string;
};

export async function POST(request: Request) {
  try {
    if (!process.env.RESEND_API_KEY) {
      return Response.json(
        { success: false, error: "RESEND_API_KEY is not configured." },
        { status: 500 }
      );
    }

    const payload = (await request.json()) as Partial<ReceiptPayload>;

    if (
      !payload.studentEmail ||
      !payload.studentName ||
      !payload.receiptNumber ||
      !payload.fileName ||
      !payload.base64
    ) {
      return Response.json(
        { success: false, error: "Incomplete receipt payload." },
        { status: 400 }
      );
    }

    const from =
      process.env.RESEND_FROM ||
      "Sauti Tamu Piano Center <onboarding@resend.dev>";

    const { data, error } = await resend.emails.send({
      from,
      to: [payload.studentEmail],
      subject: `Sauti Tamu Payment Receipt ${payload.receiptNumber}`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.7;color:#1f2933">
          <h2 style="margin-bottom:8px">Payment Receipt</h2>
          <p>Dear ${payload.studentName},</p>
          <p>Thank you for your payment to Sauti Tamu Piano Center.</p>
          <p>
            <strong>Receipt No:</strong> ${payload.receiptNumber}<br/>
            <strong>Programme:</strong> ${payload.programmeName || "Music Training"}<br/>
            <strong>Amount received:</strong> KSh ${Number(payload.amountPaid || 0).toLocaleString("en-KE")}<br/>
            <strong>Payment date:</strong> ${payload.paymentDate}<br/>
            <strong>Payment method:</strong> ${payload.paymentMethod || "—"}<br/>
            <strong>Balance after payment:</strong> KSh ${Number(payload.balanceAfterPayment || 0).toLocaleString("en-KE")}
          </p>
          <p>The official receipt is attached to this email.</p>
          <p>Sauti Tamu Piano Center</p>
        </div>
      `,
      attachments: [
        {
          filename: payload.fileName,
          content: payload.base64,
        },
      ],
    });

    if (error) {
      console.error("Receipt email error:", error);
      return Response.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return Response.json({ success: true, data });
  } catch (error) {
    console.error("Receipt sharing error:", error);
    return Response.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to share receipt.",
      },
      { status: 500 }
    );
  }
}
