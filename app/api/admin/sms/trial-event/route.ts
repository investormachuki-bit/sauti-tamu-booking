import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { sendAirTouchSms, normalizeKenyanMsisdn } from "@/lib/airtouch";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { data: auth, error: authError } = await supabaseServer.auth.getUser(token);
  if (authError || !auth.user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  try {
    const body = await request.json();
    const bookingId = String(body.bookingId || "");
    const event = String(body.event || "");
    if (!bookingId || !["trial_rebook", "trial_attended"].includes(event)) return NextResponse.json({ error: "Invalid trial event." }, { status: 400 });

    const [{ data: booking, error: bookingError }, { data: template, error: templateError }] = await Promise.all([
      supabaseServer.from("bookings").select("id,lead_id,instrument,status").eq("id", bookingId).single(),
      supabaseServer.from("trial_event_sms_templates").select("message,enabled").eq("event_key", event).single(),
    ]);
    if (bookingError || !booking) return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    if (templateError || !template || !template.enabled) return NextResponse.json({ success: true, skipped: "Template disabled or unavailable." });
    const { data: lead, error: leadError } = await supabaseServer.from("leads").select("id,full_name,whatsapp_number").eq("id", booking.lead_id).single();
    if (leadError || !lead?.whatsapp_number) return NextResponse.json({ error: "Lead phone number not found." }, { status: 422 });

    const phone = normalizeKenyanMsisdn(lead.whatsapp_number);
    const message = String(template.message)
      .replace(/{{\s*full_name\s*}}/gi, lead.full_name || "there")
      .replace(/{{\s*instrument\s*}}/gi, String(booking.instrument || "music"))
      .replace(/{{\s*booking_link\s*}}/gi, "https://sauti-tamu-booking-kufp.onrender.com/book");
    const sent = await sendAirTouchSms(phone, message);
    const status = sent.success ? "accepted" : "failed";
    await supabaseServer.from("sms_messages").insert({
      recipient_name: lead.full_name || null, recipient_phone: phone, message,
      provider: "airtouch", provider_status: sent.success ? "1000" : String(sent.status || "error"),
      provider_response: sent.response || sent.error || null, status,
      source: event, sent_by: auth.user.id,
    });
    if (!sent.success) return NextResponse.json({ error: sent.error || "SMS provider rejected the message." }, { status: 502 });
    return NextResponse.json({ success: true, status });
  } catch (error) {
    console.error("Trial event SMS failed:", error);
    return NextResponse.json({ error: "Could not send trial event SMS." }, { status: 500 });
  }
}
