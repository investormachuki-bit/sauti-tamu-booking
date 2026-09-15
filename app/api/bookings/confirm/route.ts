import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseServer } from "@/lib/supabase-server";
import { renderSautiTamuEmail } from "@/lib/email-template-renderer";

const resend = new Resend(process.env.RESEND_API_KEY);

const NAIROBI_TIME_ZONE = "Africa/Nairobi";

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function instrumentLabel(value: unknown) {
  const normalized = String(value ?? "").toLowerCase();

  if (normalized === "piano") return "Piano";
  if (normalized === "guitar") return "Acoustic Guitar";

  return String(value ?? "");
}

function formatDate(value: string | null | undefined) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-KE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: NAIROBI_TIME_ZONE,
  }).format(date);
}

function formatTime(value: string | null | undefined) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-KE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: NAIROBI_TIME_ZONE,
  }).format(date);
}

function buildAdminBookingEmail({
  fullName,
  email,
  whatsappNumber,
  bookingId,
  instrument,
  status,
  startsAt,
  endsAt,
}: {
  fullName: string;
  email: string;
  whatsappNumber: string;
  bookingId: string;
  instrument: string;
  status: string;
  startsAt: string | null;
  endsAt: string | null;
}) {
  const safeName = escapeHtml(fullName);
  const safeEmail = escapeHtml(email);
  const safeWhatsapp = escapeHtml(whatsappNumber);
  const safeBookingId = escapeHtml(bookingId);
  const safeInstrument = escapeHtml(instrumentLabel(instrument));
  const safeStatus = escapeHtml(String(status || "confirmed").toUpperCase());

  const lessonDate = startsAt ? escapeHtml(formatDate(startsAt)) : "";
  const lessonStartTime = startsAt ? formatTime(startsAt) : "";
  const lessonEndTime = endsAt ? formatTime(endsAt) : "";

  const lessonTime =
    lessonStartTime && lessonEndTime
      ? `${escapeHtml(lessonStartTime)} – ${escapeHtml(lessonEndTime)}`
      : lessonStartTime
        ? escapeHtml(lessonStartTime)
        : "";

  const instrumentIcon =
    String(instrument).toLowerCase() === "piano" ? "🎹" : "🎸";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />
  <title>New Trial Booking</title>
</head>
<body
  style="
    margin:0;
    padding:0;
    background:#202020;
    font-family:Arial,Helvetica,sans-serif;
    color:#d9e0ea;
  "
>
  <div
    style="
      width:100%;
      background:#202020;
      padding:28px 12px;
      box-sizing:border-box;
    "
  >
    <div
      style="
        max-width:640px;
        margin:0 auto;
        background:#111111;
        border-radius:18px;
        overflow:hidden;
        box-shadow:0 12px 32px rgba(0,0,0,.25);
      "
    >

      <!-- HEADER -->
      <div
        style="
          background:#cf2428;
          padding:34px 34px 30px;
        "
      >
        <div
          style="
            font-size:24px;
            line-height:1.2;
            font-weight:800;
            letter-spacing:4px;
            color:#ffffff;
          "
        >
          SAUTI TAMU
        </div>

        <div
          style="
            margin-top:10px;
            font-size:15px;
            line-height:1.4;
            font-weight:700;
            letter-spacing:4px;
            color:#ffffff;
          "
        >
          NEW TRIAL BOOKING
        </div>
      </div>

      <!-- MAIN CONTENT -->
      <div
        style="
          padding:40px 34px 34px;
          background:#111111;
        "
      >

        <div
          style="
            font-size:12px;
            line-height:1.4;
            font-weight:800;
            letter-spacing:3px;
            color:#ff5b52;
          "
        >
          NEW BOOKING
        </div>

        <div
          style="
            margin-top:20px;
            font-size:42px;
            line-height:1.08;
            font-weight:800;
            color:#e2ebf7;
            word-break:break-word;
          "
        >
          ${safeName}
        </div>

        <!-- TRIAL LESSON -->
        <div
          style="
            margin-top:36px;
            background:#222222;
            border-radius:18px;
            padding:28px 28px 30px;
          "
        >
          <div
            style="
              font-size:14px;
              line-height:1.4;
              font-weight:800;
              letter-spacing:2px;
              color:#8b8b8b;
            "
          >
            TRIAL LESSON
          </div>

          <div
            style="
              margin-top:16px;
              font-size:31px;
              line-height:1.2;
              font-weight:800;
              color:#e5edf8;
            "
          >
            ${instrumentIcon} ${safeInstrument}
          </div>

          ${
            lessonDate
              ? `
          <div
            style="
              margin-top:24px;
              font-size:18px;
              line-height:1.5;
              color:#dddddd;
            "
          >
            📅 ${lessonDate}
          </div>
          `
              : ""
          }

          ${
            lessonTime
              ? `
          <div
            style="
              margin-top:6px;
              font-size:34px;
              line-height:1.15;
              font-weight:800;
              color:#ff685c;
              letter-spacing:.5px;
            "
          >
            ${lessonTime}
          </div>
          `
              : ""
          }

          <div
            style="
              margin-top:10px;
              font-size:12px;
              line-height:1.5;
              color:#8f8f8f;
            "
          >
            60-minute trial lesson
          </div>
        </div>

        <!-- CUSTOMER DETAILS -->
        <div
          style="
            margin-top:42px;
          "
        >
          <div
            style="
              font-size:13px;
              line-height:1.4;
              font-weight:800;
              letter-spacing:2px;
              color:#ff5b52;
            "
          >
            CUSTOMER DETAILS
          </div>

          <div
            style="
              margin-top:24px;
              font-size:17px;
              line-height:1.65;
              color:#aeb9c8;
            "
          >
            <div style="margin-bottom:10px;">
              <strong style="color:#dce4ef;">Name:</strong>
              ${safeName}
            </div>

            <div style="margin-bottom:10px;">
              <strong style="color:#dce4ef;">Email:</strong>
              <span style="color:#aecbff;">${safeEmail}</span>
            </div>

            <div style="margin-bottom:10px;">
              <strong style="color:#dce4ef;">WhatsApp:</strong>
              ${safeWhatsapp}
            </div>

            <div>
              <strong style="color:#dce4ef;">Instrument:</strong>
              ${safeInstrument}
            </div>
          </div>
        </div>

        <!-- STATUS -->
        <div
          style="
            margin-top:38px;
            background:#241d1f;
            border-radius:17px;
            padding:24px 26px;
          "
        >
          <div
            style="
              font-size:19px;
              line-height:1.4;
              font-weight:800;
              color:#dce4ef;
            "
          >
            Booking status: ${safeStatus}
          </div>

          <div
            style="
              margin-top:9px;
              font-size:15px;
              line-height:1.5;
              color:#8f8f8f;
              word-break:break-word;
            "
          >
            Booking ID: ${safeBookingId}
          </div>
        </div>

        <!-- FOOTER -->
        <div
          style="
            margin-top:34px;
            padding-top:28px;
            border-top:1px solid #444444;
          "
        >
          <div
            style="
              font-size:15px;
              line-height:1.5;
              color:#9b9b9b;
            "
          >
            Sauti Tamu Piano Center — Admin Notification
          </div>
        </div>

      </div>
    </div>
  </div>
</body>
</html>`;
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: "Email service is not configured.",
        },
        { status: 500 },
      );
    }

    const body = await request.json();
    const { slotId, fullName, email, whatsappNumber } = body;

    if (!slotId) {
      return NextResponse.json(
        {
          success: false,
          error: "Lesson slot is required.",
        },
        { status: 400 },
      );
    }

    if (typeof fullName !== "string" || !fullName.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Full name is required.",
        },
        { status: 400 },
      );
    }

    if (typeof email !== "string" || !email.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Email address is required.",
        },
        { status: 400 },
      );
    }

    if (
      typeof whatsappNumber !== "string" ||
      !whatsappNumber.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "WhatsApp number is required.",
        },
        { status: 400 },
      );
    }

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanWhatsapp = whatsappNumber.trim();

    const { data: bookingResult, error: bookingError } =
      await supabaseServer.rpc("create_trial_booking", {
        p_slot_id: slotId,
        p_full_name: cleanName,
        p_email: cleanEmail,
        p_whatsapp_number: cleanWhatsapp,
      });

    if (bookingError) {
      const message = bookingError.message || "";

      if (
        message.includes("no longer available") ||
        message.includes("SLOT_ALREADY_BOOKED")
      ) {
        return NextResponse.json(
          {
            success: false,
            code: "SLOT_ALREADY_BOOKED",
            error:
              "Sorry, that time has just been booked. Please choose another.",
          },
          { status: 409 },
        );
      }

      console.error("Booking RPC error:", bookingError);

      return NextResponse.json(
        {
          success: false,
          error:
            "We couldn't create your booking. Please try again.",
        },
        { status: 500 },
      );
    }

    if (!bookingResult || bookingResult.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "We couldn't confirm your booking. Please try again.",
        },
        { status: 500 },
      );
    }

    const booking = bookingResult[0];

    const { data: bookingDetails, error: detailsError } =
      await supabaseServer
        .from("bookings")
        .select(
          "id, lead_id, slot_id, instrument, status, created_at",
        )
        .eq("id", booking.booking_id)
        .single();

    if (detailsError || !bookingDetails) {
      console.error("Booking details error:", detailsError);

      return NextResponse.json({
        success: true,
        bookingCreated: true,
        confirmationSent: false,
        adminNotificationSent: false,
        followUpsCreated: 0,
        warning:
          "Your booking was created, but we could not prepare the confirmation message.",
        bookingId: booking.booking_id,
      });
    }

    /*
     * =========================================================
     * LOAD THE ACTUAL BOOKED LESSON DATE/TIME
     * =========================================================
     */
    const { data: lessonSlot, error: lessonSlotError } =
      await supabaseServer
        .from("lesson_slots")
        .select("starts_at, ends_at")
        .eq("id", bookingDetails.slot_id)
        .single();

    if (lessonSlotError) {
      console.error(
        "Lesson slot details error:",
        lessonSlotError,
      );
    }

    /*
     * =========================================================
     * CUSTOMER CONFIRMATION EMAIL
     * =========================================================
     */
    const rendered = await renderSautiTamuEmail(
      "booking_confirmation",
      {
        full_name: cleanName,
        email: cleanEmail,
        whatsapp_number: cleanWhatsapp,
        booking_id: booking.booking_id,
      },
    );

    const customerEmailResult = await resend.emails.send({
      from: "Sauti Tamu Piano Center <bookings@sautitamupianocenter.co.ke>",
      to: [cleanEmail],
      subject: rendered.subject,
      html: rendered.html,
    });

    if (customerEmailResult.error) {
      console.error(
        "Customer confirmation email error:",
        customerEmailResult.error,
      );

      return NextResponse.json({
        success: true,
        bookingCreated: true,
        confirmationSent: false,
        adminNotificationSent: false,
        followUpsCreated: 0,
        warning:
          "Your booking was created, but the confirmation email could not be sent.",
        bookingId: booking.booking_id,
      });
    }

    await supabaseServer
      .from("bookings")
      .update({
        confirmation_sent_at: new Date().toISOString(),
      })
      .eq("id", booking.booking_id);

    /*
     * =========================================================
     * ADMIN NOTIFICATION EMAIL
     * =========================================================
     */
    const adminEmail = process.env.RESEND_ADMIN_EMAIL;

    let adminEmailResult: {
      data?: unknown;
      error?: { message?: string } | null;
    } | null = null;

    if (adminEmail) {
      const adminHtml = buildAdminBookingEmail({
        fullName: cleanName,
        email: cleanEmail,
        whatsappNumber: cleanWhatsapp,
        bookingId: booking.booking_id,
        instrument: String(
          bookingDetails.instrument || "",
        ),
        status: String(
          bookingDetails.status || "confirmed",
        ),
        startsAt: lessonSlot?.starts_at ?? null,
        endsAt: lessonSlot?.ends_at ?? null,
      });

      adminEmailResult = await resend.emails.send({
        from: "Sauti Tamu Booking <bookings@sautitamupianocenter.co.ke>",
        to: [adminEmail],
        subject: `New trial booking — ${cleanName}`,
        html: adminHtml,
      });
    }

    return NextResponse.json({
      success: true,
      bookingCreated: true,
      confirmationSent: true,
      adminNotificationSent: Boolean(
        adminEmailResult && !adminEmailResult.error,
      ),
      followUpsCreated: 0,
      bookingId: booking.booking_id,
    });
  } catch (error) {
    console.error(
      "Booking confirmation route error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Something went wrong while confirming the booking.",
      },
      { status: 500 },
    );
  }
}