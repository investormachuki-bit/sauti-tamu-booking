import "server-only";
import { createHash } from "node:crypto";

export type AirTouchResult = {
  success: boolean;
  status?: number;
  response?: string;
  error?: string;
};

export function normalizeKenyanMsisdn(value: string): string {
  const digits = value.replace(/\\D/g, "");
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.startsWith("254")) return digits;
  if (digits.startsWith("0")) return `254${digits.slice(1)}`;
  if (digits.length === 9) return `254${digits}`;
  return digits;
}

export async function sendAirTouchSms(
  msisdn: string,
  message: string,
): Promise<AirTouchResult> {
  const baseUrl = process.env.AIRTOUCH_API_URL;
  const issn = process.env.AIRTOUCH_ISSN || "SAUTI_TAMU";
  const username = process.env.AIRTOUCH_USERNAME;
  const apiKey = process.env.AIRTOUCH_API_KEY;

  if (!baseUrl || !username || !apiKey) {
    return {
      success: false,
      error: "AirTouch is not configured. Set AIRTOUCH_API_URL, AIRTOUCH_ISSN, AIRTOUCH_USERNAME and AIRTOUCH_API_KEY.",
    };
  }

  const recipient = normalizeKenyanMsisdn(msisdn);
  if (!/^254\\d{9}$/.test(recipient)) {
    return { success: false, error: "Invalid Kenyan mobile number." };
  }

  // AirTouch documentation specifies MD5(API key), hexadecimal, as the password.
  const passwordHash = createHash("md5").update(apiKey, "utf8").digest("hex");

  try {
    const response = await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
        issn,
        msisdn: Number(recipient),
        text: message,
        username,
        password: passwordHash,
      }),
    });

    const rawBody = (await response.text()).slice(0, 1000);
    // Redact secrets if the provider echoes request data in its response.
    const body = rawBody
      .replaceAll(username, "[redacted]")
      .replaceAll(apiKey, "[redacted]")
      .replaceAll(passwordHash, "[redacted]");

    let providerCode: string | undefined;
    let providerDescription: string | undefined;
    try {
      const parsed = JSON.parse(rawBody) as {
        status_code?: string | number;
        status_desc?: string;
      };
      providerCode = parsed.status_code == null ? undefined : String(parsed.status_code);
      providerDescription = parsed.status_desc;
    } catch {
      // Keep the raw, redacted provider response for diagnostics.
    }

    const accepted = response.ok && providerCode === "1000";
    return {
      success: accepted,
      status: response.status,
      response: body,
      ...(!accepted
        ? {
            error: providerCode
              ? `AirTouch rejected the SMS (code ${providerCode}${providerDescription ? `: ${providerDescription}` : ""}).`
              : `AirTouch returned an unexpected response (HTTP ${response.status}).`,
          }
        : {}),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "AirTouch request failed.",
    };
  }
}
