import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { sendAirTouchSms } from "@/lib/airtouch";

const TASK_TYPES = [
  "trial_reminder_24h",
  "trial_reminder_1h",
  "trial_reminder_15m",
] as const;

function responseError(error: string, status = 500) {
  return NextResponse.json({ success: false, error }, { status });
}

async function processSms(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const providedSecret = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
  const validSecrets = [process.env.FOLLOWUP_CRON_SECRET, process.env.MANYCHAT_FOLLOWUP_CRON_SECRET].filter(Boolean);
  if (!providedSecret || !validSecrets.includes(providedSecret)) {
    return responseError("Unauthorized.", 401);
  }

  const { data: tasks, error } = await supabaseServer
    .from("follow_up_tasks")
    .select("id, lead_id, booking_id, task_type, due_at")
    .eq("status", "pending")
    .eq("channel", "sms")
    .lte("due_at", new Date().toISOString())
    .in("task_type", [...TASK_TYPES])
    .order("due_at", { ascending: true })
    .limit(30);

  if (error) {
    console.error("AirTouch SMS task query failed:", error);
    return responseError("Could not load due SMS reminders.");
  }

  let sent = 0;
  let failed = 0;
  const results: Array<{ taskId: string; success: boolean; error?: string }> = [];

  for (const task of tasks ?? []) {
    let attemptedPhone = "";
    let attemptedName = "";
    let attemptedMessage = "";
    let providerAccepted = false;
    try {
      const { data: lead, error: leadError } = await supabaseServer
        .from("leads")
        .select("id, full_name, whatsapp_number")
        .eq("id", task.lead_id)
        .single();
      if (leadError || !lead) throw new Error("Lead not found.");
      if (!lead.whatsapp_number) throw new Error("Lead has no mobile number.");
      attemptedPhone = lead.whatsapp_number;
      attemptedName = lead.full_name || "";

      if (!task.booking_id) throw new Error("Reminder has no booking.");

      const { data: booking, error: bookingError } = await supabaseServer
        .from("bookings")
        .select("id, instrument, status, slot_id")
        .eq("id", task.booking_id)
        .single();
      if (bookingError || !booking) throw new Error("Booking not found.");

      if (["cancelled", "no_show", "missed", "rescheduled", "completed", "attended"].includes(String(booking.status).toLowerCase())) {
        await supabaseServer.from("follow_up_tasks").update({
          status: "cancelled",
          updated_at: new Date().toISOString(),
        }).eq("id", task.id).eq("status", "pending");
        results.push({ taskId: task.id, success: false, error: "Booking cancelled or no-show." });
        continue;
      }

      const { data: slot, error: slotError } = await supabaseServer
        .from("lesson_slots")
        .select("starts_at, ends_at")
        .eq("id", booking.slot_id)
        .single();
      if (slotError || !slot) throw new Error("Lesson slot not found.");

      const startsAt = new Date(slot.starts_at);
      if (startsAt.getTime() <= Date.now()) {
        await supabaseServer.from("follow_up_tasks").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", task.id).eq("status", "pending");
        results.push({ taskId: task.id, success: false, error: "Trial has already started; stale reminder cancelled." });
        continue;
      }
      const offsetMinutes: Record<string, number> = {
        trial_reminder_24h: 24 * 60,
        trial_reminder_1h: 60,
        trial_reminder_15m: 15,
      };
      const reminderOffset = offsetMinutes[task.task_type];
      if (reminderOffset) {
        const expectedStart = new Date(new Date(task.due_at).getTime() + reminderOffset * 60_000).getTime();
        if (Math.abs(startsAt.getTime() - expectedStart) > 60_000) {
          await supabaseServer.from("follow_up_tasks").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", task.id).eq("status", "pending");
          results.push({ taskId: task.id, success: false, error: "Booking time changed; stale reminder cancelled." });
          continue;
        }
      }
      const date = new Intl.DateTimeFormat("en-KE", {
        weekday: "long", day: "numeric", month: "long",
        timeZone: "Africa/Nairobi",
      }).format(startsAt);
      const time = new Intl.DateTimeFormat("en-KE", {
        hour: "2-digit", minute: "2-digit", hour12: false,
        timeZone: "Africa/Nairobi",
      }).format(startsAt);
      const label = String(booking.instrument || "music").toLowerCase() === "piano" ? "piano" : "guitar";
      let message = `Hello ${lead.full_name}, this is a reminder of your Sauti Tamu ${label} trial lesson on ${date} at ${time}. We look forward to seeing you. Sauti Tamu Piano Center.`;
      if (reminderOffset) {
        const { data: template, error: templateError } = await supabaseServer
          .from("trial_reminder_sms_templates")
          .select("message,enabled")
          .eq("reminder_key", task.task_type)
          .maybeSingle();
        if (templateError) throw new Error("Could not load trial reminder SMS template.");
        if (template && !template.enabled) {
          await supabaseServer.from("follow_up_tasks").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", task.id).eq("status", "pending");
          results.push({ taskId: task.id, success: false, error: "Trial reminder template is disabled." });
          continue;
        }
        const templateText = template?.message || message;
        message = templateText
          .replace(/{{\s*full_name\s*}}/gi, lead.full_name || "there")
          .replace(/{{\s*instrument\s*}}/gi, label)
          .replace(/{{\s*lesson_date\s*}}/gi, date)
          .replace(/{{\s*lesson_time\s*}}/gi, time);
      }

      attemptedMessage = message;
      const sentResult = await sendAirTouchSms(lead.whatsapp_number, message);
      if (!sentResult.success) throw new Error(sentResult.error || "AirTouch send failed.");
      providerAccepted = true;

      const now = new Date().toISOString();
      const { error: historyError } = await supabaseServer.from("sms_messages").insert({
        recipient_name: lead.full_name || null,
        recipient_phone: lead.whatsapp_number,
        message,
        provider: "airtouch",
        provider_status: "1000",
        provider_response: sentResult.response || null,
        status: "accepted",
        source: task.task_type,
        sent_by: null,
      });
      if (historyError) console.error("Trial reminder SMS history insert failed:", historyError);
      const { data: updated, error: updateError } = await supabaseServer
        .from("follow_up_tasks")
        .update({ status: "completed", sent_at: now, completed_at: now, updated_at: now })
        .eq("id", task.id)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();
      if (updateError || !updated) throw new Error("SMS sent, but task status could not be confirmed.");

      sent++;
      results.push({ taskId: task.id, success: true });
    } catch (err) {
      failed++;
      const message = err instanceof Error ? err.message : "Unknown SMS error.";
      console.error(`AirTouch SMS task ${task.id} failed:`, message);
      if (!providerAccepted) {
        if (attemptedPhone && attemptedMessage) {
          const { error: failureLogError } = await supabaseServer.from("sms_messages").insert({
            recipient_name: attemptedName || null,
            recipient_phone: attemptedPhone,
            message: attemptedMessage,
            provider: "airtouch",
            provider_status: "error",
            provider_response: message,
            status: "failed",
            source: task.task_type,
            sent_by: null,
          });
          if (failureLogError) console.error("Trial reminder SMS failure history insert failed:", failureLogError);
        }
        await supabaseServer.from("follow_up_tasks")
          .update({ status: providerAccepted ? "completed" : "pending", ...(providerAccepted ? { sent_at: new Date().toISOString(), completed_at: new Date().toISOString() } : {}), updated_at: new Date().toISOString() })
          .eq("id", task.id)
          .eq("status", "pending");
      }
      results.push({ taskId: task.id, success: false, error: message });
    }
  }


  // Payment Schedule reminders: 7 days, 3 days and on the due date.
  // This processor runs every five minutes; sending is restricted to 08:00–17:59 Nairobi time.
  const now = new Date();
  const nairobiParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(now);
  const part = (type: string) => nairobiParts.find((item) => item.type === type)?.value || "";
  const localDate = `${part("year")}-${part("month")}-${part("day")}`;
  const localHour = Number(part("hour"));
  const localMinute = Number(part("minute"));
  const withinPaymentWindow = localHour >= 8 && localHour < 18;
  let paymentDueSent = 0;
  let paymentDueFailed = 0;
  let paymentDueSkipped = 0;

  if (withinPaymentWindow) {
    const dateAtNoon = new Date(`${localDate}T12:00:00Z`);
    const dateForOffset = (offset: number) => {
      const value = new Date(dateAtNoon);
      value.setUTCDate(value.getUTCDate() + offset);
      return value.toISOString().slice(0, 10);
    };
    const reminderForDate = new Map<string, string>([
      [dateForOffset(7), "payment_due_7d"],
      [dateForOffset(3), "payment_due_3d"],
      [localDate, "payment_due_today"],
    ]);
    const dueDates = [...reminderForDate.keys()];
    const { data: dueSchedules, error: dueScheduleError } = await supabaseServer
      .from("payment_schedule")
      .select("id,enrollment_id,amount_due,due_date,status")
      .eq("status", "scheduled")
      .in("due_date", dueDates);

    if (dueScheduleError) {
      console.error("Payment due SMS schedule query failed:", dueScheduleError);
      paymentDueFailed++;
    } else {
      for (const schedule of dueSchedules || []) {
        const reminderKey = reminderForDate.get(String(schedule.due_date));
        if (!reminderKey) continue;
        try {
          const [{ data: enrollment, error: enrollmentError }, { data: template, error: templateError }] = await Promise.all([
            supabaseServer.from("student_enrollments")
              .select("id,student_id,total_fee")
              .eq("id", schedule.enrollment_id)
              .maybeSingle(),
            supabaseServer.from("payment_due_reminder_sms_templates")
              .select("id,name,message,enabled")
              .eq("reminder_key", reminderKey)
              .maybeSingle(),
          ]);
          if (enrollmentError) throw enrollmentError;
          if (!enrollment) { paymentDueSkipped++; continue; }

          const { data: student, error: studentError } = await supabaseServer
            .from("students")
            .select("id,full_name,whatsapp_number")
            .eq("id", enrollment.student_id)
            .maybeSingle();
          if (studentError) throw studentError;
          if (!student?.whatsapp_number?.trim()) { paymentDueSkipped++; continue; }

          const { data: payments, error: paymentsError } = await supabaseServer
            .from("payments")
            .select("amount")
            .eq("enrollment_id", enrollment.id);
          if (paymentsError) throw paymentsError;
          const totalPaid = (payments || []).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
          const remainingBalance = Math.max(Number(enrollment.total_fee || 0) - totalPaid, 0);

          // Do not message fully paid students, even when a stale due-date row remains.
          if (remainingBalance <= 0 || Number(schedule.amount_due || 0) <= 0) {
            paymentDueSkipped++;
            continue;
          }
          if (templateError) throw templateError;
          if (!template || !template.enabled) { paymentDueSkipped++; continue; }

          const { data: priorLog, error: priorLogError } = await supabaseServer
            .from("payment_due_reminder_sms_log")
            .select("id,status,attempt_count")
            .eq("payment_schedule_id", schedule.id)
            .eq("reminder_key", reminderKey)
            .eq("due_date", schedule.due_date)
            .maybeSingle();
          if (priorLogError) throw priorLogError;
          if (priorLog?.status === "accepted" || priorLog?.status === "processing") continue;

          let logId = priorLog?.id as string | undefined;
          if (logId) {
            const { data: claimedLog, error: retryError } = await supabaseServer
              .from("payment_due_reminder_sms_log")
              .update({
                status: "processing",
                attempt_count: Number(priorLog?.attempt_count || 0) + 1,
                error: null,
                updated_at: now.toISOString(),
              })
              .eq("id", logId)
              .eq("status", "failed")
              .select("id")
              .maybeSingle();
            if (retryError) throw retryError;
            if (!claimedLog) continue;
          } else {
            const { data: createdLog, error: createLogError } = await supabaseServer
              .from("payment_due_reminder_sms_log")
              .insert({
                payment_schedule_id: schedule.id,
                reminder_key: reminderKey,
                due_date: schedule.due_date,
                student_id: student.id,
                recipient_phone: student.whatsapp_number,
                status: "processing",
              })
              .select("id")
              .maybeSingle();
            if (createLogError) {
              // A concurrent cron run may have claimed this same reminder.
              if (String(createLogError.code) === "23505") continue;
              throw createLogError;
            }
            logId = createdLog?.id;
          }
          if (!logId) continue;

          const formatDate = (value: string) => new Intl.DateTimeFormat("en-KE", {
            day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Nairobi",
          }).format(new Date(`${value}T12:00:00+03:00`));
          const formatMoney = (value: number) => new Intl.NumberFormat("en-KE", { maximumFractionDigits: 0 }).format(value);
          const message = String(template.message)
            .replace(/{{\s*full_name\s*}}/gi, student.full_name || "there")
            .replace(/{{\s*amount_due\s*}}/gi, formatMoney(Number(schedule.amount_due || 0)))
            .replace(/{{\s*balance\s*}}/gi, formatMoney(remainingBalance))
            .replace(/{{\s*due_date\s*}}/gi, formatDate(String(schedule.due_date)));

          const sentResult = await sendAirTouchSms(student.whatsapp_number, message);
          if (!sentResult.success) throw new Error(sentResult.error || "AirTouch send failed.");
          const sentAt = new Date().toISOString();
          const { error: smsLogError } = await supabaseServer.from("sms_messages").insert({
            recipient_name: student.full_name || null,
            recipient_phone: student.whatsapp_number,
            message,
            provider: "airtouch",
            provider_status: "1000",
            provider_response: sentResult.response || null,
            status: "accepted",
            source: reminderKey,
            sent_by: null,
          });
          if (smsLogError) console.error("Payment due SMS history insert failed:", smsLogError);
          const { error: reminderLogError } = await supabaseServer
            .from("payment_due_reminder_sms_log")
            .update({
              status: "accepted",
              message,
              provider_response: sentResult.response || null,
              sent_at: sentAt,
              updated_at: sentAt,
              error: null,
            })
            .eq("id", logId);
          if (reminderLogError) throw reminderLogError;
          paymentDueSent++;
        } catch (err) {
          paymentDueFailed++;
          const errorMessage = err instanceof Error ? err.message : "Unknown payment reminder error.";
          console.error(`Payment due reminder for schedule ${schedule.id} failed:`, errorMessage);
          await supabaseServer.from("payment_due_reminder_sms_log")
            .update({ status: "failed", error: errorMessage.slice(0, 500), updated_at: new Date().toISOString() })
            .eq("payment_schedule_id", schedule.id)
            .eq("reminder_key", reminderKey)
            .eq("due_date", schedule.due_date)
            .eq("status", "processing");
        }
      }
    }
  }

  const { data: dueFollowups, error: followupError } = await supabaseServer
    .from("manychat_followup_queue")
    .select("id,contact_id,template_id,day_offset,attempts")
    .eq("status", "pending")
    .lte("due_at", new Date().toISOString())
    .order("due_at", { ascending: true })
    .limit(50);

  let manychatSent = 0;
  let manychatFailed = 0;
  for (const item of dueFollowups || []) {
    let attemptedPhone = "";
    let attemptedName = "";
    let attemptedMessage = "";
    let providerAccepted = false;
    const { data: claimed } = await supabaseServer
      .from("manychat_followup_queue")
      .update({ status: "processing", updated_at: new Date().toISOString() })
      .eq("id", item.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (!claimed) continue;
    try {
      const [{ data: contact, error: contactError }, { data: template, error: templateError }] = await Promise.all([
        supabaseServer.from("manychat_whatsapp_contacts").select("id,phone_e164,first_name,last_name,full_name,sms_marketing_opt_in").eq("id", item.contact_id).single(),
        supabaseServer.from("manychat_followup_templates").select("id,name,message,enabled").eq("id", item.template_id).single(),
      ]);
      if (contactError || !contact) throw new Error("ManyChat contact not found.");
      attemptedPhone = contact.phone_e164;
      attemptedName = contact.full_name || contact.first_name || "";
      if (!contact.sms_marketing_opt_in) {
        await supabaseServer.from("manychat_followup_queue").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", item.id);
        continue;
      }
      if (templateError || !template || !template.enabled) {
        await supabaseServer.from("manychat_followup_queue").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", item.id);
        continue;
      }
      const firstName = String(contact.first_name || "").trim() || String(contact.full_name || "").trim().split(/\s+/)[0] || "there";
      const message = String(template.message).replace(/{{\s*(?:first_name|full_name)\s*}}/gi, firstName);
      attemptedMessage = message;
      const sentResult = await sendAirTouchSms(contact.phone_e164, message);
      if (!sentResult.success) throw new Error(sentResult.error || "AirTouch send failed.");
      providerAccepted = true;
      const now = new Date().toISOString();
      const { error: logError } = await supabaseServer.from("sms_messages").insert({
        recipient_name: contact.full_name || null,
        recipient_phone: contact.phone_e164,
        message,
        provider: "airtouch",
        provider_status: "1000",
        provider_response: sentResult.response || null,
        status: "accepted",
        source: `manychat_day_${item.day_offset}`,
        sent_by: null,
      });
      if (logError) console.error("ManyChat follow-up SMS history insert failed:", logError);
      await supabaseServer.from("manychat_followup_queue").update({ status: "sent", sent_at: now, updated_at: now, last_error: null }).eq("id", item.id);
      manychatSent++;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown ManyChat follow-up error.";
      console.error(`ManyChat follow-up ${item.id} failed:`, message);
      if (providerAccepted) {
        const sentAt = new Date().toISOString();
        await supabaseServer.from("manychat_followup_queue").update({
          status: "sent", sent_at: sentAt, updated_at: sentAt, last_error: null,
        }).eq("id", item.id).eq("status", "processing");
      } else {
        if (attemptedPhone && attemptedMessage) {
          const { error: failureLogError } = await supabaseServer.from("sms_messages").insert({
            recipient_name: attemptedName || null,
            recipient_phone: attemptedPhone,
            message: attemptedMessage,
            provider: "airtouch",
            provider_status: "error",
            provider_response: message,
            status: "failed",
            source: `manychat_day_${item.day_offset}`,
            sent_by: null,
          });
          if (failureLogError) console.error("ManyChat SMS failure history insert failed:", failureLogError);
        }
        await supabaseServer.from("manychat_followup_queue").update({
          status: "pending",
          attempts: Number(item.attempts || 0) + 1,
          last_error: message.slice(0, 500),
          updated_at: new Date().toISOString(),
        }).eq("id", item.id).eq("status", "processing");
      }
      manychatFailed++;
    }
  }

  if (followupError) {
    console.error("ManyChat follow-up queue query failed:", followupError);
    return responseError("Could not load ManyChat follow-up queue.");
  }

  return NextResponse.json({
    success: true,
    processed: tasks?.length ?? 0,
    sent,
    failed,
    manychatProcessed: dueFollowups?.length ?? 0,
    manychatSent,
    manychatFailed,
    paymentDueSent,
    paymentDueFailed,
    paymentDueSkipped,
    results,
  });
}

export async function GET(request: NextRequest) {
  return processSms(request);
}
export async function POST(request: NextRequest) {
  return processSms(request);
}
