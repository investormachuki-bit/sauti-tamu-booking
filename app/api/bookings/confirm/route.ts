import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseServer } from "@/lib/supabase-server";
import { renderSautiTamuEmail } from "@/lib/email-template-renderer";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ success: false, error: "Email service is not configured." }, { status: 500 });
    }

    const body = await request.json();
    const { slotId, fullName, email, whatsappNumber } = body;

    if (!slotId) return NextResponse.json({ success: false, error: "Lesson slot is required." }, { status: 400 });
    if (typeof fullName !== "string" || !fullName.trim()) return NextResponse.json({ success: false, error: "Full name is required." }, { status: 400 });
    if (typeof email !== "string" || !email.trim()) return NextResponse.json({ success: false, error: "Email address is required." }, { status: 400 });
    if (typeof whatsappNumber !== "string" || !whatsappNumber.trim()) return NextResponse.json({ success: false, error: "WhatsApp number is required." }, { status: 400 });

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanWhatsapp = whatsappNumber.trim();

    const { data: bookingResult, error: bookingError } = await supabaseServer.rpc("create_trial_booking", {
      p_slot_id: slotId,
      p_full_name: cleanName,
      p_email: cleanEmail,
      p_whatsapp_number: cleanWhatsapp,
    });

    if (bookingError) {
      const message = bookingError.message || "";
      if (message.includes("no longer available") || message.includes("SLOT_ALREADY_BOOKED")) {
        return NextResponse.json({
          success: false,
          code: "SLOT_ALREADY_BOOKED",
          error: "Sorry, that time has just been booked. Please choose another.",
        }, { status: 409 });
      }
      console.error("Booking RPC error:", bookingError);
      return NextResponse.json({ success: false, error: "We couldn't create your booking. Please try again." }, { status: 500 });
    }

    if (!bookingResult || bookingResult.length === 0) {
      return NextResponse.json({ success: false, error: "We couldn't confirm your booking. Please try again." }, { status: 500 });
    }

    const booking = bookingResult[0];

    const { data: bookingDetails, error: detailsError } = await supabaseServer
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
        followUpsCreated: 0,
        warning: "Your booking was created, but we could not prepare the confirmation message.",
        bookingId: booking.booking_id,
      });
    }

    const rendered = await renderSautiTamuEmail("booking_confirmation", {
      full_name: cleanName,
      email: cleanEmail,
      whatsapp_number: cleanWhatsapp,
      booking_id: booking.booking_id,
    });

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
        followUpsCreated: 0,
        warning: "Your booking was created, but the confirmation email could not be sent.",
        bookingId: booking.booking_id,
      });
    }

    await supabaseServer
      .from("bookings")
      .update({ confirmation_sent_at: new Date().toISOString() })
      .eq("id", booking.booking_id);

    const adminEmail = process.env.RESEND_ADMIN_EMAIL;
    let adminEmailResult: { data?: unknown; error?: { message?: string } | null } | null = null;

    if (adminEmail) {
      adminEmailResult = await resend.emails.send({
        from: "Sauti Tamu Booking <bookings@sautitamupianocenter.co.ke>",
        to: [adminEmail],
        subject: `New trial booking — ${cleanName}`,
        html: `<div style="font-family:Arial,sans-serif;padding:24px"><h2>New trial booking</h2><p><strong>Name:</strong> ${cleanName.replace(/</g,"&lt;").replace(/>/g,"&gt;")}</p><p><strong>Email:</strong> ${cleanEmail}</p><p><strong>WhatsApp:</strong> ${cleanWhatsapp}</p><p><strong>Booking ID:</strong> ${booking.booking_id}</p><p><strong>Instrument:</strong> ${String(bookingDetails.instrument || "").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</p><p><strong>Status:</strong> ${String(bookingDetails.status || "confirmed")}</p></div>`,
      });
    }

    return NextResponse.json({
      success: true,
      bookingCreated: true,
      confirmationSent: true,
      adminNotificationSent: Boolean(adminEmailResult && !adminEmailResult.error),
      followUpsCreated: 0,
      bookingId: booking.booking_id,
    });
  } catch (error) {
    console.error("Booking confirmation route error:", error);
    return NextResponse.json({ success: false, error: "Something went wrong while confirming the booking." }, { status: 500 });
  }
}