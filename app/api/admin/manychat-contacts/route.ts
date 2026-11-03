import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function authenticate(request: NextRequest) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;
  const { data, error } = await supabaseServer.auth.getUser(token);
  return error || !data.user ? null : data.user;
}

export async function GET(request: NextRequest) {
  const user = await authenticate(request);
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { data, error } = await supabaseServer
    .from("manychat_whatsapp_contacts")
    .select("id,manychat_contact_id,phone_e164,first_name,last_name,full_name,tags,whatsapp_opted_in,sms_marketing_opt_in,sms_consent_at,first_seen_at,last_seen_at,synced_at")
    .order("synced_at", { ascending: false })
    .limit(5000);

  if (error) {
    console.error("ManyChat contacts load failed:", error);
    return NextResponse.json({
      error: "Could not load ManyChat contacts. Confirm the contacts database migration has been applied.",
    }, { status: 500 });
  }

  return NextResponse.json({ contacts: data || [] });
}
