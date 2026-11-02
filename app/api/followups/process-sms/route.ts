import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { sendAirTouchSms } from "@/lib/airtouch";

const TASK_TYPES = [
  "trial_reminder_7d",
  "trial_reminder_3d",
  "trial_reminder_24h",
  "trial_reminder_6h",
  "trial_reminder_1h",
] as const;

function responseError(error: string, status = 500) {
  return NextResponse.json({ success: false, error }, { status });
}

async function processSms(request: NextRequest) {
  const secret = process.env.FOLLOWUP_CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!secret || authorization !== `Bearer ${secret}`) {
    return responseError("Unauthorized.", 401);
  }

  const { data: tasks, error } = await supabaseServer
    .from("follow_up_tasks")
    .select("id, lead_id, booking_id, task_type")
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

      if (["cancelled", "no_show"].includes(String(booking.status).toLowerCase())) {
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
      const date = new Intl.DateTimeFormat("en-KE", {
        weekday: "long", day: "numeric", month: "long",
        timeZone: "Africa/Nairobi",
      }).format(startsAt);
      const time = new Intl.DateTimeFormat("en-KE", {
        hour: "2-digit", minute: "2-digit", hour12: false,
        timeZone: "Africa/Nairobi",
      }).format(startsAt);
      const label = String(booking.instrument || "music").toLowerCase() === "piano" ? "piano" : "guitar";
      const message = `Hello ${lead.full_name}, this is a reminder of your Sauti Tamu ${label} trial lesson on ${date} at ${time}. We look forward to seeing you. Sauti Tamu Piano Center.`;

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

  return NextResponse.json({ success: true, processed: tasks?.length ?? 0, sent, failed, results });
}

export async function GET(request: NextRequest) {
  return processSms(request);
}
export async function POST(request: NextRequest) {
  return processSms(request);
}
