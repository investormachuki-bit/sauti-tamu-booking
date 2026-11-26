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
      }
      await supabaseServer.from("follow_up_tasks")
        .update({ status: providerAccepted ? "completed" : "pending", ...(providerAccepted ? { sent_at: new Date().toISOString(), completed_at: new Date().toISOString() } : {}), updated_at: new Date().toISOString() })
        .eq("id", task.id)
        .eq("status", "pending");
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


  // Automatic student completion SMS. The first recorded payment establishes
  // the 90-day date; any later manual end_date edit is tracked by the DB trigger.
  let completionSmsSent = 0;
  let completionSmsFailed = 0;
  let completionSmsSkipped = 0;
  const { data: activeEnrollments, error: activeEnrollmentError } = await supabaseServer
    .from("student_enrollments")
    .select("id,student_id,status")
    .eq("status", "active")
    .limit(500);

  if (activeEnrollmentError) {
    console.error("Student completion enrollment scan failed:", activeEnrollmentError);
    completionSmsFailed++;
  } else {
    for (const enrollment of activeEnrollments || []) {
      try {
        const [{ data: student, error: studentError }, { data: firstPayment, error: paymentError }] = await Promise.all([
          supabaseServer.from("students")
            .select("id,full_name,whatsapp_number,status")
            .eq("id", enrollment.student_id)
            .maybeSingle(),
          supabaseServer.from("payments")
            .select("payment_date,amount")
            .eq("enrollment_id", enrollment.id)
            .gt("amount", 0)
            .order("payment_date", { ascending: true })
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle(),
        ]);
        if (studentError) throw studentError;
        if (paymentError) throw paymentError;
        if (!student || student.status !== "active" || !firstPayment?.payment_date) {
          completionSmsSkipped++;
          continue;
        }

        const firstPaymentDate = String(firstPayment.payment_date).slice(0, 10);
        const [year, month, day] = firstPaymentDate.split("-").map(Number);
        const calculatedEnd = new Date(Date.UTC(year, month - 1, day));
        calculatedEnd.setUTCDate(calculatedEnd.getUTCDate() + 90);
        const calculatedEndDate = calculatedEnd.toISOString().slice(0, 10);

        const { data: existingSchedule, error: existingScheduleError } = await supabaseServer
          .from("student_completion_sms_schedule")
          .select("manual_end_date")
          .eq("enrollment_id", enrollment.id)
          .maybeSingle();
        if (existingScheduleError) throw existingScheduleError;
        const scheduledFor = existingSchedule?.manual_end_date || calculatedEndDate;

        const { error: scheduleError } = await supabaseServer
          .from("student_completion_sms_schedule")
          .upsert({
            enrollment_id: enrollment.id,
            student_id: student.id,
            first_payment_date: firstPaymentDate,
            calculated_end_date: calculatedEndDate,
            scheduled_for: scheduledFor,
            updated_at: new Date().toISOString(),
          }, { onConflict: "enrollment_id", ignoreDuplicates: false });
        if (scheduleError) throw scheduleError;
      } catch (error) {
        completionSmsFailed++;
        console.error("Student completion schedule refresh failed:", enrollment.id, error);
      }
    }

    if (withinPaymentWindow) {
      const { data: dueCompletionRows, error: dueCompletionError } = await supabaseServer
        .from("student_completion_sms_schedule")
        .select("id,enrollment_id,student_id,scheduled_for,attempt_count")
        .in("status", ["pending", "failed"])
        .lte("scheduled_for", localDate)
        .order("scheduled_for", { ascending: true })
        .limit(50);
  
      if (dueCompletionError) {
        completionSmsFailed++;
        console.error("Due student completion SMS query failed:", dueCompletionError);
      } else {
        for (const row of dueCompletionRows || []) {
          const nowIso = new Date().toISOString();
          const { data: claimed, error: claimError } = await supabaseServer
            .from("student_completion_sms_schedule")
            .update({
              status: "processing",
              attempt_count: Number(row.attempt_count || 0) + 1,
              last_error: null,
              updated_at: nowIso,
            })
            .eq("id", row.id)
            .in("status", ["pending", "failed"])
            .select("id")
            .maybeSingle();
          if (claimError || !claimed) continue;
  
          let attemptedPhone = "";
          let attemptedName = "";
          let attemptedMessage = "";
          let providerAccepted = false;
          try {
            const [{ data: student, error: studentError }, { data: enrollment, error: enrollmentError }, { data: template, error: templateError }] = await Promise.all([
              supabaseServer.from("students")
                .select("id,full_name,whatsapp_number,status")
                .eq("id", row.student_id)
                .maybeSingle(),
              supabaseServer.from("student_enrollments")
                .select("id,student_id,status,end_date")
                .eq("id", row.enrollment_id)
                .maybeSingle(),
              supabaseServer.from("student_completion_sms_templates")
                .select("message,enabled")
                .eq("template_key", "student_completion")
                .maybeSingle(),
            ]);
            if (studentError) throw studentError;
            if (enrollmentError) throw enrollmentError;
            if (templateError) throw templateError;
            if (!student || !enrollment || enrollment.status !== "active" || student.status !== "active") {
              await supabaseServer.from("student_completion_sms_schedule")
                .update({ status: "cancelled", updated_at: new Date().toISOString() })
                .eq("id", row.id).eq("status", "processing");
              completionSmsSkipped++;
              continue;
            }
            if (!template || !template.enabled) {
              await supabaseServer.from("student_completion_sms_schedule")
                .update({ status: "pending", updated_at: new Date().toISOString() })
                .eq("id", row.id).eq("status", "processing");
              completionSmsSkipped++;
              continue;
            }
            if (!student.whatsapp_number?.trim()) throw new Error("Student has no mobile number on record.");
  
            // If the admin used the existing Complete button, its accepted SMS
            // uses this same source key and suppresses the automatic duplicate.
            const source = `student_completion:${row.enrollment_id}`;
            const { data: priorAccepted, error: priorError } = await supabaseServer
              .from("sms_messages")
              .select("id,provider_message_id")
              .eq("source", source)
              .eq("status", "accepted")
              .limit(1)
              .maybeSingle();
            if (priorError) throw priorError;
            if (priorAccepted) {
              await supabaseServer.from("student_completion_sms_schedule")
                .update({
                  status: "accepted",
                  provider_message_id: priorAccepted.provider_message_id || null,
                  sent_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                })
                .eq("id", row.id);
              completionSmsSkipped++;
              continue;
            }
  
            // Re-check the current end date immediately before sending. A manual
            // extension/reschedule means this row is no longer due.
            const { data: currentSchedule, error: currentScheduleError } = await supabaseServer
              .from("student_completion_sms_schedule")
              .select("scheduled_for")
              .eq("id", row.id)
              .single();
            if (currentScheduleError) throw currentScheduleError;
            if (String(currentSchedule.scheduled_for) > localDate) {
              await supabaseServer.from("student_completion_sms_schedule")
                .update({ status: "pending", updated_at: new Date().toISOString() })
                .eq("id", row.id).eq("status", "processing");
              completionSmsSkipped++;
              continue;
            }
  
            attemptedPhone = student.whatsapp_number;
            attemptedName = student.full_name || "";
            attemptedMessage = String(template.message)
              .replace(/{{\s*full_name\s*}}/gi, student.full_name || "there");
            const sentResult = await sendAirTouchSms(attemptedPhone, attemptedMessage);
            if (!sentResult.success) throw new Error(sentResult.error || "AirTouch send failed.");
            providerAccepted = true;
            const sentAt = new Date().toISOString();
            const { error: historyError } = await supabaseServer.from("sms_messages").insert({
              recipient_name: attemptedName || null,
              recipient_phone: attemptedPhone,
              message: attemptedMessage,
              provider: "airtouch",
              provider_status: "1000",
              provider_response: sentResult.response || null,
              provider_message_id: sentResult.providerMessageId || null,
              status: "accepted",
              delivery_status: "accepted_by_provider",
              delivery_status_updated_at: sentAt,
              source,
              sent_by: null,
            });
            if (historyError) console.error("Automatic student completion SMS history insert failed:", historyError);
            await supabaseServer.from("student_completion_sms_schedule")
              .update({
                status: "accepted",
                provider_message_id: sentResult.providerMessageId || null,
                sent_at: sentAt,
                last_error: null,
                updated_at: sentAt,
              })
              .eq("id", row.id).eq("status", "processing");
            completionSmsSent++;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown completion SMS error.";
            completionSmsFailed++;
            console.error("Automatic student completion SMS failed:", row.enrollment_id, errorMessage);
            if (!providerAccepted && attemptedPhone && attemptedMessage) {
              const { error: failureHistoryError } = await supabaseServer.from("sms_messages").insert({
                recipient_name: attemptedName || null,
                recipient_phone: attemptedPhone,
                message: attemptedMessage,
                provider: "airtouch",
                provider_status: "error",
                provider_response: errorMessage,
                status: "failed",
                delivery_status: "not_accepted",
                delivery_status_updated_at: new Date().toISOString(),
                source: `student_completion:${row.enrollment_id}`,
                sent_by: null,
              });
              if (failureHistoryError) console.error("Completion SMS failure history insert failed:", failureHistoryError);
            }
            await supabaseServer.from("student_completion_sms_schedule")
              .update({
                status: providerAccepted ? "accepted" : "failed",
                last_error: errorMessage.slice(0, 500),
                updated_at: new Date().toISOString(),
                ...(providerAccepted ? { sent_at: new Date().toISOString() } : {}),
              })
              .eq("id", row.id).eq("status", "processing");
          }
        }
  
    }
    }
  }


  // Student one-month remaining notice. The 90-day end date is derived from
  // the first positive payment and respects any manually adjusted end date.
  // The notice is due exactly 30 calendar days before that effective end date.
  let oneMonthNoticeSent = 0;
  let oneMonthNoticeFailed = 0;
  let oneMonthNoticeSkipped = 0;
  const { data: completionSchedulesForNotice, error: noticeScheduleSourceError } = await supabaseServer
    .from("student_completion_sms_schedule")
    .select("enrollment_id,student_id,scheduled_for");

  if (noticeScheduleSourceError) {
    console.error("One-month notice source schedule query failed:", noticeScheduleSourceError);
    oneMonthNoticeFailed++;
  } else {
    for (const completionSchedule of completionSchedulesForNotice || []) {
      try {
        const endDate = String(completionSchedule.scheduled_for).slice(0, 10);
        const [endYear, endMonth, endDay] = endDate.split("-").map(Number);
        const noticeDate = new Date(Date.UTC(endYear, endMonth - 1, endDay));
        noticeDate.setUTCDate(noticeDate.getUTCDate() - 30);
        const scheduledNoticeDate = noticeDate.toISOString().slice(0, 10);
        const { data: existingNotice, error: existingNoticeError } = await supabaseServer
          .from("student_one_month_notice_sms_schedule")
          .select("id,status,scheduled_for")
          .eq("enrollment_id", completionSchedule.enrollment_id)
          .maybeSingle();
        if (existingNoticeError) throw existingNoticeError;

        if (!existingNotice) {
          const { error: insertNoticeError } = await supabaseServer
            .from("student_one_month_notice_sms_schedule")
            .insert({
              enrollment_id: completionSchedule.enrollment_id,
              student_id: completionSchedule.student_id,
              end_date: endDate,
              scheduled_for: scheduledNoticeDate,
              status: scheduledNoticeDate < localDate ? "expired" : "pending",
            });
          if (insertNoticeError) throw insertNoticeError;
        } else if (existingNotice.status !== "accepted" && existingNotice.status !== "processing" && existingNotice.status !== "skipped") {
          const isExpired = scheduledNoticeDate < localDate;
          if (String(existingNotice.scheduled_for) !== scheduledNoticeDate || (isExpired && existingNotice.status !== "expired")) {
            const { error: refreshNoticeError } = await supabaseServer
              .from("student_one_month_notice_sms_schedule")
              .update({
                student_id: completionSchedule.student_id,
                end_date: endDate,
                scheduled_for: scheduledNoticeDate,
                status: isExpired ? "expired" : "pending",
                last_error: null,
                updated_at: new Date().toISOString(),
              })
              .eq("id", existingNotice.id);
            if (refreshNoticeError) throw refreshNoticeError;
          }
        }
      } catch (error) {
        oneMonthNoticeFailed++;
        console.error("One-month notice schedule refresh failed:", completionSchedule.enrollment_id, error);
      }
    }

    // Expire any missed notification dates. We intentionally never send a
    // catch-up notice once the student has fewer than 30 days remaining.
    const { error: expireNoticeError } = await supabaseServer
      .from("student_one_month_notice_sms_schedule")
      .update({ status: "expired", updated_at: new Date().toISOString() })
      .in("status", ["pending", "failed"])
      .lt("scheduled_for", localDate);
    if (expireNoticeError) {
      console.error("One-month notice expiry update failed:", expireNoticeError);
      oneMonthNoticeFailed++;
    }

    if (withinPaymentWindow) {
      const { data: dueNotices, error: dueNoticeError } = await supabaseServer
        .from("student_one_month_notice_sms_schedule")
        .select("id,enrollment_id,student_id,end_date,scheduled_for,attempt_count")
        .eq("scheduled_for", localDate)
        .in("status", ["pending", "failed"])
        .order("created_at", { ascending: true })
        .limit(50);

      if (dueNoticeError) {
        console.error("One-month notice due query failed:", dueNoticeError);
        oneMonthNoticeFailed++;
      } else {
        for (const notice of dueNotices || []) {
          const claimTime = new Date().toISOString();
          const { data: claimedNotice, error: claimNoticeError } = await supabaseServer
            .from("student_one_month_notice_sms_schedule")
            .update({
              status: "processing",
              attempt_count: Number(notice.attempt_count || 0) + 1,
              last_error: null,
              updated_at: claimTime,
            })
            .eq("id", notice.id)
            .in("status", ["pending", "failed"])
            .select("id")
            .maybeSingle();
          if (claimNoticeError || !claimedNotice) continue;

          let attemptedPhone = "";
          let attemptedName = "";
          let attemptedMessage = "";
          let providerAccepted = false;
          try {
            const [{ data: student, error: studentError }, { data: enrollment, error: enrollmentError }, { data: template, error: templateError }, { data: currentCompletionSchedule, error: currentCompletionScheduleError }] = await Promise.all([
              supabaseServer.from("students")
                .select("id,full_name,whatsapp_number,status")
                .eq("id", notice.student_id)
                .maybeSingle(),
              supabaseServer.from("student_enrollments")
                .select("id,student_id,status")
                .eq("id", notice.enrollment_id)
                .maybeSingle(),
              supabaseServer.from("student_one_month_notice_sms_templates")
                .select("message,enabled")
                .eq("template_key", "one_month_remaining")
                .maybeSingle(),
              supabaseServer.from("student_completion_sms_schedule")
                .select("scheduled_for")
                .eq("enrollment_id", notice.enrollment_id)
                .maybeSingle(),
            ]);
            if (studentError) throw studentError;
            if (enrollmentError) throw enrollmentError;
            if (templateError) throw templateError;
            if (currentCompletionScheduleError) throw currentCompletionScheduleError;

            if (!student || !enrollment || enrollment.status !== "active" || student.status !== "active") {
              await supabaseServer.from("student_one_month_notice_sms_schedule")
                .update({ status: "skipped", updated_at: new Date().toISOString() })
                .eq("id", notice.id).eq("status", "processing");
              oneMonthNoticeSkipped++;
              continue;
            }
            if (!template || !template.enabled) {
              await supabaseServer.from("student_one_month_notice_sms_schedule")
                .update({ status: "skipped", last_error: "One-month notice template is disabled.", updated_at: new Date().toISOString() })
                .eq("id", notice.id).eq("status", "processing");
              oneMonthNoticeSkipped++;
              continue;
            }
            if (String(currentCompletionSchedule?.scheduled_for || "") !== String(notice.end_date)) {
              await supabaseServer.from("student_one_month_notice_sms_schedule")
                .update({ status: "pending", updated_at: new Date().toISOString() })
                .eq("id", notice.id).eq("status", "processing");
              oneMonthNoticeSkipped++;
              continue;
            }
            if (String(notice.scheduled_for) !== localDate) {
              await supabaseServer.from("student_one_month_notice_sms_schedule")
                .update({ status: String(notice.scheduled_for) < localDate ? "expired" : "pending", updated_at: new Date().toISOString() })
                .eq("id", notice.id).eq("status", "processing");
              oneMonthNoticeSkipped++;
              continue;
            }
            if (!student.whatsapp_number?.trim()) throw new Error("Student has no mobile number on record.");

            const source = `student_one_month_remaining:${notice.enrollment_id}`;
            const { data: priorAcceptedNotice, error: priorAcceptedNoticeError } = await supabaseServer
              .from("sms_messages")
              .select("id")
              .eq("source", source)
              .eq("status", "accepted")
              .limit(1)
              .maybeSingle();
            if (priorAcceptedNoticeError) throw priorAcceptedNoticeError;
            if (priorAcceptedNotice) {
              await supabaseServer.from("student_one_month_notice_sms_schedule")
                .update({ status: "accepted", sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
                .eq("id", notice.id);
              oneMonthNoticeSkipped++;
              continue;
            }

            const formatEndDate = (value: string) => new Intl.DateTimeFormat("en-KE", {
              day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Nairobi",
            }).format(new Date(`${value}T12:00:00+03:00`));
            const fullName = String(student.full_name || "").trim() || "there";
            const firstName = fullName.split(/\\s+/)[0] || "there";
            attemptedPhone = student.whatsapp_number;
            attemptedName = fullName;
            attemptedMessage = String(template.message)
              .replace(/{{\\s*full_name\\s*}}/gi, fullName)
              .replace(/{{\\s*first_name\\s*}}/gi, firstName)
              .replace(/{{\\s*end_date\\s*}}/gi, formatEndDate(String(notice.end_date)));

            const sendResult = await sendAirTouchSms(attemptedPhone, attemptedMessage);
            if (!sendResult.success) throw new Error(sendResult.error || "AirTouch send failed.");
            providerAccepted = true;
            const sentAt = new Date().toISOString();
            const { error: historyError } = await supabaseServer.from("sms_messages").insert({
              recipient_name: attemptedName,
              recipient_phone: attemptedPhone,
              message: attemptedMessage,
              provider: "airtouch",
              provider_status: "1000",
              provider_response: sendResult.response || null,
              provider_message_id: sendResult.providerMessageId || null,
              status: "accepted",
              delivery_status: "accepted_by_provider",
              delivery_status_updated_at: sentAt,
              source,
              sent_by: null,
            });
            if (historyError) console.error("One-month notice SMS history insert failed:", historyError);
            await supabaseServer.from("student_one_month_notice_sms_schedule")
              .update({
                status: "accepted",
                provider_message_id: sendResult.providerMessageId || null,
                sent_at: sentAt,
                last_error: null,
                updated_at: sentAt,
              })
              .eq("id", notice.id).eq("status", "processing");
            oneMonthNoticeSent++;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown one-month notice SMS error.";
            oneMonthNoticeFailed++;
            console.error("One-month remaining SMS failed:", notice.enrollment_id, errorMessage);
            if (!providerAccepted && attemptedPhone && attemptedMessage) {
              const { error: failureHistoryError } = await supabaseServer.from("sms_messages").insert({
                recipient_name: attemptedName || null,
                recipient_phone: attemptedPhone,
                message: attemptedMessage,
                provider: "airtouch",
                provider_status: "error",
                provider_response: errorMessage,
                status: "failed",
                delivery_status: "not_accepted",
                delivery_status_updated_at: new Date().toISOString(),
                source: `student_one_month_remaining:${notice.enrollment_id}`,
                sent_by: null,
              });
              if (failureHistoryError) console.error("One-month notice failure history insert failed:", failureHistoryError);
            }
            await supabaseServer.from("student_one_month_notice_sms_schedule")
              .update({
                status: providerAccepted ? "accepted" : "failed",
                last_error: errorMessage.slice(0, 500),
                updated_at: new Date().toISOString(),
                ...(providerAccepted ? { sent_at: new Date().toISOString() } : {}),
              })
              .eq("id", notice.id).eq("status", "processing");
          }
        }
      }
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
    completionSmsSent,
    completionSmsFailed,
    completionSmsSkipped,
    oneMonthNoticeSent,
    oneMonthNoticeFailed,
    oneMonthNoticeSkipped,
    results,
  });
}

export async function GET(request: NextRequest) {
  return processSms(request);
}
export async function POST(request: NextRequest) {
  return processSms(request);
}
