import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseServer } from "@/lib/supabase-server";

const resend = new Resend(
  process.env.RESEND_API_KEY
);

/*
 * ----------------------------------------
 * DATE / TIME HELPERS
 * ----------------------------------------
 */

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

function getInstrumentName(
  instrument: string
) {
  return instrument.toLowerCase() === "piano"
    ? "Piano"
    : "Guitar";
}

/*
 * ----------------------------------------
 * HTML ESCAPE
 * ----------------------------------------
 */

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/*
 * ----------------------------------------
 * POST
 * ----------------------------------------
 */

export async function POST(
  request: NextRequest
) {
  try {
    /*
     * --------------------------------------
     * SERVER CONFIGURATION
     * --------------------------------------
     */

    if (!process.env.RESEND_API_KEY) {
      console.error(
        "Missing RESEND_API_KEY"
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Email service is not configured.",
        },
        { status: 500 }
      );
    }

    const body = await request.json();

    const {
      slotId,
      fullName,
      email,
      whatsappNumber,
    } = body;

    /*
     * --------------------------------------
     * VALIDATION
     * --------------------------------------
     */

    if (!slotId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Lesson slot is required.",
        },
        { status: 400 }
      );
    }

    if (
      typeof fullName !== "string" ||
      !fullName.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Full name is required.",
        },
        { status: 400 }
      );
    }

    if (
      typeof email !== "string" ||
      !email.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Email address is required.",
        },
        { status: 400 }
      );
    }

    if (
      typeof whatsappNumber !== "string" ||
      !whatsappNumber.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "WhatsApp number is required.",
        },
        { status: 400 }
      );
    }

    const cleanName =
      fullName.trim();

    const cleanEmail =
      email.trim().toLowerCase();

    const cleanWhatsapp =
      whatsappNumber.trim();

    /*
     * Escaped versions are used only
     * inside HTML emails.
     */

    const emailName =
      escapeHtml(cleanName);

    const emailAddress =
      escapeHtml(cleanEmail);

    const emailWhatsapp =
      escapeHtml(cleanWhatsapp);

    /*
     * --------------------------------------
     * CREATE BOOKING ATOMICALLY
     * --------------------------------------
     */

    const {
      data: bookingResult,
      error: bookingError,
    } = await supabaseServer.rpc(
      "create_trial_booking",
      {
        p_slot_id: slotId,
        p_full_name: cleanName,
        p_email: cleanEmail,
        p_whatsapp_number:
          cleanWhatsapp,
      }
    );

    if (bookingError) {
      console.error(
        "Booking RPC error:",
        bookingError
      );

      const message =
        bookingError.message || "";

      if (
        message.includes(
          "no longer available"
        ) ||
        message.includes(
          "SLOT_ALREADY_BOOKED"
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            code: "SLOT_ALREADY_BOOKED",
            error:
              "Sorry, that time has just been booked. Please choose another.",
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error:
            "We couldn't create your booking. Please try again.",
        },
        { status: 500 }
      );
    }

    if (
      !bookingResult ||
      bookingResult.length === 0
    ) {
      console.error(
        "Booking RPC returned no data."
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "We couldn't confirm your booking. Please try again.",
        },
        { status: 500 }
      );
    }

    const booking =
      bookingResult[0];

    /*
     * --------------------------------------
     * GET AUTHORITATIVE BOOKING DETAILS
     * --------------------------------------
     */

    const {
      data: bookingDetails,
      error: detailsError,
    } = await supabaseServer
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
      .eq(
        "id",
        booking.booking_id
      )
      .single();

    if (
      detailsError ||
      !bookingDetails
    ) {
      console.error(
        "Booking details error:",
        detailsError
      );

      return NextResponse.json({
        success: true,
        bookingCreated: true,
        confirmationSent: false,
        adminNotificationSent: false,
        followUpsCreated: 0,
        warning:
          "Your booking was created, but we could not prepare the confirmation message.",
        bookingId:
          booking.booking_id,
      });
    }

    /*
     * --------------------------------------
     * AUTHORITATIVE DATE / TIME
     * --------------------------------------
     */

    const startsAt =
      booking.starts_at;

    const endsAt =
      booking.ends_at;

    const instrumentName =
      getInstrumentName(
        bookingDetails.instrument
      );

    const dateText =
      formatDate(startsAt);

    const timeText =
      formatTimeRange(
        startsAt,
        endsAt
      );

    /*
     * --------------------------------------
     * CUSTOMER CONFIRMATION EMAIL
     * --------------------------------------
     */

    const customerEmailResult =
      await resend.emails.send({
        from:
          "Sauti Tamu Piano Center <bookings@sautitamupianocenter.co.ke>",

        to: [cleanEmail],

        subject:
          `🎹 Your Sauti Tamu ${instrumentName} trial lesson is confirmed`,

        html: `
          <div style="margin:0;padding:40px 20px;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">

            <div style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;">

              <div style="background:#C62828;color:#ffffff;padding:28px 30px;">

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

                <h1 style="font-size:28px;line-height:1.2;color:#1F2933;margin:12px 0 12px;">
                  You’re booked, ${emailName}.
                </h1>

                <p style="font-size:14px;line-height:1.7;color:#5B6573;margin:0;">
                  Thank you for booking your free trial lesson with Sauti Tamu Piano Center.
                  We’re looking forward to welcoming you.
                </p>

                <div style="margin-top:26px;background:#f7f7f7;border-radius:16px;padding:22px;">

                  <div style="font-size:10px;font-weight:700;letter-spacing:1.2px;color:#888888;">
                    YOUR FREE TRIAL
                  </div>

                  <div style="font-size:23px;font-weight:800;color:#1F2933;margin-top:8px;">
                    ${instrumentName}
                  </div>

                  <div style="font-size:14px;color:#333333;margin-top:18px;">
                    📅 ${dateText}
                  </div>

                  <div style="font-size:24px;font-weight:800;color:#C62828;margin-top:8px;">
                    ${timeText}
                  </div>

                  <div style="font-size:11px;color:#777777;margin-top:7px;">
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

                  <div style="font-size:13px;line-height:1.7;color:#5B6573;margin-top:5px;">
                    Junction Trade Center<br/>
                    4th Floor, Room F401<br/>
                    Above Equity Bank Tearoom Branch<br/>
                    Nairobi CBD
                  </div>

                </div>

                <div style="margin-top:22px;background:#fff7f7;border-radius:14px;padding:18px;">

                  <div style="font-size:12px;font-weight:700;color:#1F2933;">
                    Please arrive a few minutes early.
                  </div>

                  <div style="font-size:12px;line-height:1.6;color:#666666;margin-top:5px;">
                    We’ll also send you reminders before your lesson.
                  </div>

                </div>

                <div style="margin-top:30px;padding-top:20px;border-top:1px solid #eeeeee;font-size:11px;line-height:1.6;color:#999999;">
                  Sauti Tamu Piano Center<br/>
                  Nairobi, Kenya
                </div>

              </div>

            </div>

          </div>
        `,
      });

    /*
     * --------------------------------------
     * ADMIN NOTIFICATION EMAIL
     * --------------------------------------
     */

    const adminEmail =
      process.env.RESEND_ADMIN_EMAIL;

    let adminEmailResult:
      | {
          data?: unknown;
          error?: {
            message?: string;
          } | null;
        }
      | null = null;

    if (adminEmail) {
      adminEmailResult =
        await resend.emails.send({
          from:
            "Sauti Tamu Booking <bookings@sautitamupianocenter.co.ke>",

          to: [adminEmail],

          subject:
            `🔔 New trial booking — ${cleanName} · ${instrumentName} · ${timeText}`,

          html: `
            <div style="margin:0;padding:40px 20px;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">

              <div style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;">

                <div style="background:#C62828;color:#ffffff;padding:26px 30px;">

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
                    ${emailName}
                  </h1>

                  <div style="background:#f7f7f7;border-radius:16px;padding:22px;">

                    <div style="font-size:10px;font-weight:700;letter-spacing:1px;color:#888888;">
                      TRIAL LESSON
                    </div>

                    <div style="font-size:21px;font-weight:800;color:#1F2933;margin-top:7px;">
                      ${
                        instrumentName ===
                        "Piano"
                          ? "🎹"
                          : "🎸"
                      }
                      ${instrumentName}
                    </div>

                    <div style="font-size:14px;color:#333333;margin-top:16px;">
                      📅 ${dateText}
                    </div>

                    <div style="font-size:23px;font-weight:800;color:#C62828;margin-top:7px;">
                      ${timeText}
                    </div>

                  </div>

                  <div style="margin-top:24px;">

                    <div style="font-size:10px;font-weight:700;letter-spacing:1px;color:#C62828;">
                      CUSTOMER DETAILS
                    </div>

                    <div style="margin-top:12px;font-size:13px;line-height:2;color:#4B5563;">

                      <strong>Name:</strong>
                      ${emailName}
                      <br/>

                      <strong>Email:</strong>
                      ${emailAddress}
                      <br/>

                      <strong>WhatsApp:</strong>
                      ${emailWhatsapp}
                      <br/>

                      <strong>Instrument:</strong>
                      ${instrumentName}

                    </div>

                  </div>

                  <div style="margin-top:22px;padding:16px;border-radius:12px;background:#fff7f7;">

                    <div style="font-size:12px;font-weight:700;color:#1F2933;">
                      Booking status: CONFIRMED
                    </div>

                    <div style="font-size:11px;color:#777777;margin-top:5px;">
                      Booking ID: ${bookingDetails.id}
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
    } else {
      console.warn(
        "RESEND_ADMIN_EMAIL is not configured."
      );
    }

    /*
     * --------------------------------------
     * EMAIL RESULTS
     * --------------------------------------
     */

    const customerEmailFailed =
      Boolean(customerEmailResult.error);

    const adminEmailFailed =
      Boolean(adminEmailResult?.error);

    if (customerEmailFailed) {
      console.error(
        "Customer confirmation email failed:",
        customerEmailResult.error
      );
    }

    if (adminEmailFailed) {
      console.error(
        "Admin notification email failed:",
        adminEmailResult?.error
      );
    }

    /*
     * --------------------------------------
     * RECORD CUSTOMER CONFIRMATION TIME
     * --------------------------------------
     */

    if (!customerEmailFailed) {
      const {
        error: timestampError,
      } = await supabaseServer
        .from("bookings")
        .update({
          confirmation_sent_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          bookingDetails.id
        );

      if (timestampError) {
        console.error(
          "Confirmation timestamp update failed:",
          timestampError
        );
      }
    }

    /*
     * ======================================
     * AUTOMATIC FOLLOW-UP TASKS
     * ======================================
     *
     * The email processor expects:
     *
     * trial_reminder_7d
     * trial_reminder_3d
     * trial_reminder_24h
     * trial_reminder_6h
     * trial_reminder_1h
     *
     * Therefore the task creation below uses
     * exactly those names and sets:
     *
     * channel = "email"
     */

    let followUpsCreated = 0;

    try {
      const now =
        new Date();

      const lessonStart =
        new Date(startsAt);

      const lessonEnd =
        new Date(endsAt);

      /*
       * --------------------------------------
       * REMINDER DEFINITIONS
       * --------------------------------------
       */

      const reminderDefinitions = [
        {
          task_type:
            "trial_reminder_7d",

          milliseconds:
            7 *
            24 *
            60 *
            60 *
            1000,

          message:
            `Reminder: ${cleanName} has a ${instrumentName} trial lesson scheduled in 7 days on ${dateText} at ${timeText}.`,
        },

        {
          task_type:
            "trial_reminder_3d",

          milliseconds:
            3 *
            24 *
            60 *
            60 *
            1000,

          message:
            `Reminder: ${cleanName} has a ${instrumentName} trial lesson scheduled in 3 days on ${dateText} at ${timeText}.`,
        },

        {
          task_type:
            "trial_reminder_24h",

          milliseconds:
            24 *
            60 *
            60 *
            1000,

          message:
            `Reminder: ${cleanName} has a ${instrumentName} trial lesson tomorrow at ${timeText}.`,
        },

        {
          task_type:
            "trial_reminder_6h",

          milliseconds:
            6 *
            60 *
            60 *
            1000,

          message:
            `Reminder: ${cleanName} has a ${instrumentName} trial lesson coming up in 6 hours at ${timeText}.`,
        },

        {
          task_type:
            "trial_reminder_1h",

          milliseconds:
            1 *
            60 *
            60 *
            1000,

          message:
            `Reminder: ${cleanName} has a ${instrumentName} trial lesson starting in 1 hour at ${timeText}.`,
        },
      ];

      /*
       * --------------------------------------
       * BUILD REMINDER TASKS
       * --------------------------------------
       */

      const reminderTasks =
        reminderDefinitions
          .map(
            (reminder) => {
              const dueAt =
                new Date(
                  lessonStart.getTime() -
                    reminder.milliseconds
                );

              return {
                lead_id:
                  bookingDetails.lead_id,

                booking_id:
                  bookingDetails.id,

                task_type:
                  reminder.task_type,

                due_at:
                  dueAt.toISOString(),

                status:
                  "pending",

                channel:
                  "email",

                message_template:
                  reminder.message,
              };
            }
          )
          .filter(
            (task) =>
              new Date(
                task.due_at
              ).getTime() >
              now.getTime()
          );

      /*
       * --------------------------------------
       * POST-TRIAL FOLLOW-UP
       * --------------------------------------
       */

      const postTrialDueAt =
        new Date(
          lessonEnd.getTime() +
            60 *
              60 *
              1000
        );

      if (
        postTrialDueAt.getTime() >
        now.getTime()
      ) {
        reminderTasks.push({
          lead_id:
            bookingDetails.lead_id,

          booking_id:
            bookingDetails.id,

          task_type:
            "post_trial_follow_up",

          due_at:
            postTrialDueAt.toISOString(),

          status:
            "pending",

          channel:
            "email",

          message_template:
            `Follow up with ${cleanName} after their ${instrumentName} trial lesson and discuss registration.`,
        });
      }

      /*
       * --------------------------------------
       * CHECK EXISTING TASKS
       * --------------------------------------
       *
       * This prevents duplicate reminders if
       * this endpoint is accidentally called
       * again for the same booking.
       */

      const {
        data: existingTasks,
        error:
          existingTasksError,
      } = await supabaseServer
        .from("follow_up_tasks")
        .select(
          "id, task_type"
        )
        .eq(
          "booking_id",
          bookingDetails.id
        );

      if (existingTasksError) {
        console.error(
          "Could not check existing follow-up tasks:",
          existingTasksError
        );
      } else {
        const existingTaskTypes =
          new Set(
            (
              existingTasks ||
              []
            ).map(
              (task) =>
                task.task_type
            )
          );

        const tasksToCreate =
          reminderTasks.filter(
            (task) =>
              !existingTaskTypes.has(
                task.task_type
              )
          );

        /*
         * ------------------------------------
         * INSERT NEW TASKS
         * ------------------------------------
         */

        if (
          tasksToCreate.length >
          0
        ) {
          const {
            error:
              followUpInsertError,
          } = await supabaseServer
            .from(
              "follow_up_tasks"
            )
            .insert(
              tasksToCreate
            );

          if (
            followUpInsertError
          ) {
            console.error(
              "Follow-up task creation failed:",
              followUpInsertError
            );
          } else {
            followUpsCreated =
              tasksToCreate.length;

            console.log(
              `Created ${tasksToCreate.length} follow-up task(s) for booking ${bookingDetails.id}`
            );

            console.log(
              "Follow-up task types:",
              tasksToCreate.map(
                (task) =>
                  task.task_type
              )
            );
          }
        } else {
          console.log(
            `No new follow-up tasks needed for booking ${bookingDetails.id}`
          );
        }
      }
    } catch (
      followUpError
    ) {
      /*
       * Follow-up failure must NEVER turn
       * a successful booking into a failed
       * booking.
       */

      console.error(
        "Unexpected follow-up creation error:",
        followUpError
      );
    }

    /*
     * --------------------------------------
     * RETURN ACTUAL RESULT
     * --------------------------------------
     */

    return NextResponse.json({
      success: true,

      bookingCreated: true,

      confirmationSent:
        !customerEmailFailed,

      adminNotificationSent:
        !adminEmailFailed &&
        Boolean(adminEmail),

      followUpsCreated,

      bookingId:
        bookingDetails.id,

      warning:
        customerEmailFailed
          ? "The booking was created, but the customer confirmation email could not be sent."
          : adminEmailFailed
          ? "The customer confirmation was sent, but the admin notification could not be sent."
          : undefined,
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