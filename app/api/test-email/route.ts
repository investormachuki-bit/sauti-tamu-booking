import { Resend } from "resend";

const resend = new Resend(
  process.env.RESEND_API_KEY
);

export async function GET() {
  try {
    const { data, error } =
      await resend.emails.send({
        from:
          "Sauti Tamu Piano Center <onboarding@resend.dev>",
        to: ["machukimuiruri123@gmail.com"],
        subject:
          "Sauti Tamu — Email System Test",
        html: `
          <div style="font-family: Arial, sans-serif; background:#f5f5f5; padding:40px 20px;">
            <div style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:18px; overflow:hidden;">

              <div style="background:#C62828; color:#ffffff; padding:28px;">
                <div style="font-size:13px; font-weight:700; letter-spacing:2px;">
                  SAUTI TAMU
                </div>

                <div style="font-size:10px; margin-top:5px; letter-spacing:2px; opacity:0.8;">
                  PIANO CENTER
                </div>
              </div>

              <div style="padding:32px;">

                <div style="font-size:10px; font-weight:700; letter-spacing:1.5px; color:#C62828; text-transform:uppercase;">
                  Email System Test
                </div>

                <h1 style="font-size:30px; color:#1F2933; margin:12px 0 10px;">
                  It works! 🎹
                </h1>

                <p style="font-size:15px; line-height:1.7; color:#5B6573;">
                  The Sauti Tamu booking system has successfully connected to Resend.
                </p>

                <div style="margin-top:24px; padding:20px; background:#f7f7f7; border-radius:14px;">

                  <div style="font-size:14px; font-weight:700; color:#1F2933;">
                    Email infrastructure connected
                  </div>

                  <div style="font-size:13px; line-height:1.6; color:#5B6573; margin-top:6px;">
                    We can now connect this system to real trial lesson confirmations and automated reminders.
                  </div>

                </div>

                <div style="margin-top:30px; padding-top:20px; border-top:1px solid #eeeeee; font-size:11px; color:#999999;">
                  Sauti Tamu Piano Center
                </div>

              </div>

            </div>
          </div>
        `,
      });

    if (error) {
      console.error(
        "Resend email error:",
        error
      );

      return Response.json(
        {
          success: false,
          error: error.message,
        },
        {
          status: 400,
        }
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
      {
        status: 500,
      }
    );
  }
}