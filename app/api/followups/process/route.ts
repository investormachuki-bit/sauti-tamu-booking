import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseServer } from "@/lib/supabase-server";

const resend = new Resend(
  process.env.RESEND_API_KEY
);

const NAIROBI_TIME_ZONE = "Africa/Nairobi";

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("en-KE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: NAIROBI_TIME_ZONE,
  }).format(new Date(dateString));
}

function formatTime(dateString: string) {
  return new Intl.DateTimeFormat("en-KE", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: NAIROBI_TIME_ZONE,
  }).format(new Date(dateString));
}

function getInstrumentName(instrument: string) {
  return instrument.toLowerCase() === "piano"
    ? "Piano"
    : "Guitar";
}

function getReminderTitle(taskType: string) {
  switch (taskType) {
    case "trial_reminder_7d":
      return "Your trial lesson is coming up in 7 days";

    case "trial_reminder_3d":
      return "Your trial lesson is coming up in 3 days";

    case "trial_reminder_24h":
      return "Your trial lesson is tomorrow";

    case "trial_reminder_6h":
      return "Your trial lesson is coming up in 6 hours";

    case "trial_reminder_1h":
      return "Your trial lesson starts in 1 hour";

    default:
      return "Reminder about your Sauti Tamu trial lesson";
  }
}

function getReminderLabel(taskType: string) {
  switch (taskType) {
    case "trial_reminder_7d":
      return "7-DAY REMINDER";

    case "trial_reminder_3d":
      return "3-DAY REMINDER";

    case "trial_reminder_24h":
      return "24-HOUR REMINDER";

    case "trial_reminder_6h":
      return "6-HOUR REMINDER";

    case "trial_reminder_1h":
      return "1-HOUR REMINDER";

    default:
      return "TRIAL LESSON REMINDER";
  }
}

export async function GET(request: NextRequest) {
  return processFollowups(request);
}

export async function POST(request: NextRequest) {
  return processFollowups(request);
}

async function processFollowups(request: NextRequest) {
  try {
    /*
     * --------------------------------------------------
     * SECURITY
     * --------------------------------------------------
     */

    const cronSecret =
      process.env.FOLLOWUP_CRON_SECRET;

    if (!cronSecret) {
      console.error(
        "Missing FOLLOWUP_CRON_SECRET"
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Follow-up processor is not configured.",
        },
        { status: 500 }
      );
    }

    const authorization =
      request.headers.get("authorization");

    const providedSecret =
      authorization?.startsWith("Bearer ")
        ? authorization.substring(7)
        : null;

    if (
      !providedSecret ||
      providedSecret !== cronSecret
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    /*
     * --------------------------------------------------
     * EMAIL CONFIGURATION
     * --------------------------------------------------
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

    /*
     * --------------------------------------------------
     * FIND DUE EMAIL REMINDERS
     * --------------------------------------------------
     */

    const now =
      new Date().toISOString();

    const {
      data: tasks,
      error: taskError,
    } = await supabaseServer
      .from("follow_up_tasks")
      .select(
        `
          id,
          lead_id,
          booking_id,
          task_type,
          due_at,
          status,
          channel,
          message_template
        `
      )
      .eq("status", "pending")
      .eq("channel", "email")
      .lte("due_at", now)
      .in("task_type", [
        "trial_reminder_7d",
        "trial_reminder_3d",
        "trial_reminder_24h",
        "trial_reminder_6h",
        "trial_reminder_1h",
      ])
      .order("due_at", {
        ascending: true,
      })
      .limit(20);

    if (taskError) {
      console.error(
        "Follow-up task query error:",
        taskError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Could not load due follow-ups.",
        },
        { status: 500 }
      );
    }

    if (!tasks || tasks.length === 0) {
      return NextResponse.json({
        success: true,
        message:
          "No due follow-ups found.",
        processed: 0,
        sent: 0,
        failed: 0,
      });
    }

    /*
     * --------------------------------------------------
     * PROCESS EACH REMINDER
     * --------------------------------------------------
     */

    let sent = 0;
    let failed = 0;

    const results: Array<{
      taskId: string;
      status: "sent" | "failed";
      error?: string;
    }> = [];

    for (const task of tasks) {
      try {
        /*
         * ------------------------------------------------
         * LOAD LEAD
         * ------------------------------------------------
         */

        const {
          data: lead,
          error: leadError,
        } = await supabaseServer
          .from("leads")
          .select(
            `
              id,
              full_name,
              email,
              whatsapp_number
            `
          )
          .eq("id", task.lead_id)
          .single();

        if (leadError || !lead) {
          throw new Error(
            "Lead could not be found."
          );
        }

        if (
          !lead.email ||
          !lead.email.trim()
        ) {
          throw new Error(
            "Lead does not have an email address."
          );
        }

        /*
         * ------------------------------------------------
         * LOAD BOOKING
         * ------------------------------------------------
         */

        let booking:
          | {
              id: string;
              instrument: string;
              status: string;
              slot_id: string;
            }
          | null = null;

        let slot:
          | {
              id: string;
              starts_at: string;
              ends_at: string;
            }
          | null = null;

        if (task.booking_id) {
          const {
            data: bookingData,
            error: bookingError,
          } = await supabaseServer
            .from("bookings")
            .select(
              `
                id,
                instrument,
                status,
                slot_id
              `
            )
            .eq("id", task.booking_id)
            .single();

          if (
            bookingError ||
            !bookingData
          ) {
            throw new Error(
              "Booking could not be found."
            );
          }

          booking = bookingData;

          /*
           * Cancelled / no-show bookings should
           * never receive future reminders.
           */

          if (
            booking.status === "cancelled" ||
            booking.status === "no_show"
          ) {
            await supabaseServer
              .from("follow_up_tasks")
              .update({
                status: "cancelled",
                updated_at:
                  new Date().toISOString(),
              })
              .eq("id", task.id);

            results.push({
              taskId: task.id,
              status: "failed",
              error:
                "Booking is cancelled or marked as no-show.",
            });

            continue;
          }

          /*
           * Load lesson slot.
           */

          const {
            data: slotData,
            error: slotError,
          } = await supabaseServer
            .from("lesson_slots")
            .select(
              `
                id,
                starts_at,
                ends_at
              `
            )
            .eq(
              "id",
              booking.slot_id
            )
            .single();

          if (
            slotError ||
            !slotData
          ) {
            throw new Error(
              "Lesson slot could not be found."
            );
          }

          slot = slotData;
        }

        /*
         * ------------------------------------------------
         * BUILD EMAIL CONTENT
         * ------------------------------------------------
         */

        const instrumentName =
          booking
            ? getInstrumentName(
                booking.instrument
              )
            : "Trial Lesson";

        const dateText =
          slot
            ? formatDate(
                slot.starts_at
              )
            : "";

        const timeText =
          slot
            ? `${formatTime(
                slot.starts_at
              )} – ${formatTime(
                slot.ends_at
              )}`
            : "";

        const reminderTitle =
          getReminderTitle(
            task.task_type
          );

        const reminderLabel =
          getReminderLabel(
            task.task_type
          );

        /*
         * ------------------------------------------------
         * SEND EMAIL
         * ------------------------------------------------
         */

        const emailResult =
          await resend.emails.send({
       
              from:
  "Sauti Tamu Piano Center <noreply@sautitamupianocenter.co.ke>",

            to: [
              lead.email.trim(),
            ],

            subject:
              `🎹 ${reminderTitle}`,

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
                      ${reminderLabel}
                    </div>

                    <h1 style="font-size:28px;line-height:1.25;color:#1F2933;margin:12px 0 12px;">
                      ${reminderTitle}
                    </h1>

                    <p style="font-size:14px;line-height:1.7;color:#5B6573;margin:0;">
                      Hello ${lead.full_name},
                    </p>

                    <p style="font-size:14px;line-height:1.7;color:#5B6573;margin:12px 0 0;">
                      This is a friendly reminder about your
                      free ${instrumentName} trial lesson
                      at Sauti Tamu Piano Center.
                    </p>

                    <div style="margin-top:26px;background:#f7f7f7;border-radius:16px;padding:22px;">

                      <div style="font-size:10px;font-weight:700;letter-spacing:1.2px;color:#888888;">
                        YOUR TRIAL LESSON
                      </div>

                      <div style="font-size:23px;font-weight:800;color:#1F2933;margin-top:8px;">
                        ${instrumentName}
                      </div>

                      <div style="font-size:14px;color:#333333;margin-top:18px;">
                        📅 ${dateText}
                      </div>

                      <div style="font-size:23px;font-weight:800;color:#C62828;margin-top:8px;">
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
                        Please arrive 10 minutes early.
                      </div>

                      <div style="font-size:12px;line-height:1.6;color:#666666;margin-top:5px;">
                        We look forward to welcoming you
                        and helping you get started with your
                        musical journey.
                      </div>

                    </div>

                    <div style="margin-top:30px;padding-top:20px;border-top:1px solid #eeeeee;font-size:11px;line-height:1.6;color:#999999;">
                      Sauti Tamu Piano Center<br/>
                      Junction Trade Center, Nairobi CBD<br/>
                      Kenya
                    </div>

                  </div>

                </div>

              </div>
            `,
          });

        /*
         * ------------------------------------------------
         * CHECK RESEND RESULT
         * ------------------------------------------------
         */

        if (emailResult.error) {
          throw new Error(
            emailResult.error.message ||
              "Resend failed to send the email."
          );
        }

        /*
         * ------------------------------------------------
         * MARK TASK SENT
         * ------------------------------------------------
         */

        const {
          error: updateError,
        } = await supabaseServer
          .from("follow_up_tasks")
          .update({
            status: "sent",
            sent_at:
              new Date().toISOString(),
            updated_at:
              new Date().toISOString(),
          })
          .eq("id", task.id)
          .eq("status", "pending");

        if (updateError) {
          console.error(
            "Task status update failed after email was sent:",
            updateError
          );

          throw new Error(
            "Email was sent but the reminder status could not be updated."
          );
        }

        sent++;

        results.push({
          taskId: task.id,
          status: "sent",
        });

      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Unknown error";

        console.error(
          `Follow-up ${task.id} failed:`,
          error
        );

        await supabaseServer
          .from("follow_up_tasks")
          .update({
            updated_at:
              new Date().toISOString(),
          })
          .eq("id", task.id);

        failed++;

        results.push({
          taskId: task.id,
          status: "failed",
          error: errorMessage,
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: tasks.length,
      sent,
      failed,
      results,
    });

  } catch (error) {
    console.error(
      "Follow-up processor error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Follow-up processor failed.",
      },
      { status: 500 }
    );
  }
}