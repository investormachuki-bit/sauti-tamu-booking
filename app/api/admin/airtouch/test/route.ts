import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { sendAirTouchSms } from "@/lib/airtouch";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice(7)
    : "";

  if (!token) {
    return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
  }

  const { data: authData, error: authError } = await supabaseServer.auth.getUser(token);
  if (authError || !authData.user) {
    return NextResponse.json({ success: false, error: "Your session is invalid or expired. Sign in again." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";

    if (!phone || !message) {
      return NextResponse.json({ success: false, error: "Recipient number and message are required." }, { status: 400 });
    }
    if (message.length > 480) {
      return NextResponse.json({ success: false, error: "Test messages are limited to 480 characters." }, { status: 400 });
    }

    const result = await sendAirTouchSms(phone, message);
    const accepted = result.success;
    const { data: auditRecord, error: auditError } = await supabaseServer
      .from("sms_messages")
      .insert({
        recipient_name: "AirTouch test",
        recipient_phone: phone,
        message,
        provider: "airtouch",
        provider_status: accepted ? "1000" : (result.errorCode || String(result.status || "error")),
        provider_response: result.response || result.error || null,
        provider_message_id: result.providerMessageId || null,
        status: accepted ? "accepted" : "failed",
        delivery_status: accepted ? "accepted_by_provider" : "not_accepted",
        delivery_status_updated_at: new Date().toISOString(),
        source: "airtouch_test",
        sent_by: authData.user.id,
      })
      .select("id")
      .single();

    if (auditError) {
      console.error("AirTouch test SMS audit write failed:", { message: auditError.message });
    }

    if (!accepted) {
      console.error("AirTouch test SMS failed:", {
        error: result.error,
        status: result.status,
        providerResponse: result.response,
      });
      return NextResponse.json({
        success: false,
        error: result.error || "AirTouch rejected the test message.",
        providerResponse: result.response,
        auditSaved: !auditError,
        auditId: auditRecord?.id || null,
      }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      message: "AirTouch accepted the request. This is not a delivery confirmation.",
      providerResponse: result.response,
      providerMessageId: result.providerMessageId || null,
      deliveryStatus: "accepted_by_provider",
      auditSaved: !auditError,
      auditId: auditRecord?.id || null,
      status: result.status,
    });
  } catch (error) {
    console.error("AirTouch test endpoint error:", error);
    return NextResponse.json({ success: false, error: "Could not process the test SMS request." }, { status: 500 });
  }
}
