import "server-only";

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
  const password = process.env.AIRTOUCH_PASSWORD;

  if (!baseUrl || !username || !password) {
    return {
      success: false,
      error: "AirTouch is not configured. Set AIRTOUCH_API_URL, AIRTOUCH_USERNAME and AIRTOUCH_PASSWORD.",
    };
  }

  const recipient = normalizeKenyanMsisdn(msisdn);
  if (!/^254\\d{9}$/.test(recipient)) {
    return { success: false, error: "Invalid Kenyan mobile number." };
  }

  const url = new URL(baseUrl);
  url.search = new URLSearchParams({
    issn,
    msisdn: recipient,
    text: message,
    username,
    password,
  }).toString();

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    const body = (await response.text()).slice(0, 1000);
    const rejected = /\\b(error|failed|failure|invalid|denied)\\b/i.test(body);

    return {
      success: response.ok && !rejected,
      status: response.status,
      response: body,
      ...(!response.ok || rejected
        ? { error: `AirTouch rejected the SMS request (HTTP ${response.status}).` }
        : {}),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "AirTouch request failed.",
    };
  }
}
