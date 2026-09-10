import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseServer } from "@/lib/supabase-server";
import { renderSautiTamuEmail } from "@/lib/email-template-renderer";

const resend = new Resend(process.env.RESEND_API_KEY);

const RESEND_FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ||
  "Sauti Tamu Piano Center <noreply@sautitamupianocenter.co.ke>";

const RESEND_ADMIN_EMAIL =
  process.env.RESEND_ADMIN_EMAIL ||
  process.env.ADMIN_EMAIL ||
  "sautitamupianocenter@gmail.com";

const AUTOMATED_EMAIL_TASK_TYPES = [
  "trial_reminder_7d",
  "trial_reminder_3d",
  "trial_reminder_24h",
  "trial_reminder_6h",
  "trial_reminder_1h",
  "trial_reminder_2h",
  "post_trial_follow_up",
] as const;

function templateKeyForTask(taskType: string) {
  switch (taskType) {
    case "trial_reminder_7d":
      return "trial_reminder_7d";
    case "trial_reminder_3d":
      return "trial_reminder_3d";
    case "trial_reminder_24h":
      return "trial_reminder_24h";
    case "trial_reminder_6h":
      return "trial_reminder_6h";
    case "trial_reminder_1h":
      return "trial_reminder_1h";
    case "trial_reminder_2h":
      // Historical task type: use the closest current reminder template
      // rather than failing solely because the old 2-hour template does not exist.
      return "trial_reminder_1h";
    case "post_trial_follow_up":
      return "attended_not_registered";
    default:
      return taskType;
  }
}

function errorResponse(message: string, status = 500) {
  return NextResponse.json(
    { success: false, error: message },
    { status }
  );
}

export async function GET(request: NextRequest) {
  return processFollowups(request);
}

export async function POST(request: NextRequest) {
  return processFollowups(request);
}

async function processFollowups(request: NextRequest) {
  try {
    const cronSecret = process.env.FOLLOWUP_CRON_SECRET;

    if (!cronSecret) {
      return errorResponse(
        "Follow-up processor is not configured.",
        500
      );
    }

    const authorization = request.headers.get("authorization");
    const providedSecret = authorization?.startsWith("Bearer ")
      ? authorization.substring(7)
      : null;

    if (!providedSecret || providedSecret !== cronSecret) {
      return errorResponse("Unauthorized.", 401);
    }

    if (!process.env.RESEND_API_KEY) {
      return errorResponse("Email service is not configured.", 500);
    }

    const now = new Date().toISOString();

    const { data: tasks, error: taskError } = await supabaseServer
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
      .in("task_type", [...AUTOMATED_EMAIL_TASK_TYPES])
      .order("due_at", { ascending: true })
      .limit(20);

    if (taskError) {
      console.error("Follow-up task query error:", taskError);
      return errorResponse(
        "Could not load due follow-ups.",
        500
      );
    }

    if (!tasks?.length) {
      return NextResponse.json({
        success: true,
        message: "No due follow-ups found.",
        processed: 0,
        sent: 0,
        failed: 0,
      });
    }

    let sent = 0;
    let failed = 0;

    const results: Array<{
      taskId: string;
      status: "sent" | "failed" | "cancelled";
      error?: string;
    }> = [];

    for (const task of tasks) {
      try {
        const { data: lead, error: leadError } = await supabaseServer
          .from("leads")
          .select("id, full_name, email, whatsapp_number")
          .eq("id", task.lead_id)
          .single();

        if (leadError || !lead) {
          throw new Error("Lead could not be found.");
        }

        if (!lead.email?.trim()) {
          throw new Error("Lead does not have an email address.");
        }

        let booking:
          | {
              id: string;
              lead_id: string;
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
          const { data: bookingData, error: bookingError } =
            await supabaseServer
              .from("bookings")
              .select(
                "id, lead_id, instrument, status, slot_id"
              )
              .eq("id", task.booking_id)
              .single();

          if (bookingError || !bookingData) {
            throw new Error("Booking could not be found.");
          }

          booking = bookingData;

          if (
            booking.status === "cancelled" ||
            booking.status === "no_show"
          ) {
            const { error: cancelError } = await supabaseServer
              .from("follow_up_tasks")
              .update({
                status: "cancelled",
                updated_at: new Date().toISOString(),
              })
              .eq("id", task.id)
              .eq("status", "pending");

            if (cancelError) {
              throw cancelError;
            }

            results.push({
              taskId: task.id,
              status: "cancelled",
            });
            continue;
          }

          const { data: slotData, error: slotError } =
            await supabaseServer
              .from("lesson_slots")
              .select("id, starts_at, ends_at")
              .eq("id", booking.slot_id)
              .single();

          if (slotError || !slotData) {
            throw new Error("Lesson slot could not be found.");
          }

          slot = slotData;
        }

        const templateKey = templateKeyForTask(task.task_type);

        const rendered = await renderSautiTamuEmail(
          templateKey,
          {
            full_name: lead.full_name,
            email: lead.email,
            whatsapp_number: lead.whatsapp_number,
            booking_id: booking?.id ?? task.booking_id,
            lesson_details: slot
              ? {
                  instrument: booking?.instrument ?? null,
                  starts_at: slot.starts_at,
                  ends_at: slot.ends_at,
                }
              : null,
          }
        );

        const { data: sendData, error: emailError } =
          await resend.emails.send(
            {
              from: RESEND_FROM_EMAIL,
              to: [lead.email.trim().toLowerCase()],
              subject: rendered.subject,
              html: rendered.html,
            },
            {
              idempotencyKey: `follow-up-${task.id}`,
            }
          );

        if (emailError) {
          throw new Error(
            emailError.message ||
              "Resend failed to send the email."
          );
        }

        const sentAt = new Date().toISOString();

        const { error: updateError } = await supabaseServer
          .from("follow_up_tasks")
          .update({
            status: "sent",
            sent_at: sentAt,
            updated_at: sentAt,
          })
          .eq("id", task.id)
          .eq("status", "pending");

        if (updateError) {
          throw new Error(
            "Email was sent but the follow-up status could not be updated."
          );
        }

        sent++;

        results.push({
          taskId: task.id,
          status: "sent",
        });

        void sendData;
      } catch (taskError) {
        const message =
          taskError instanceof Error
            ? taskError.message
            : "Unknown error";

        console.error(`Follow-up ${task.id} failed:`, taskError);

        await supabaseServer
          .from("follow_up_tasks")
          .update({
            updated_at: new Date().toISOString(),
          })
          .eq("id", task.id);

        failed++;

        results.push({
          taskId: task.id,
          status: "failed",
          error: message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: tasks.length,
      sent,
      failed,
      results,
      sender: RESEND_FROM_EMAIL,
      adminEmail: RESEND_ADMIN_EMAIL,
    });
  } catch (error) {
    console.error("Follow-up processor error:", error);

    return errorResponse(
      "Follow-up processor failed.",
      500
    );
  }
}