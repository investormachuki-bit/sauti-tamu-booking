import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { normalizeKenyanMsisdn, sendAirTouchSms } from "@/lib/airtouch";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { data: auth, error: authError } = await supabaseServer.auth.getUser(token);
  if (authError || !auth.user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  try {
    const body = await request.json();
    const studentId = String(body.studentId || "");
    const enrollmentId = String(body.enrollmentId || "");
    if (!studentId || !enrollmentId) return NextResponse.json({ error: "Student and enrollment are required." }, { status: 400 });

    const [{ data: student, error: studentError }, { data: enrollment, error: enrollmentError }, { data: template, error: templateError }] = await Promise.all([
      supabaseServer.from("students").select("id,full_name,whatsapp_number,status").eq("id", studentId).single(),
      supabaseServer.from("student_enrollments").select("id,student_id,status").eq("id", enrollmentId).eq("student_id", studentId).single(),
      supabaseServer.from("student_completion_sms_templates").select("message,enabled").eq("template_key", "student_completion").single(),
    ]);

    if (studentError || !student) return NextResponse.json({ error: "Student not found." }, { status: 404 });
    if (enrollmentError || !enrollment) return NextResponse.json({ error: "Student enrollment not found." }, { status: 404 });
    if (!["completed", "inactive"].includes(String(enrollment.status).toLowerCase()) || !["completed", "inactive"].includes(String(student.status).toLowerCase())) {
      return NextResponse.json({ error: "The student and enrollment must be completed before sending this message." }, { status: 409 });
    }
    if (templateError || !template || !template.enabled) return NextResponse.json({ success: true, skipped: "Student completion SMS template is disabled or unavailable." });
    if (!student.whatsapp_number) return NextResponse.json({ error: "Student has no mobile number on record." }, { status: 422 });

    const source = `student_completion:${enrollmentId}`;
    const { data: prior } = await supabaseServer.from("sms_messages").select("id,status").eq("source", source).eq("status", "accepted").limit(1).maybeSingle();
    if (prior) return NextResponse.json({ success: true, alreadySent: true, message: "A completion SMS was already accepted for this enrollment." });

    const phone = normalizeKenyanMsisdn(student.whatsapp_number);
    const message = String(template.message).replace(/{{\\s*full_name\\s*}}/gi, student.full_name || "there");
    const sent = await sendAirTouchSms(phone, message);
    const accepted = sent.success;
    const { error: logError } = await supabaseServer.from("sms_messages").insert({
      recipient_name: student.full_name || null,
      recipient_phone: phone,
      message,
      provider: "airtouch",
      provider_status: accepted ? "1000" : (sent.errorCode || String(sent.status || "error")),
      provider_response: sent.response || sent.error || null,
      provider_message_id: sent.providerMessageId || null,
      status: accepted ? "accepted" : "failed",
      delivery_status: accepted ? "accepted_by_provider" : "not_accepted",
      delivery_status_updated_at: new Date().toISOString(),
      source,
      sent_by: auth.user.id,
    });

    if (!accepted) return NextResponse.json({ success: false, error: sent.error || "AirTouch did not accept the completion SMS.", auditSaved: !logError }, { status: 502 });
    return NextResponse.json({ success: true, status: "accepted", auditSaved: !logError, message: "AirTouch accepted the student completion SMS; handset delivery is not confirmed." });
  } catch (error) {
    console.error("Student completion SMS failed:", error);
    return NextResponse.json({ error: "Could not process the student completion SMS." }, { status: 500 });
  }
}
