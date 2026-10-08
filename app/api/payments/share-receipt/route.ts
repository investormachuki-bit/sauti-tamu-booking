import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseServer } from "@/lib/supabase-server";
import { renderSautiTamuEmail } from "@/lib/email-template-renderer";

const resend = new Resend(process.env.RESEND_API_KEY);

const RESEND_FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ||
  process.env.RESEND_FROM ||
  "Sauti Tamu Piano Center <noreply@sautitamupianocenter.co.ke>";

type ReceiptPayload = {
  receiptNumber: string;
  studentName: string;
  studentEmail: string;
  programmeName: string;
  amountPaid: number;
  paymentDate: string;
  paymentMethod: string;
  balanceAfterPayment: number;
  fileName: string;
  base64: string;
  studentId: string;
  paymentId: string;
};

function badRequest(error: string) {
  return NextResponse.json({ success: false, error }, { status: 400 });
}

async function resolvePaymentTemplateKey() {
  const { data, error } = await supabaseServer
    .from("email_templates")
    .select("template_key, name, enabled, category")
    .eq("category", "PAYMENTS")
    .eq("enabled", true);

  if (error) throw error;
  const templates = data ?? [];
  if (!templates.length) throw new Error("No enabled PAYMENTS email template is configured.");

  const preferredKeys = ["payment_receipt", "payment_received", "receipt", "payment_confirmation", "payment_received_confirmation"];
  for (const key of preferredKeys) {
    const match = templates.find((template) => template.template_key === key);
    if (match) return match.template_key;
  }

  const receiptTemplate = templates.find((template) =>
    (String(template.name) + " " + String(template.template_key)).toLowerCase().includes("receipt"),
  );
  if (receiptTemplate) return receiptTemplate.template_key;

  const paymentTemplate = templates.find((template) =>
    (String(template.name) + " " + String(template.template_key)).toLowerCase().includes("payment"),
  );
  if (paymentTemplate) return paymentTemplate.template_key;

  return templates[0].template_key;
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ success: false, error: "RESEND_API_KEY is not configured." }, { status: 500 });
    }

    const authorization = request.headers.get("authorization");
    const token = authorization?.startsWith("Bearer ") ? authorization.substring(7) : null;
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });

    const { data: authData, error: authError } = await supabaseServer.auth.getUser(token);
    if (authError || !authData.user) return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });

    const payload = (await request.json()) as Partial<ReceiptPayload>;
    if (!payload.studentId || !payload.paymentId || !payload.studentEmail || !payload.studentName || !payload.receiptNumber || !payload.fileName || !payload.base64) {
      return badRequest("Incomplete receipt email payload.");
    }

    const { data: student, error: studentError } = await supabaseServer
      .from("students")
      .select("id, full_name, email, whatsapp_number")
      .eq("id", payload.studentId)
      .maybeSingle();
    if (studentError) throw studentError;
    if (!student) return badRequest("Student record not found.");

    const recipient = String(student.email || payload.studentEmail).trim().toLowerCase();
    if (!recipient) return badRequest("This student does not have an email address.");

    const { data: enrollment, error: enrollmentError } = await supabaseServer
      .from("student_enrollments")
      .select("id, instrument, programme_name, total_fee, start_date, end_date")
      .eq("student_id", student.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (enrollmentError) throw enrollmentError;

    const { data: payment, error: paymentError } = await supabaseServer
      .from("payments")
      .select("id, student_id, enrollment_id, amount, payment_date, payment_method, reference")
      .eq("id", payload.paymentId)
      .eq("student_id", student.id)
      .maybeSingle();
    if (paymentError) throw paymentError;
    if (!payment) return badRequest("Payment record not found.");

    const { data: payments, error: paymentsError } = await supabaseServer
      .from("payments")
      .select("id, amount, payment_date, payment_method, reference")
      .eq("student_id", student.id)
      .order("payment_date", { ascending: true });
    if (paymentsError) throw paymentsError;

    const totalPaid = (payments ?? []).reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const courseFee = Number(enrollment?.total_fee || 0);
    const balance = Math.max(0, courseFee - totalPaid);
    const templateKey = await resolvePaymentTemplateKey();

    const rendered = await renderSautiTamuEmail(templateKey, {
      full_name: student.full_name,
      email: recipient,
      whatsapp_number: student.whatsapp_number,
      student_id: student.id,
      enrollment_id: enrollment?.id ?? payment.enrollment_id,
      payment_id: payment.id,
      programme: enrollment?.programme_name ?? payload.programmeName ?? "Music Training",
      instrument: enrollment?.instrument ?? null,
      course_fee: courseFee || null,
      payment_date: payment.payment_date,
      amount_paid: Number(payment.amount || 0),
      total_paid: totalPaid,
      balance,
      payment_method: payment.payment_method,
      payment_reference: payment.reference,
      start_date: enrollment?.start_date ?? null,
      end_date: enrollment?.end_date ?? null,
      payment_history: (payments ?? []).map((item) => ({
        id: item.id,
        amount: Number(item.amount || 0),
        payment_date: item.payment_date,
        payment_method: item.payment_method,
        reference: item.reference,
      })),
    });

    const { data: sendData, error: sendError } = await resend.emails.send({
      from: RESEND_FROM_EMAIL,
      to: [recipient],
      subject: rendered.subject,
      html: rendered.html,
      attachments: [{ filename: payload.fileName, content: payload.base64 }],
    });

    if (sendError) {
      console.error("Receipt email send error:", sendError);
      return NextResponse.json({ success: false, error: sendError.message || "Receipt email could not be sent.", templateKey }, { status: 502 });
    }

    return NextResponse.json({ success: true, emailSent: true, messageId: sendData?.id ?? null, recipient, templateKey });
  } catch (error) {
    console.error("Receipt sharing error:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Unable to share receipt." }, { status: 500 });
  }
}