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
  return instrument?.toLowerCase() === "piano"
    ? "Piano"
    : "Guitar";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildEmail(
  taskType: string,
  fullName: string,
  instrument: string,
  startsAt: string,
  endsAt: string
) {
  const cleanName = escapeHtml(fullName);
  const instrumentName =
    getInstrumentName(instrument);

  const dateText = formatDate(startsAt);
  const startTime = formatTime(startsAt);
  const endTime = formatTime(endsAt);

  let heading =
    "Your Sauti Tamu trial lesson is coming up";

  let message =
    "This is a friendly reminder about your upcoming free trial lesson.";

  if (taskType === "trial_reminder_24h") {
    heading =
      "Your trial lesson is tomorrow 🎹";

    message =
      "We’re looking forward to welcoming you to Sauti Tamu Piano Center tomorrow.";
  }

  if (taskType === "trial_reminder_2h") {
    heading =
      "Your trial lesson is in 2 hours 🎹";

    message =
      "Your free trial lesson is coming up shortly. We’re looking forward to seeing you.";
  }

  return `
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
            TRIAL LESSON REMINDER
          </div>

          <h1 style="font-size:28px;line-height:1.25;color:#1F2933;margin:12px 0;">
            ${heading}
          </h1>

          <p style="font-size:14px;line-height:1.7;color:#5B6573;margin:0;">
            Hello ${cleanName},
          </p>

          <p style="font-size:14px;line-height:1.7;color:#5B6573;margin-top:12px;">
            ${message}
          </p>

          <div style="margin-top:26px;background:#f7f7f7;border-radius:16px;padding:22px;">

            <div style="font-size:10px;font-weight:700;letter-spacing:1.2px;color:#888888;">
              YOUR FREE TRIAL LESSON
            </div>

            <div style="font-size:23px;font-weight:800;color:#1F2933;margin-top:8px;">
              ${instrumentName}
            </div>

            <div style="font-size:14px;color:#333333;margin-top:18px;">
              📅 ${dateText}
            </div>

            <div style="font-size:22px;font-weight:800;color:#C62828;margin-top:8px;">
              ${startTime} – ${endTime}
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
              If you need help before your lesson, please contact Sauti Tamu Piano Center.
            </div>

          </div>

          <div style="margin-top:30px;padding-top:20px;border-top:1px solid #eeeeee;font-size:11px;line-height:1.6;color:#999999;">
            Sauti Tamu Piano Center<br/>
            Nairobi, Kenya
          </div>

        </div>

      </div>

    </div>
  `;
}

export async function GET(
  request: NextRequest
) {
  try {
    /*
     * ----------------------------------------
     * SECURITY
     * ----------------------------------------
     */

    const cronSecret =
      process.env.FOLLOW_UP_CRON_SECRET;

    if (!cronSecret) {
      console.error(
        "FOLLOW_UP_CRON_SECRET is missing."
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

    if (
      authorization !==
      `Bearer ${cronSecret}`
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
     * ----------------------------------------
     * CONFIGURATION
     * ----------------------------------------
     */

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error:
            "RESEND_API_KEY is missing.",
        },
        { status: 500 }
      );
    }

    /*
     * ----------------------------------------
     * FIND DUE TASKS
     * ----------------------------------------
     *
     * Only process tasks that:
     *
     * - are pending
     * - are due now or overdue
     */

    const {
      data: tasks,
      error: tasksError,
    } = await supabaseServer
      .from("follow_up_tasks")
      .select(`
        id,
        lead_id,
        booking_id,
        task_type,
        due_at,
        status,
        channel,
        message_template,
        sent_at,
        completed_at,
        created_at,
        updated_at
      `)
      .eq("status", "pending")
      .lte(
        "due_at",
        new Date().toISOString()
      )
      .order("due_at", {
        ascending: true,
      })
      .limit(50);

    if (tasksError) {
      console.error(
        "Follow-up task query error:",
        tasksError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Could not load follow-up tasks.",
        },
        { status: 500 }
      );
    }

    if (!tasks || tasks.length === 0) {
      return NextResponse.json({
        success: true,
        message:
          "No follow-up tasks are currently due.",
        processed: 0,
      });
    }

    let processed = 0;
    let sent = 0;
    let failed = 0;
    let skipped = 0;

    /*
     * ----------------------------------------
     * PROCESS TASKS
     * ----------------------------------------
     */

    for (const task of tasks) {
      processed++;

      /*
       * --------------------------------------
       * EMAIL
       * --------------------------------------
       */

      if (task.channel === "email") {

        /*
         * Get lead.
         */

        const {
          data: lead,
          error: leadError,
        } = await supabaseServer
          .from("leads")
          .select(`
            id,
            full_name,
            email
          `)
          .eq(
            "id",
            task.lead_id
          )
          .single();

        if (
          leadError ||
          !lead
        ) {
          console.error(
            `Could not find lead for task ${task.id}:`,
            leadError
          );

          failed++;

          continue;
        }

        if (
          !lead.email ||
          !lead.email.trim()
        ) {
          console.warn(
            `Lead ${lead.id} has no email.`
          );

          skipped++;

          continue;
        }

        /*
         * Get booking and lesson slot.
         */

        let instrument =
          "piano";

        let startsAt =
          task.due_at;

        let endsAt =
          task.due_at;

        if (task.booking_id) {

          const {
            data: booking,
            error:
              bookingError,
          } = await supabaseServer
            .from("bookings")
            .select(`
              id,
              instrument,
              slot_id
            `)
            .eq(
              "id",
              task.booking_id
            )
            .single();

          if (
            bookingError ||
            !booking
          ) {
            console.error(
              `Could not find booking for task ${task.id}:`,
              bookingError
            );

            failed++;

            continue;
          }

          instrument =
            booking.instrument;

          const {
            data: slot,
            error:
              slotError,
          } = await supabaseServer
            .from("lesson_slots")
            .select(`
              starts_at,
              ends_at
            `)
            .eq(
              "id",
              booking.slot_id
            )
            .single();

          if (
            slotError ||
            !slot
          ) {
            console.error(
              `Could not find lesson slot for task ${task.id}:`,
              slotError
            );

            failed++;

            continue;
          }

          startsAt =
            slot.starts_at;

          endsAt =
            slot.ends_at;
        }

        /*
         * Determine email content.
         */

        let subject =
          "Sauti Tamu Piano Center — Trial Lesson Reminder";

        if (
          task.task_type ===
          "trial_reminder_24h"
        ) {
          subject =
            "🎹 Reminder — Your Sauti Tamu trial lesson is tomorrow";
        }

        if (
          task.task_type ===
          "trial_reminder_2h"
        ) {
          subject =
            "🎹 Reminder — Your Sauti Tamu trial lesson is in 2 hours";
        }

        /*
         * Send email.
         *
         * We use an idempotency key so a retry
         * cannot accidentally create duplicate
         * email sends for the same task.
         */

        const {
          error: emailError,
        } = await resend.emails.send(
          {
            from:
              "Sauti Tamu Piano Center <onboarding@resend.dev>",

            to: [
              lead.email.trim().toLowerCase(),
            ],

            subject,

            html: buildEmail(
              task.task_type,
              lead.full_name,
              instrument,
              startsAt,
              endsAt
            ),
          },
          {
            idempotencyKey:
              `follow-up-${task.id}`,
          }
        );

        if (emailError) {
          console.error(
            `Email failed for task ${task.id}:`,
            emailError
          );

          failed++;

          continue;
        }

        /*
         * Mark task as SENT.
         */

        const {
          error:
            updateError,
        } = await supabaseServer
          .from("follow_up_tasks")
          .update({
            status: "sent",
            sent_at:
              new Date().toISOString(),
            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            task.id
          )
          .eq(
            "status",
            "pending"
          );

        if (updateError) {
          console.error(
            `Could not update task ${task.id}:`,
            updateError
          );

          failed++;

          continue;
        }

        sent++;

        continue;
      }

      /*
       * --------------------------------------
       * WHATSAPP
       * --------------------------------------
       *
       * We are intentionally NOT pretending
       * WhatsApp has been sent yet.
       *
       * The WhatsApp API connection will be
       * added separately.
       */

      if (
        task.channel ===
        "whatsapp"
      ) {
        console.log(
          `WhatsApp task ${task.id} is due but WhatsApp API is not connected yet.`
        );

        skipped++;

        continue;
      }

      /*
       * --------------------------------------
       * UNKNOWN / MANUAL CHANNEL
       * --------------------------------------
       */

      console.warn(
        `Task ${task.id} has unsupported channel:`,
        task.channel
      );

      skipped++;
    }

    return NextResponse.json({
      success: true,
      processed,
      sent,
      failed,
      skipped,
      checkedAt:
        new Date().toISOString(),
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