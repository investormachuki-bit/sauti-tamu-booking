import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseServer } from "@/lib/supabase-server";
import { renderSautiTamuEmail } from "@/lib/email-template-renderer";

const resend = new Resend(process.env.RESEND_API_KEY);

const RESEND_FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ||
  "Sauti Tamu Piano Center <noreply@sautitamupianocenter.co.ke>";

function unauthorized() {
  return NextResponse.json(
    { success: false, error: "Unauthorized." },
    { status: 401 }
  );
}

function badRequest(error: string) {
  return NextResponse.json(
    { success: false, error },
    { status: 400 }
  );
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: "Email service is not configured.",
        },
        { status: 500 }
      );
    }

    const authorization =
      request.headers.get("authorization");

    const token =
      authorization?.startsWith("Bearer ")
        ? authorization.substring(7)
        : null;

    if (!token) {
      return unauthorized();
    }

    const {
      data: authData,
      error: authError,
    } = await supabaseServer.auth.getUser(token);

    if (authError || !authData.user) {
      return unauthorized();
    }

    const requestBody = await request.json();

    const taskId =
      typeof requestBody.task_id === "string"
        ? requestBody.task_id.trim()
        : "";

    const requestedTemplateKey =
      typeof requestBody.template_key === "string"
        ? requestBody.template_key.trim()
        : "";

    if (!taskId) {
      return badRequest("Follow-up task is required.");
    }

    /* * Load the authoritative task. * The browser's subject/body are intentionally ignored. * The server always renders the current saved template. */
    const {
      data: task,
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
      .eq("id", taskId)
      .maybeSingle();

    if (taskError) {
      console.error("Manual email task lookup error:", taskError);
      return NextResponse.json(
        {
          success: false,
          error: "Could not load the follow-up task.",
        },
        { status: 500 }
      );
    }

    if (!task) {
      return NextResponse.json(
        {
          success: false,
          error: "Follow-up task not found.",
        },
        { status: 404 }
      );
    }

    if (task.channel !== "email") {
      return badRequest(
        "This follow-up task is not an email task."
      );
    }

    if (
      task.status !== "pending" &&
      task.status !== "sent"
    ) {
      return badRequest(
        "This follow-up task is not available for email sending."
      );
    }

    const {
      data: lead,
      error: leadError,
    } = await supabaseServer
      .from("leads")
      .select(
        "id, full_name, email, whatsapp_number"
      )
      .eq("id", task.lead_id)
      .maybeSingle();

    if (leadError) {
      console.error("Manual email lead lookup error:", leadError);
      return NextResponse.json(
        {
          success: false,
          error: "Could not load the lead.",
        },
        { status: 500 }
      );
    }

    if (!lead) {
      return NextResponse.json(
        {
          success: false,
          error: "Lead not found.",
        },
        { status: 404 }
      );
    }

    if (!lead.email?.trim()) {
      return badRequest(
        "This lead does not have an email address."
      );
    }

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
          "id, instrument, status, slot_id"
        )
        .eq("id", task.booking_id)
        .maybeSingle();

      if (bookingError) {
        console.error(
          "Manual email booking lookup error:",
          bookingError
        );

        return NextResponse.json(
          {
            success: false,
            error: "Could not load the booking.",
          },
          { status: 500 }
        );
      }

      if (bookingData) {
        booking = bookingData;

        const {
          data: slotData,
          error: slotError,
        } = await supabaseServer
          .from("lesson_slots")
          .select(
            "id, starts_at, ends_at"
          )
          .eq("id", booking.slot_id)
          .maybeSingle();

        if (slotError) {
          console.error(
            "Manual email lesson slot lookup error:",
            slotError
          );

          return NextResponse.json(
            {
              success: false,
              error: "Could not load the lesson slot.",
            },
            { status: 500 }
          );
        }

        slot = slotData ?? null;
      }
    }

    /* * Use the explicitly requested template key only when it matches * the current task's natural template. Otherwise derive it from * the task type so the browser cannot force an unrelated template. */
    let templateKey = requestedTemplateKey;

    if (!templateKey) {
      switch (task.task_type) {
        case "trial_reminder_7d":
        case "trial_reminder_3d":
        case "trial_reminder_24h":
        case "trial_reminder_6h":
        case "trial_reminder_1h":
          templateKey = task.task_type;
          break;

        case "trial_reminder_2h":
          templateKey = "trial_reminder_1h";
          break;

        case "post_trial_follow_up":
          templateKey = "attended_not_registered";
          break;

        default:
          templateKey =
            task.message_template || "";
      }
    }

    if (!templateKey) {
      return badRequest(
        "No email template is configured for this follow-up."
      );
    }

    const rendered =
      await renderSautiTamuEmail(
        templateKey,
        {
          full_name: lead.full_name,
          email: lead.email,
          whatsapp_number:
            lead.whatsapp_number,

          booking_id:
            booking?.id ??
            task.booking_id,

          lesson_details: slot
            ? {
                instrument:
                  booking?.instrument ?? null,
                starts_at:
                  slot.starts_at,
                ends_at:
                  slot.ends_at,
              }
            : null,
        }
      );

    const {
      data: sendData,
      error: sendError,
    } = await resend.emails.send(
      {
        from: RESEND_FROM_EMAIL,
        to: [
          lead.email
            .trim()
            .toLowerCase(),
        ],
        subject: rendered.subject,
        html: rendered.html,
      }
    );

    if (sendError) {
      console.error(
        "Manual email send error:",
        sendError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            sendError.message ||
            "Email could not be sent.",
        },
        { status: 502 }
      );
    }

    const sentAt =
      new Date().toISOString();

    /* * A manual send is an email action, not completion of the follow-up. * Keep completed/cancelled states protected and record the actual send. */
    const {
      error: updateError,
    } = await supabaseServer
      .from("follow_up_tasks")
      .update({
        status: "sent",
        sent_at: sentAt,
        updated_at: sentAt,
      })
      .eq("id", task.id)
      .in("status", [
        "pending",
        "sent",
      ]);

    if (updateError) {
      console.error(
        "Manual email task update error:",
        updateError
      );

      return NextResponse.json(
        {
          success: true,
          emailSent: true,
          statusRecorded: false,
          warning:
            "Email was sent, but the follow-up task status could not be updated.",
          messageId:
            sendData?.id ?? null,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      success: true,
      emailSent: true,
      statusRecorded: true,
      messageId:
        sendData?.id ?? null,
      taskId: task.id,
      templateKey,
      recipient:
        lead.email.trim().toLowerCase(),
    });
  } catch (error) {
    console.error(
      "Manual follow-up email processor error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Email could not be sent.",
      },
      { status: 500 }
    );
  }
}