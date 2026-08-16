import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { supabase } from "@/lib/supabase";

const resend = new Resend(
  process.env.RESEND_API_KEY
);

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("en-KE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Nairobi",
  }).format(new Date(dateString));
}

function formatTime(dateString: string) {
  return new Intl.DateTimeFormat("en-KE", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Africa/Nairobi",
  }).format(new Date(dateString));
}

function formatTimeRange(
  startsAt: string,
  endsAt: string
) {
  return `${formatTime(startsAt)} – ${formatTime(
    endsAt
  )}`;
}

export async function POST(
  request: NextRequest
) {
  try {
    const body = await request.json();

    const {
      slotId,
      fullName,
      email,
      whatsappNumber,
    } = body;

    /*
     * Validate the request.
     */

    if (!slotId) {
      return NextResponse.json(
        {
          success: false,
          error: "Lesson slot is required.",
        },
        { status: 400 }
      );
    }

    if (!fullName?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Full name is required.",
        },
        { status: 400 }
      );
    }

    if (!email?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Email address is required.",
        },
        { status: 400 }
      );
    }

    if (!whatsappNumber?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error:
            "WhatsApp number is required.",
        },
        { status: 400 }
      );
    }

    /*
     * Create the booking atomically in Supabase.
     *
     * The database function:
     * - claims the slot
     * - creates the lead
     * - creates the booking
     */

    const {
      data: bookingResult,
      error: bookingError,
    } = await supabase.rpc(
      "create_trial_booking",
      {
        p_slot_id: slotId,
        p_full_name: fullName.trim(),
        p_email: email.trim(),
        p_whatsapp_number:
          whatsappNumber.trim(),
      }
    );

    if (bookingError) {
      console.error(
        "Booking RPC error:",
        bookingError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            bookingError.message ||
            "Unable to create booking.",
        },
        { status: 409 }
      );
    }

    if (
      !bookingResult ||
      bookingResult.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Booking could not be created.",
        },
        { status: 500 }
      );
    }

    const booking =
      bookingResult[0];

    /*
     * Get the complete booking information.
     *
     * We use the database records rather than trusting
     * values supplied by the browser.
     */

    const { data: bookingDetails, error: detailsError } =
      await supabase
        .from("bookings")
        .select(
          `
          id,
          lead_id,
          slot_id,
          instrument,
          status,
          created_at
        `
        )
        .eq("id", booking.booking_id)
        .single();

    if (detailsError || !bookingDetails) {
      console.error(
        "Booking details error:",
        detailsError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Booking was created, but its details could not be loaded.",
        },
        { status: 500 }
      );
    }

    /*
     * Send customer confirmation email.
     */

    const customerEmail =
      await resend.emails.send({
        from:
          "Sauti Tamu Piano Center <onboarding@resend.dev>",

        to: [email.trim()],

        subject:
          "🎹 Your Sauti Tamu trial lesson is confirmed",

        html: `
          <div style="font-family:Arial,sans-serif;background:#f5f5f5;padding:40px 20px;">
            
            <div style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;">
              
              <div style="background:#C62828;color:#ffffff;padding:28px;">
                
                <div style="font-size:14px;font-weight:800;letter-spacing:2px;">
                  SAUTI TAMU
                </div>

                <div style="font-size:10px;margin-top:5px;letter-spacing:2px;opacity:.8;">
                  PIANO CENTER
                </div>

              </div>

              <div style="padding:32px;">

                <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;color:#C62828;">
                  TRIAL LESSON CONFIRMED
                </div>

                <h1 style="font-size:28px;color:#1F2933;margin:12px 0 10px;">
                  Your lesson is confirmed, ${fullName.trim()}.
                </h1>

                <p style="font-size:14px;line-height:1.7;color:#5B6573;">
                  Thank you for booking your free trial lesson with Sauti Tamu Piano Center.
                  We look forward to welcoming you.
                </p>

                <div style="margin-top:25px;background:#f7f7f7;border-radius:16px;padding:22px;">

                  <div style="font-size:10px;font-weight:700;letter-spacing:1.2px;color:#888888;">
                    YOUR TRIAL LESSON
                  </div>

                  <div style="font-size:22px;font-weight:800;color:#1F2933;margin-top:8px;">
                    ${booking.instrument === "piano" ? "Piano" : "Guitar"}
                  </div>

                  <div style="font-size:14px;color:#333333;margin-top:18px;">
                    📅 ${formatDate(booking.starts_at)}
                  </div>

                  <div style="font-size:22px;font-weight:800;color:#C62828;margin-top:8px;">
                    ${formatTimeRange(
                      booking.starts_at,
                      booking.ends_at
                    )}
                  </div>

                  <div style="font-size:11px;color:#777777;margin-top:6px;">
                    60-minute free trial lesson
                  </div>

                </div>

                <div style="margin-top:22px;padding:20px;border:1px solid #eeeeee;border-radius:14px;">

                  <div style="font-size:10px;font-weight:700;letter-spacing:1px;color:#C62828;">
                    LOCATION
                  </div>

                  <div style="font-size:14px;font-weight:700;color:#1F2933;margin-top:7px;">
                    Sauti Tamu Piano Center
                  </div>

                  <div style="font-size:13px;line-height:1.6;color:#5B6573;margin-top:4px;">
                    Junction Trade Center<br/>
                    4th Floor, Room F401<br/>
                    Above Equity Bank Tearoom Branch<br/>
                    Nairobi CBD
                  </div>

                </div>

                <div style="margin-top:24px;background:#fff7f7;border-radius:14px;padding:18px;">

                  <div style="font-size:12px;font-weight:700;color:#1F2933;">
                    Please arrive a few minutes early.
                  </div>

                  <div style="font-size:12px;line-height:1.6;color:#666666;margin-top:5px;">
                    If you need to make any changes to your booking,
                    please contact Sauti Tamu before your lesson.
                  </div>

                </div>

                <div style="margin-top:30px;padding-top:20px;border-top:1px solid #eeeeee;font-size:11px;color:#999999;">
                  Sauti Tamu Piano Center
                </div>

              </div>

            </div>

          </div>
        `,
      });

    /*
     * Send admin notification email.
     */

    const adminEmail =
      process.env.RESEND_ADMIN_EMAIL;

    let adminEmailResult = null;

    if (adminEmail) {
      adminEmailResult =
        await resend.emails.send({
          from:
            "Sauti Tamu Booking <onboarding@resend.dev>",

          to: [adminEmail],

          subject:
            `🔔 New trial booking — ${fullName.trim()} · ${
              booking.instrument === "piano"
                ? "Piano"
                : "Guitar"
            } · ${formatTime(
              booking.starts_at
            )}`,

          html: `
            <div style="font-family:Arial,sans-serif;background:#f5f5f5;padding:40px 20px;">

              <div style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;">

                <div style="background:#C62828;color:#ffffff;padding:26px;">

                  <div style="font-size:13px;font-weight:800;letter-spacing:2px;">
                    SAUTI TAMU
                  </div>

                  <div style="font-size:10px;margin-top:5px;letter-spacing:2px;opacity:.8;">
                    NEW TRIAL BOOKING
                  </div>

                </div>

                <div style="padding:30px;">

                  <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;color:#C62828;">
                    NEW BOOKING
                  </div>

                  <h1 style="font-size:28px;color:#1F2933;margin:10px 0 24px;">
                    ${fullName.trim()}
                  </h1>

                  <div style="background:#f7f7f7;border-radius:16px;padding:22px;">

                    <div style="font-size:10px;font-weight:700;letter-spacing:1px;color:#888888;">
                      TRIAL LESSON
                    </div>

                    <div style="font-size:20px;font-weight:800;color:#1F2933;margin-top:7px;">
                      ${
                        booking.instrument ===
                        "piano"
                          ? "🎹 Piano"
                          : "🎸 Guitar"
                      }
                    </div>

                    <div style="font-size:14px;color:#333333;margin-top:16px;">
                      📅 ${formatDate(booking.starts_at)}
                    </div>

                    <div style="font-size:22px;font-weight:800;color:#C62828;margin-top:7px;">
                      ${formatTimeRange(
                        booking.starts_at,
                        booking.ends_at
                      )}
                    </div>

                  </div>

                  <div style="margin-top:22px;">

                    <div style="font-size:10px;font-weight:700;letter-spacing:1px;color:#C62828;">
                      CUSTOMER DETAILS
                    </div>

                    <div style="margin-top:12px;font-size:13px;line-height:1.9;color:#4B5563;">
                      <strong>Name:</strong> ${fullName.trim()}<br/>
                      <strong>Email:</strong> ${email.trim()}<br/>
                      <strong>WhatsApp:</strong> ${whatsappNumber.trim()}<br/>
                      <strong>Instrument:</strong> ${
                        booking.instrument ===
                        "piano"
                          ? "Piano"
                          : "Guitar"
                      }
                    </div>

                  </div>

                  <div style="margin-top:22px;padding:16px;border-radius:12px;background:#fff7f7;">

                    <div style="font-size:12px;font-weight:700;color:#1F2933;">
                      Booking status: CONFIRMED
                    </div>

                    <div style="font-size:11px;color:#777777;margin-top:4px;">
                      Booking ID: ${booking.booking_id}
                    </div>

                  </div>

                  <div style="margin-top:28px;padding-top:18px;border-top:1px solid #eeeeee;font-size:11px;color:#999999;">
                    Sauti Tamu Piano Center — Admin Notification
                  </div>

                </div>

              </div>

            </div>
          `,
        });
    }

    /*
     * Check whether customer email succeeded.
     *
     * We don't mark confirmation_sent_at if the
     * customer email failed.
     */

    if (customerEmail.error) {
      console.error(
        "Customer confirmation email failed:",
        customerEmail.error
      );

      return NextResponse.json(
        {
          success: true,
          bookingCreated: true,
          confirmationSent: false,
          adminNotificationSent:
            !adminEmailResult?.error,
          warning:
            "Booking was created, but the customer confirmation email could not be sent.",
        }
      );
    }

    /*
     * Mark the confirmation as sent.
     */

    const { error: timestampError } =
      await supabase
        .from("bookings")
        .update({
          confirmation_sent_at:
            new Date().toISOString(),
        })
        .eq("id", booking.booking_id);

    if (timestampError) {
      console.error(
        "Confirmation timestamp error:",
        timestampError
      );
    }

    /*
     * Return success.
     */

    return NextResponse.json({
      success: true,
      bookingCreated: true,
      confirmationSent: true,
      adminNotificationSent:
        !adminEmailResult?.error,
      bookingId: booking.booking_id,
    });

  } catch (error) {
    console.error(
      "Booking confirmation API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Something went wrong while confirming the booking.",
      },
      { status: 500 }
    );
  }
}