import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { sendAirTouchSms } from "@/lib/airtouch";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-KE", {
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatPaymentDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-KE", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Nairobi",
  }).format(date);
}

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization");
    const token = authorization?.startsWith("Bearer ")
      ? authorization.substring(7)
      : null;

    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
    }

    const { data: authData, error: authError } = await supabaseServer.auth.getUser(token);
    if (authError || !authData.user) {
      return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const studentId = typeof body.studentId === "string" ? body.studentId.trim() : "";
    const paymentId = typeof body.paymentId === "string" ? body.paymentId.trim() : "";

    if (!studentId || !paymentId) {
      return NextResponse.json({ success: false, error: "Student and payment are required." }, { status: 400 });
    }

    const { data: student, error: studentError } = await supabaseServer
      .from("students")
      .select("id, full_name, whatsapp_number")
      .eq("id", studentId)
      .maybeSingle();

    if (studentError) throw studentError;
    if (!student) {
      return NextResponse.json({ success: false, error: "Student not found." }, { status: 404 });
    }

    if (!student.whatsapp_number?.trim()) {
      return NextResponse.json({ success: true, smsSent: false, skipped: true, reason: "No mobile number on the student record." });
    }

    const { data: payment, error: paymentError } = await supabaseServer
      .from("payments")
      .select("id, student_id, enrollment_id, amount, payment_date")
      .eq("id", paymentId)
      .eq("student_id", studentId)
      .maybeSingle();

    if (paymentError) throw paymentError;
    if (!payment) {
      return NextResponse.json({ success: false, error: "Payment record not found." }, { status: 404 });
    }

    let courseFee = 0;
    if (payment.enrollment_id) {
      const { data: enrollment, error: enrollmentError } = await supabaseServer
        .from("student_enrollments")
        .select("total_fee")
        .eq("id", payment.enrollment_id)
        .eq("student_id", studentId)
        .maybeSingle();

      if (enrollmentError) throw enrollmentError;
      courseFee = Number(enrollment?.total_fee || 0);
    }

    let paymentsQuery = supabaseServer
      .from("payments")
      .select("amount")
      .eq("student_id", studentId);

    if (payment.enrollment_id) {
      paymentsQuery = paymentsQuery.eq("enrollment_id", payment.enrollment_id);
    }

    const { data: payments, error: paymentsError } = await paymentsQuery;
    if (paymentsError) throw paymentsError;

    const totalPaid = (payments ?? []).reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const balance = Math.max(courseFee - totalPaid, 0);
    const amount = Number(payment.amount || 0);
    let nextDueDate = "";
    if (payment.enrollment_id && balance > 0) {
      const { data: nextSchedule, error: scheduleError } = await supabaseServer
        .from("payment_schedule")
        .select("due_date")
        .eq("enrollment_id", payment.enrollment_id)
        .eq("status", "scheduled")
        .order("due_date", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (scheduleError) throw scheduleError;
      if (nextSchedule?.due_date) nextDueDate = formatPaymentDate(nextSchedule.due_date);
    }
    const { data: smsTemplate, error: templateError } = await supabaseServer.from("core_sms_templates").select("message,enabled").eq("template_key", "payment_receipt").maybeSingle();
    if (templateError) throw templateError;
    if (smsTemplate && !smsTemplate.enabled) return NextResponse.json({ success: true, smsSent: false, skipped: true, reason: "Payment receipt SMS template is disabled." });
    const templateMessage = smsTemplate?.message || "Hello {{full_name}}, Sauti Tamu has received your payment of KSh {{amount}} on {{payment_date}}. Your remaining course balance is KSh {{balance}}. Thank you.";
    const message = templateMessage
      .replace(/{{\s*full_name\s*}}/gi, student.full_name || "there")
      .replace(/{{\s*amount\s*}}/gi, formatCurrency(amount))
      .replace(/{{\s*payment_date\s*}}/gi, formatPaymentDate(payment.payment_date))
      .replace(/{{\s*balance\s*}}/gi, formatCurrency(balance))
      .replace(/{{\s*balance_due\s*}}/gi, formatCurrency(balance))
      .replace(/{{\s*due_date\s*}}/gi, nextDueDate || "not scheduled")
      .replace(/{{\s*next_due_date\s*}}/gi, nextDueDate || "not scheduled");

    const result = await sendAirTouchSms(student.whatsapp_number, message);
    const { error: historyError } = await supabaseServer.from("sms_messages").insert({
      recipient_name: student.full_name || null,
      recipient_phone: student.whatsapp_number,
      message,
      provider: "airtouch",
      provider_status: result.success ? "1000" : String(result.status || "error"),
      provider_response: result.response || result.error || null,
      status: result.success ? "accepted" : "failed",
      source: "payment_receipt",
      sent_by: authData.user.id,
    });
    if (historyError) console.error("Payment receipt SMS history insert failed:", historyError);

    if (!result.success) {
      console.error("Payment notification SMS failed:", result.error);
      return NextResponse.json({ success: false, smsSent: false, error: result.error || "SMS could not be sent." }, { status: 502 });
    }

    // The welcome message is strictly sequenced after an accepted receipt SMS.
    // It is sent only for the first positive payment on this enrollment.
    let welcomeSmsSent = false;
    let welcomeSmsSkipped: string | undefined;
    if (payment.enrollment_id) {
      const { data: firstPayment, error: firstPaymentError } = await supabaseServer
        .from("payments")
        .select("id")
        .eq("enrollment_id", payment.enrollment_id)
        .gt("amount", 0)
        .order("payment_date", { ascending: true })
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (firstPaymentError) {
        console.error("Could not identify first enrollment payment for welcome SMS:", firstPaymentError);
        welcomeSmsSkipped = "Could not verify whether this is the first payment.";
      } else if (firstPayment?.id !== payment.id) {
        welcomeSmsSkipped = "Welcome SMS is only sent after the first payment for an enrollment.";
      } else {
        const welcomeSource = `student_welcome_first_payment:${payment.enrollment_id}`;
        const { data: priorWelcome, error: priorWelcomeError } = await supabaseServer
          .from("sms_messages")
          .select("id")
          .eq("source", welcomeSource)
          .eq("status", "accepted")
          .limit(1)
          .maybeSingle();

        if (priorWelcomeError) {
          console.error("Could not check prior welcome SMS:", priorWelcomeError);
          welcomeSmsSkipped = "Could not verify whether a welcome message was already sent.";
        } else if (priorWelcome) {
          welcomeSmsSkipped = "A welcome message has already been accepted for this enrollment.";
        } else {
          const { data: welcomeTemplate, error: welcomeTemplateError } = await supabaseServer
            .from("student_welcome_sms_templates")
            .select("message,enabled")
            .eq("template_key", "first_payment_welcome")
            .maybeSingle();

          if (welcomeTemplateError) {
            console.error("Could not load first-payment welcome template:", welcomeTemplateError);
            welcomeSmsSkipped = "Welcome template could not be loaded.";
          } else if (!welcomeTemplate || !welcomeTemplate.enabled) {
            welcomeSmsSkipped = "The new student welcome SMS template is disabled.";
          } else {
            const fullName = String(student.full_name || "there").trim();
            const firstName = fullName.split(/\\s+/)[0] || "there";
            const welcomeMessage = String(welcomeTemplate.message)
              .replace(/{{\\s*full_name\\s*}}/gi, fullName)
              .replace(/{{\\s*first_name\\s*}}/gi, firstName);
            const welcomeResult = await sendAirTouchSms(student.whatsapp_number, welcomeMessage);
            const welcomeSentAt = new Date().toISOString();
            const { error: welcomeHistoryError } = await supabaseServer.from("sms_messages").insert({
              recipient_name: student.full_name || null,
              recipient_phone: student.whatsapp_number,
              message: welcomeMessage,
              provider: "airtouch",
              provider_status: welcomeResult.success ? "1000" : String(welcomeResult.errorCode || welcomeResult.status || "error"),
              provider_response: welcomeResult.response || welcomeResult.error || null,
              provider_message_id: welcomeResult.providerMessageId || null,
              status: welcomeResult.success ? "accepted" : "failed",
              delivery_status: welcomeResult.success ? "accepted_by_provider" : "not_accepted",
              delivery_status_updated_at: welcomeSentAt,
              source: welcomeSource,
              sent_by: authData.user.id,
            });
            if (welcomeHistoryError) console.error("Welcome SMS history insert failed:", welcomeHistoryError);
            welcomeSmsSent = welcomeResult.success;
            if (!welcomeResult.success) {
              welcomeSmsSkipped = welcomeResult.error || "Welcome SMS was not accepted by AirTouch.";
              console.error("First-payment welcome SMS failed:", welcomeResult.error);
            }
          }
        }
      }
    } else {
      welcomeSmsSkipped = "This payment is not linked to an enrollment.";
    }

    return NextResponse.json({ success: true, smsSent: true, welcomeSmsSent, welcomeSmsSkipped });
  } catch (error) {
    console.error("Payment SMS notification error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Payment SMS notification failed.",
    }, { status: 500 });
  }
}
