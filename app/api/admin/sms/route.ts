import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { sendAirTouchSms, normalizeKenyanMsisdn } from "@/lib/airtouch";

export const runtime = "nodejs";

async function authenticate(request: NextRequest) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;
  const { data, error } = await supabaseServer.auth.getUser(token);
  return error || !data.user ? null : data.user;
}

export async function GET(request: NextRequest) {
  const user = await authenticate(request);
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const [logs, templates, manychatContacts, followupTemplates, followupQueue, trialEventTemplates, coreTemplates, trialReminderTemplates] = await Promise.all([
    supabaseServer.from("sms_messages").select("*").order("created_at", { ascending: false }).limit(300),
    supabaseServer.from("sms_templates").select("*").order("name"),
    supabaseServer.from("manychat_whatsapp_contacts").select("id,manychat_contact_id,phone_e164,first_name,last_name,full_name,tags,whatsapp_opted_in,sms_marketing_opt_in,sms_consent_at,synced_at").order("synced_at", { ascending: false }).limit(5000),
    supabaseServer.from("manychat_followup_templates").select("*").order("day_offset"),
    supabaseServer.from("manychat_followup_queue").select("status,day_offset").limit(10000),
    supabaseServer.from("trial_event_sms_templates").select("*").order("event_key"),
    supabaseServer.from("core_sms_templates").select("*").order("template_key"),
    supabaseServer.from("trial_reminder_sms_templates").select("*").order("reminder_key"),
  ]);
  if (logs.error || templates.error || manychatContacts.error || followupTemplates.error || followupQueue.error || trialEventTemplates.error || coreTemplates.error || trialReminderTemplates.error) {
    console.error("SMS Centre load failed:", logs.error || templates.error || manychatContacts.error);
    return NextResponse.json({ error: "Could not load SMS records and audiences. Confirm the latest database migration has been applied." }, { status: 500 });
  }
  return NextResponse.json({
    logs: logs.data || [],
    templates: templates.data || [],
    manychatContacts: manychatContacts.data || [],
    manychatFollowupTemplates: followupTemplates.data || [],
    trialEventTemplates: trialEventTemplates.data || [],
    coreTemplates: coreTemplates.data || [],
    trialReminderTemplates: trialReminderTemplates.data || [],
    manychatFollowupStats: (followupQueue.data || []).reduce((stats: Record<string, number>, item: {status:string}) => { stats[item.status] = (stats[item.status] || 0) + 1; return stats; }, {}),
  });
}

export async function POST(request: NextRequest) {
  const user = await authenticate(request);
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  try {
    const body = await request.json();
    if (body.action === "save-template") {
      const name = String(body.name || "").trim();
      const message = String(body.message || "").trim();
      if (!name || !message || message.length > 480) return NextResponse.json({ error: "Enter a template name and a message of up to 480 characters." }, { status: 400 });
      const result = body.id
        ? await supabaseServer.from("sms_templates").update({ name, category: String(body.category || "general"), message, updated_at: new Date().toISOString() }).eq("id", body.id).select().single()
        : await supabaseServer.from("sms_templates").insert({ name, category: String(body.category || "general"), message }).select().single();
      if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
      return NextResponse.json({ success: true, template: result.data });
    }
    if (body.action === "save-trial-reminder-template") {
      const id = String(body.id || "");
      const message = String(body.message || "").trim();
      if (!id || !message || message.length > 480) return NextResponse.json({ error: "Enter a message of up to 480 characters." }, { status: 400 });
      const { data, error } = await supabaseServer.from("trial_reminder_sms_templates").update({ message, enabled: body.enabled !== false, updated_at: new Date().toISOString() }).eq("id", id).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, template: data });
    }
    if (body.action === "save-core-sms-template") {
      const id = String(body.id || "");
      const message = String(body.message || "").trim();
      if (!id || !message || message.length > 480) return NextResponse.json({ error: "Enter a message of up to 480 characters." }, { status: 400 });
      const { data, error } = await supabaseServer.from("core_sms_templates").update({ message, enabled: body.enabled !== false, updated_at: new Date().toISOString() }).eq("id", id).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, template: data });
    }
    if (body.action === "save-trial-event-template") {
      const id = String(body.id || "");
      const message = String(body.message || "").trim();
      if (!id || !message || message.length > 480) return NextResponse.json({ error: "Enter a message of up to 480 characters." }, { status: 400 });
      const { data, error } = await supabaseServer.from("trial_event_sms_templates").update({ message, enabled: body.enabled !== false, updated_at: new Date().toISOString() }).eq("id", id).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, template: data });
    }
    if (body.action === "save-manychat-followup-template") {
      const id = String(body.id || "");
      const message = String(body.message || "").trim();
      if (!id || !message || message.length > 480) return NextResponse.json({ error: "Enter a message of up to 480 characters." }, { status: 400 });
      const { data, error } = await supabaseServer
        .from("manychat_followup_templates")
        .update({ message, enabled: body.enabled !== false, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, template: data });
    }
    if (body.action === "delete-template") {
      const { error } = await supabaseServer.from("sms_templates").delete().eq("id", body.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }
    if (body.action !== "send") return NextResponse.json({ error: "Unknown action." }, { status: 400 });

    const message = String(body.message || "").trim();
    const recipients = Array.isArray(body.recipients) ? body.recipients : [];
    if (!message || message.length > 480) return NextResponse.json({ error: "Message must contain 1–480 characters." }, { status: 400 });
    if (!recipients.length || recipients.length > 100) return NextResponse.json({ error: "Select between 1 and 100 recipients per send." }, { status: 400 });

    const unique = new Map<string, { phone: string; name: string }>();
    for (const item of recipients) {
      const phone = normalizeKenyanMsisdn(String(item.phone || ""));
      if (!/^254\d{9}$/.test(phone) && !/^\d{8,15}$/.test(phone)) continue;
      unique.set(phone, { phone, name: String(item.name || "").slice(0, 120) });
    }
    if (!unique.size) return NextResponse.json({ error: "No valid recipient numbers were supplied." }, { status: 400 });

    const results = [];
    for (const recipient of unique.values()) {
      const personalized = message.replace(/{{\s*full_name\s*}}/gi, recipient.name || "there");
      const sent = await sendAirTouchSms(recipient.phone, personalized);
      const status = sent.success ? "accepted" : "failed";
      const { error: logError } = await supabaseServer.from("sms_messages").insert({
        recipient_name: recipient.name || null,
        recipient_phone: recipient.phone,
        message: personalized,
        provider: "airtouch",
        provider_status: sent.success ? "1000" : String(sent.status || "error"),
        provider_response: sent.response || sent.error || null,
        status,
        source: "manual",
        sent_by: user.id,
      });
      results.push({ phone: recipient.phone, name: recipient.name, success: sent.success, error: sent.error || (logError ? "Sent but history could not be saved." : undefined) });
    }
    return NextResponse.json({ success: true, total: results.length, accepted: results.filter(x => x.success).length, failed: results.filter(x => !x.success).length, results });
  } catch (error) {
    console.error("SMS Centre error:", error);
    return NextResponse.json({ error: "Could not process the SMS Centre request." }, { status: 500 });
  }
}
