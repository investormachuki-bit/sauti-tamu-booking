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
    if (!result.success) {
      console.error("AirTouch test SMS failed:", result.error, result.status);
      return NextResponse.json({
        success: false,
        error: result.error || "AirTouch rejected the test message.",
        providerResponse: result.response,
      }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      message: "The SMS request was accepted by AirTouch. Confirm delivery on the recipient phone.",
      providerResponse: result.response,
      status: result.status,
    });
  } catch (error) {
    console.error("AirTouch test endpoint error:", error);
    return NextResponse.json({ success: false, error: "Could not process the test SMS request." }, { status: 500 });
  }
}
