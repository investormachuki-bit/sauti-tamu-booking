import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { sendAirTouchSms } from "@/lib/airtouch";

const TASK_TYPES = [
  "trial_reminder_7d",
  "trial_reminder_3d",
  "trial_reminder_24h",
  "trial_reminder_6h",
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
    try {
      const { data: lead, error: leadError } = await supabaseServer
        .from("leads")
        .select("id, full_name, whatsapp_number")
        .eq("id", task.lead_id)
        .single();
      if (leadError || !lead) throw new Error("Lead not found.");
      if (!lead.whatsapp_number) throw new Error("Lead has no mobile number.");

      if (!task.booking_id) throw new Error("Reminder has no booking.");

      const { data: booking, error: bookingError } = await supabaseServer
        .from("bookings")
        .select("id, instrument, status, slot_id")
        .eq("id", task.booking_id)
        .single();
      if (bookingError || !booking) throw new Error("Booking not found.");

      if (["cancelled", "no_show", "missed", "rescheduled"].includes(String(booking.status).toLowerCase())) {
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
          .replace(/{{\\s*full_name\\s*}}/gi, lead.full_name || "there")
          .replace(/{{\\s*instrument\\s*}}/gi, label)
          .replace(/{{\\s*lesson_date\\s*}}/gi, date)
          .replace(/{{\\s*lesson_time\\s*}}/gi, time);
      }

      const sentResult = await sendAirTouchSms(lead.whatsapp_number, message);
      if (!sentResult.success) throw new Error(sentResult.error || "AirTouch send failed.");

      const now = new Date().toISOString();
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
      results.push({ taskId: task.id, success: false, error: message });
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
        supabaseServer.from("manychat_whatsapp_contacts").select("id,phone_e164,full_name,sms_marketing_opt_in").eq("id", item.contact_id).single(),
        supabaseServer.from("manychat_followup_templates").select("id,name,message,enabled").eq("id", item.template_id).single(),
      ]);
      if (contactError || !contact) throw new Error("ManyChat contact not found.");
      if (!contact.sms_marketing_opt_in) {
        await supabaseServer.from("manychat_followup_queue").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", item.id);
        continue;
      }
      if (templateError || !template || !template.enabled) {
        await supabaseServer.from("manychat_followup_queue").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", item.id);
        continue;
      }
      const message = String(template.message).replace(/{{\\s*full_name\\s*}}/gi, contact.full_name || "there");
      const sentResult = await sendAirTouchSms(contact.phone_e164, message);
      if (!sentResult.success) throw new Error(sentResult.error || "AirTouch send failed.");
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
      await supabaseServer.from("manychat_followup_queue").update({
        status: "pending",
        attempts: Number(item.attempts || 0) + 1,
        last_error: message.slice(0, 500),
        updated_at: new Date().toISOString(),
      }).eq("id", item.id);
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
    results,
  });
}

export async function GET(request: NextRequest) {
  return processSms(request);
}
export async function POST(request: NextRequest) {
  return processSms(request);
}
