import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseServer } from "@/lib/supabase-server";
import { renderSautiTamuEmail } from "@/lib/email-template-renderer";

const resend = new Resend(process.env.RESEND_API_KEY);
const NAIROBI_TIME_ZONE = "Africa/Nairobi";
const MANYCHAT_API_BASE = "https://api.manychat.com";
const MANYCHAT_BOOKING_TAG =
  process.env.MANYCHAT_BOOKING_TAG || "TRIAL LESSON BOOKED";

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

  if (Number.isNaN(date.getTime())) return value;

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

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-KE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: NAIROBI_TIME_ZONE,
  }).format(date);
}

function normalizeWhatsappNumber(value: string) {
  const trimmed = value.trim();
  const digitsOnly = trimmed.replace(/\D/g, "");

  if (trimmed.startsWith("+")) {
    return `+${digitsOnly}`;
  }

  if (digitsOnly.startsWith("00")) {
    return `+${digitsOnly.slice(2)}`;
  }

  if (digitsOnly.startsWith("254")) {
    return `+${digitsOnly}`;
  }

  if (digitsOnly.startsWith("0")) {
    return `+254${digitsOnly.slice(1)}`;
  }

  if (digitsOnly.length === 9) {
    return `+254${digitsOnly}`;
  }

  return `+${digitsOnly}`;
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const firstName = parts.shift() || fullName.trim();
  const lastName = parts.join(" ");

  return { firstName, lastName };
}

async function manychatRequest(
  path: string,
  options: RequestInit = {},
) {
  const token = process.env.MANYCHAT_API_TOKEN;

  if (!token) {
    return null;
  }

  const response = await fetch(`${MANYCHAT_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    cache: "no-store",
  });

  let payload: any = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  return {
    ok: response.ok,
    status: response.status,
    payload,
  };
}

async function syncBookingToManyChat({
  fullName,
  email,
  whatsappNumber,
}: {
  fullName: string;
  email: string;
  whatsappNumber: string;
}) {
  if (!process.env.MANYCHAT_API_TOKEN) {
    return {
      enabled: false,
      success: false,
      reason: "MANYCHAT_API_TOKEN is not configured",
    };
  }

  const whatsapp = normalizeWhatsappNumber(whatsappNumber);

  if (!/^\+\d{10,15}$/.test(whatsapp)) {
    return {
      enabled: true,
      success: false,
      reason: "Invalid WhatsApp number format",
    };
  }

  const { firstName, lastName } = splitName(fullName);

  const createResult = await manychatRequest(
    "/fb/subscriber/createSubscriber",
    {
      method: "POST",
      body: JSON.stringify({
        first_name: firstName,
        last_name: lastName || undefined,
        phone: whatsapp,
        whatsapp_phone: whatsapp,
        email,
        consent_phrase:
          "By booking, you agree that Sauti Tamu may contact you about your trial lesson and learning program.",
      }),
    },
  );

  let subscriberId: number | string | null = null;

  if (createResult?.ok) {
    subscriberId =
      createResult.payload?.data?.id ??
      createResult.payload?.data?.subscriber_id ??
      createResult.payload?.data?.subscriber?.id ??
      null;
  }

  /*
   * If the contact already exists in ManyChat, createSubscriber
   * returns an error. The booking should still succeed, so look
   * the existing contact up by the email that is already required
   * by the Sauti Tamu booking form.
   */
  if (!subscriberId) {
    const lookup = await manychatRequest(
      `/fb/subscriber/findBySystemField?system_field=email&value=${encodeURIComponent(email)}`,
      { method: "GET" },
    );

    const firstMatch = Array.isArray(lookup?.payload?.data)
      ? lookup.payload.data[0]
      : lookup?.payload?.data;

    subscriberId =
      firstMatch?.id ??
      firstMatch?.subscriber_id ??
      null;
  }

  if (!subscriberId) {
    console.error("ManyChat subscriber sync failed:", {
      createStatus: createResult?.status,
      createPayload: createResult?.payload,
      email,
    });

    return {
      enabled: true,
      success: false,
      reason: "Could not create or find the ManyChat subscriber",
    };
  }

  const tagResult = await manychatRequest(
    "/fb/subscriber/addTagByName",
    {
      method: "POST",
      body: JSON.stringify({
        subscriber_id: subscriberId,
        tag_name: MANYCHAT_BOOKING_TAG,
      }),
    },
  );

  if (!tagResult?.ok) {
    console.error("ManyChat tag sync failed:", {
      status: tagResult?.status,
      payload: tagResult?.payload,
      subscriberId,
      tag: MANYCHAT_BOOKING_TAG,
    });

    return {
      enabled: true,
      success: false,
      reason: "Subscriber was found but the booking tag could not be added",
      subscriberId,
    };
  }

  return {
    enabled: true,
    success: true,
    subscriberId,
    tag: MANYCHAT_BOOKING_TAG,
  };
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
  const safeStatus = escapeHtml(
    String(status || "confirmed").toUpperCase(),
  );

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
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New Trial Booking</title>
</head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;color:#202020;">
  <div style="width:100%;padding:20px 12px;box-sizing:border-box;">
    <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #ececec;border-radius:18px;overflow:hidden;">
      <div style="background:#cf2428;padding:34px 34px 30px;">
        <div style="font-size:24px;line-height:1.2;font-weight:800;letter-spacing:4px;color:#ffffff;">SAUTI TAMU</div>
        <div style="margin-top:10px;font-size:15px;line-height:1.4;font-weight:700;letter-spacing:4px;color:#ffffff;">NEW TRIAL BOOKING</div>
      </div>
      <div style="padding:40px 34px 34px;">
        <div style="font-size:12px;line-height:1.4;font-weight:800;letter-spacing:3px;color:#cf2428;">NEW BOOKING</div>
        <div style="margin-top:20px;font-size:42px;line-height:1.08;font-weight:800;color:#202020;word-break:break-word;">${safeName}</div>
        <div style="margin-top:36px;background:#f7f7f7;border:1px solid #e8e8e8;border-radius:18px;padding:28px 28px 30px;">
          <div style="font-size:14px;line-height:1.4;font-weight:800;letter-spacing:2px;color:#777777;">TRIAL LESSON</div>
          <div style="margin-top:16px;font-size:31px;line-height:1.2;font-weight:800;color:#202020;">${instrumentIcon} ${safeInstrument}</div>
          ${lessonDate ? `<div style="margin-top:24px;font-size:18px;line-height:1.5;color:#444444;">📅 ${lessonDate}</div>` : ""}
          ${lessonTime ? `<div style="margin-top:6px;font-size:34px;line-height:1.15;font-weight:800;color:#cf2428;letter-spacing:.5px;">${lessonTime}</div>` : ""}
          <div style="margin-top:10px;font-size:12px;line-height:1.5;color:#777777;">60-minute trial lesson</div>
        </div>
        <div style="margin-top:42px;">
          <div style="font-size:13px;line-height:1.4;font-weight:800;letter-spacing:2px;color:#cf2428;">CUSTOMER DETAILS</div>
          <div style="margin-top:24px;font-size:17px;line-height:1.65;color:#555555;">
            <div style="margin-bottom:10px;"><strong style="color:#202020;">Name:</strong> ${safeName}</div>
            <div style="margin-bottom:10px;"><strong style="color:#202020;">Email:</strong> <span style="color:#365f91;">${safeEmail}</span></div>
            <div style="margin-bottom:10px;"><strong style="color:#202020;">WhatsApp:</strong> ${safeWhatsapp}</div>
            <div><strong style="color:#202020;">Instrument:</strong> ${safeInstrument}</div>
          </div>
        </div>
        <div style="margin-top:38px;background:#fff5f5;border:1px solid #f1d8d8;border-radius:17px;padding:24px 26px;">
          <div style="font-size:19px;line-height:1.4;font-weight:800;color:#202020;">Booking status: ${safeStatus}</div>
          <div style="margin-top:9px;font-size:15px;line-height:1.5;color:#777777;word-break:break-word;">Booking ID: ${safeBookingId}</div>
        </div>
        <div style="margin-top:34px;padding-top:28px;border-top:1px solid #e5e5e5;">
          <div style="font-size:15px;line-height:1.5;color:#777777;">Sauti Tamu Piano Center — Admin Notification</div>
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
        { success: false, error: "Email service is not configured." },
        { status: 500 },
      );
    }

    const body = await request.json();
    const { slotId, fullName, email, whatsappNumber } = body;

    if (!slotId) {
      return NextResponse.json(
        { success: false, error: "Lesson slot is required." },
        { status: 400 },
      );
    }

    if (typeof fullName !== "string" || !fullName.trim()) {
      return NextResponse.json(
        { success: false, error: "Full name is required." },
        { status: 400 },
      );
    }

    if (typeof email !== "string" || !email.trim()) {
      return NextResponse.json(
        { success: false, error: "Email address is required." },
        { status: 400 },
      );
    }

    if (typeof whatsappNumber !== "string" || !whatsappNumber.trim()) {
      return NextResponse.json(
        { success: false, error: "WhatsApp number is required." },
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
          error: "We couldn't create your booking. Please try again.",
        },
        { status: 500 },
      );
    }

    if (!bookingResult || bookingResult.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "We couldn't confirm your booking. Please try again.",
        },
        { status: 500 },
      );
    }

    const booking = bookingResult[0];

    const { data: bookingDetails, error: detailsError } =
      await supabaseServer
        .from("bookings")
        .select("id, lead_id, slot_id, instrument, status, created_at")
        .eq("id", booking.booking_id)
        .single();

    if (detailsError || !bookingDetails) {
      console.error("Booking details error:", detailsError);

      return NextResponse.json({
        success: true,
        bookingCreated: true,
        confirmationSent: false,
        adminNotificationSent: false,
        manychatSynced: false,
        followUpsCreated: 0,
        warning:
          "Your booking was created, but we could not prepare the confirmation message.",
        bookingId: booking.booking_id,
      });
    }

    const { data: lessonSlot, error: lessonSlotError } =
      await supabaseServer
        .from("lesson_slots")
        .select("starts_at, ends_at")
        .eq("id", bookingDetails.slot_id)
        .single();

    if (lessonSlotError) {
      console.error("Lesson slot details error:", lessonSlotError);
    }

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
      console.error("Customer confirmation email error:", customerEmailResult.error);

      return NextResponse.json({
        success: true,
        bookingCreated: true,
        confirmationSent: false,
        adminNotificationSent: false,
        manychatSynced: false,
        followUpsCreated: 0,
        warning:
          "Your booking was created, but the confirmation email could not be sent.",
        bookingId: booking.booking_id,
      });
    }

    await supabaseServer
      .from("bookings")
      .update({ confirmation_sent_at: new Date().toISOString() })
      .eq("id", booking.booking_id);

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
        instrument: String(bookingDetails.instrument || ""),
        status: String(bookingDetails.status || "confirmed"),
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

    /*
     * ManyChat is deliberately non-blocking. A ManyChat/API problem
     * must never make a successfully created Sauti Tamu booking fail.
     */
    let manychatResult: Awaited<ReturnType<typeof syncBookingToManyChat>> = {
      enabled: false,
      success: false,
      reason: "Not attempted",
    };

    try {
      manychatResult = await syncBookingToManyChat({
        fullName: cleanName,
        email: cleanEmail,
        whatsappNumber: cleanWhatsapp,
      });
    } catch (manychatError) {
      console.error("ManyChat integration error:", manychatError);
      manychatResult = {
        enabled: true,
        success: false,
        reason: "Unexpected ManyChat integration error",
      };
    }

    return NextResponse.json({
      success: true,
      bookingCreated: true,
      confirmationSent: true,
      adminNotificationSent: Boolean(
        adminEmailResult && !adminEmailResult.error,
      ),
      manychatSynced: manychatResult.success,
      manychat: {
        enabled: manychatResult.enabled,
        success: manychatResult.success,
        tag: "tag" in manychatResult ? manychatResult.tag : undefined,
      },
      followUpsCreated: 0,
      bookingId: booking.booking_id,
    });
  } catch (error) {
    console.error("Booking confirmation route error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Something went wrong while confirming the booking.",
      },
      { status: 500 },
    );
  }
}
