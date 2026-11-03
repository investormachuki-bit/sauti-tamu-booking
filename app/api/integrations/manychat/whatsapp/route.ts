import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { supabaseServer } from "@/lib/supabase-server";
import { normalizeKenyanMsisdn } from "@/lib/airtouch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
}

function validSecret(received: string | null, expected: string) {
  if (!received) return false;
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

function normalizeWhatsAppNumber(value: string): string | null {
  const digits = value.replace(/\\D/g, "");
  if (!digits) return null;
  const normalized = digits.startsWith("254") || digits.startsWith("0") || digits.length === 9
    ? normalizeKenyanMsisdn(digits)
    : digits;
  if (!/^\\d{8,15}$/.test(normalized)) return null;
  return `+${normalized}`;
}

function cleanTags(value: unknown): string[] {
  const values = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];
  return [...new Set(values
    .filter((item): item is string => typeof item === "string")
    .map(item => item.trim().slice(0, 80))
    .filter(Boolean))].slice(0, 100);
}

export async function POST(request: NextRequest) {
  const secret = process.env.MANYCHAT_WEBHOOK_SECRET;
  if (!secret || !validSecret(request.headers.get("x-manychat-secret"), secret)) {
    return unauthorized();
  }

  try {
    const raw = await request.text();
    if (!raw || raw.length > 32_000) {
      return NextResponse.json({ success: false, error: "Invalid payload size." }, { status: 413 });
    }

    const payload = JSON.parse(raw);
    const contact = payload.contact && typeof payload.contact === "object"
      ? { ...payload.contact, ...payload }
      : payload;

    const contactId = String(contact.contact_id ?? contact.id ?? "").trim();
    const phoneInput = String(contact.whatsapp_id ?? contact.whatsappId ?? contact.phone ?? "").trim();
    const phone = normalizeWhatsAppNumber(phoneInput);
    if (!contactId || contactId.length > 160 || !phone) {
      return NextResponse.json({
        success: false,
        error: "A ManyChat Contact ID and valid WhatsApp ID phone number are required.",
      }, { status: 400 });
    }

    const firstName = String(contact.first_name ?? "").trim().slice(0, 120) || null;
    const lastName = String(contact.last_name ?? "").trim().slice(0, 120) || null;
    const fullName = String(contact.full_name ?? contact.name ?? [firstName, lastName].filter(Boolean).join(" ")).trim().slice(0, 240) || null;
    const tags = cleanTags(contact.tags);
    const whatsappOptedIn = contact.whatsapp_opted_in === true || contact.opted_in_for_whatsapp === true;
    const hasSmsConsentField = Object.prototype.hasOwnProperty.call(contact, "sms_marketing_opt_in");
    const explicitSmsOptIn = hasSmsConsentField && contact.sms_marketing_opt_in === true;

    const { data: existing, error: existingError } = await supabaseServer
      .from("manychat_whatsapp_contacts")
      .select("id,sms_marketing_opt_in,sms_consent_at,sms_consent_source,first_seen_at")
      .eq("manychat_contact_id", contactId)
      .maybeSingle();
    if (existingError) throw existingError;

    const now = new Date().toISOString();
    const smsOptIn = hasSmsConsentField
      ? contact.sms_marketing_opt_in === true
      : existing?.sms_marketing_opt_in === true;
    const consentAt = smsOptIn
      ? String(explicitSmsOptIn ? (contact.sms_consent_at || existing?.sms_consent_at || now) : (existing?.sms_consent_at || now))
      : null;

    const record = {
      manychat_contact_id: contactId,
      phone_e164: phone,
      first_name: firstName,
      last_name: lastName,
      full_name: fullName,
      tags,
      whatsapp_opted_in: whatsappOptedIn,
      sms_marketing_opt_in: smsOptIn,
      sms_consent_at: smsOptIn ? consentAt : null,
      sms_consent_source: !smsOptIn
        ? null
        : explicitSmsOptIn
          ? String(contact.sms_consent_source || "ManyChat explicit SMS consent").slice(0, 160)
          : existing?.sms_consent_source || "Previously recorded SMS consent",
      raw_payload: payload,
      first_seen_at: existing?.first_seen_at || now,
      last_seen_at: now,
      synced_at: now,
      updated_at: now,
    };

    const { data, error } = await supabaseServer
      .from("manychat_whatsapp_contacts")
      .upsert(record, { onConflict: "manychat_contact_id" })
      .select("id,manychat_contact_id,phone_e164,sms_marketing_opt_in,tags,synced_at")
      .single();
    if (error) throw error;

    return NextResponse.json({ success: true, contact: data });
  } catch (error) {
    console.error("ManyChat WhatsApp sync failed:", error);
    return NextResponse.json({ success: false, error: "Could not sync this ManyChat contact." }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ success: false, error: "Method not allowed." }, { status: 405 });
}
