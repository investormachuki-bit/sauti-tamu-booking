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
    const message = `Hello ${student.full_name}, Sauti Tamu has received your payment of KSh ${formatCurrency(amount)} on ${formatPaymentDate(payment.payment_date)}. Your remaining course balance is KSh ${formatCurrency(balance)}. Thank you.`;

    const result = await sendAirTouchSms(student.whatsapp_number, message);
    if (!result.success) {
      console.error("Payment notification SMS failed:", result.error);
      return NextResponse.json({ success: false, smsSent: false, error: result.error || "SMS could not be sent." }, { status: 502 });
    }

    return NextResponse.json({ success: true, smsSent: true });
  } catch (error) {
    console.error("Payment SMS notification error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Payment SMS notification failed.",
    }, { status: 500 });
  }
}
