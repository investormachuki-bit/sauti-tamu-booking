import { Resend } from "resend";

const resend = new Resend(
  process.env.RESEND_API_KEY
);

export async function GET() {
  try {
    const { data, error } =
      await resend.emails.send({
        from: "Sauti Tamu Piano Center <onboarding@resend.dev>",
        to: ["marvelelectrical77@gmail.com"],
        subject:
          "Sauti Tamu — Email System Test",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px;">
            
            <div style="background:#C62828; color:white; padding:24px; border-radius:16px 16px 0 0;">
              <div style="font-size:12px; font-weight:bold; letter-spacing:2px;">
                SAUTI TAMU
              </div>
              <div style="font-size:10px; margin-top:5px; opacity:.8;">
                PIANO CENTER
              </div>
            </div>

            <div style="padding:30px; border:1px solid #eee; border-top:0; border-radius:0 0 16px 16px;">
              
              <p style="font-size:12px; color:#C62828; font-weight:bold; letter-spacing:1px;">
                EMAIL SYSTEM TEST
              </p>

              <h1 style="font-size:28px; color:#1F2933; margin-bottom:12px;">
                It works! 🎹
              </h1>

              <p style="font-size:15px; line-height:1.6; color:#5B6573;">
                The Sauti Tamu booking system can now send emails through Resend.
              </p>

              <div style="background:#F7F7F7; padding:18px; border-radius:12px; margin-top:24px;">
                <strong style="color:#1F2933;">
                  Email infrastructure is connected.
                </strong>
                <p style="font-size:13px; color:#5B6573; margin-bottom:0;">
                  We can now connect this to real trial lesson confirmations.
                </p>
              </div>

              <p style="font-size:11px; color:#999; margin-top:30px;">
                Sauti Tamu Piano Center
              </p>

            </div>

          </div>
        `,
      });

    if (error) {
      console.error("Resend error:", error);

      return Response.json(
        {
          success: false,
          error: error.message,
        },
        { status: 400 }
      );
    }

    return Response.json({
      success: true,
      message: "Test email sent successfully.",
      data,
    });
  } catch (error) {
    console.error(
      "Unexpected email error:",
      error
    );

    return Response.json(
      {
        success: false,
        error: "Unable to send test email.",
      },
      { status: 500 }
    );
  }
}