import { NextRequest, NextResponse } from "next/server";

const MANYCHAT_API_BASE = "https://api.manychat.com";
const MANYCHAT_TOKEN = process.env.MANYCHAT_API_TOKEN;
const MANYCHAT_BOOKING_TAG =
  process.env.MANYCHAT_BOOKING_TAG || "TRIAL LESSON BOOKED";
const MANYCHAT_CONSENT_PHRASE =
  process.env.MANYCHAT_CONSENT_PHRASE ||
  "I agreed to receive Sauti Tamu trial lesson follow-up messages on WhatsApp.";

type BookingIntegrationPayload = {
  bookingId: string;
  leadId: string | null;
  fullName: string;
  email: string;
  whatsappNumber: string;
  instrument: string;
  bookingStatus: string;
  startsAt: string | null;
  endsAt: string | null;
};

type ManyChatSubscriber = {
  id?: number | string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
  whatsappPhone?: string;
};

type ManyChatResponse<T> = {
  status?: string;
  message?: string;
  data?: T;
};

function normalizePhone(value: string) {
  const trimmed = value.trim();

  if (trimmed.startsWith("+")) {
    return `+${trimmed.slice(1).replace(/\D/g, "")}`;
  }

  return trimmed.replace(/\D/g, "");
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const firstName = parts.shift() || fullName.trim();
  const lastName = parts.join(" ");

  return { firstName, lastName };
}

async function manychatRequest<T>(
  path: string,
  init: RequestInit,
): Promise<ManyChatResponse<T>> {
  if (!MANYCHAT_TOKEN) {
    throw new Error("MANYCHAT_API_TOKEN is not configured.");
  }

  const response = await fetch(`${MANYCHAT_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${MANYCHAT_TOKEN}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });

  const body = (await response.json().catch(() => ({}))) as ManyChatResponse<T>;

  if (!response.ok) {
    throw new Error(
      typeof body?.message === "string"
        ? body.message
        : `ManyChat request failed with HTTP ${response.status}.`,
    );
  }

  return body;
}

async function findExistingSubscriber(
  email: string,
  phone: string,
): Promise<ManyChatSubscriber | null> {
  // ManyChat's current findBySystemField endpoint uses GET query parameters
  // and supports email or phone. We try email first because it is generally
  // the most reliable identifier for contacts created outside WhatsApp.
  if (email) {
    try {
      const result = await manychatRequest<ManyChatSubscriber[]>(
        `/fb/subscriber/findBySystemField?email=${encodeURIComponent(email)}`,
        { method: "GET" },
      );

      const subscriber = Array.isArray(result.data)
        ? result.data[0]
        : undefined;

      if (subscriber?.id !== undefined) {
        return subscriber;
      }
    } catch (error) {
      console.warn("ManyChat email lookup failed:", error);
    }
  }

  if (phone) {
    try {
      const result = await manychatRequest<ManyChatSubscriber[]>(
        `/fb/subscriber/findBySystemField?phone=${encodeURIComponent(phone)}`,
        { method: "GET" },
      );

      const subscriber = Array.isArray(result.data)
        ? result.data[0]
        : undefined;

      if (subscriber?.id !== undefined) {
        return subscriber;
      }
    } catch (error) {
      console.warn("ManyChat phone lookup failed:", error);
    }
  }

  return null;
}

async function createWhatsappSubscriber(
  payload: BookingIntegrationPayload,
): Promise<ManyChatSubscriber> {
  const { firstName, lastName } = splitName(payload.fullName);
  const whatsappPhone = normalizePhone(payload.whatsappNumber);

  if (!whatsappPhone) {
    throw new Error("A valid WhatsApp number is required for ManyChat.");
  }

  const result = await manychatRequest<ManyChatSubscriber | ManyChatSubscriber[]>(
    "/fb/subscriber/createSubscriber",
    {
      method: "POST",
      body: JSON.stringify({
        first_name: firstName,
        ...(lastName ? { last_name: lastName } : {}),
        email: payload.email || undefined,
        whatsapp_phone: whatsappPhone,
        consent_phrase: MANYCHAT_CONSENT_PHRASE,
      }),
    },
  );

  const subscriber = Array.isArray(result.data)
    ? result.data[0]
    : result.data;

  if (!subscriber?.id) {
    throw new Error("ManyChat did not return a subscriber ID after creation.");
  }

  return subscriber;
}

async function findOrCreateSubscriber(
  payload: BookingIntegrationPayload,
): Promise<ManyChatSubscriber> {
  const email = payload.email.trim().toLowerCase();
  const phone = normalizePhone(payload.whatsappNumber);

  const existing = await findExistingSubscriber(email, phone);

  if (existing?.id !== undefined) {
    return existing;
  }

  try {
    return await createWhatsappSubscriber(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    // If ManyChat says the WhatsApp contact already exists, retry the normal
    // system-field lookup. This handles contacts that have a normal phone
    // field populated even when they were originally created through WhatsApp.
    if (/already exists|already exist|duplicate/i.test(message)) {
      const retry = await findExistingSubscriber(email, phone);

      if (retry?.id !== undefined) {
        return retry;
      }
    }

    throw error;
  }
}

async function addBookingTag(subscriberId: number | string) {
  const result = await manychatRequest(
    "/fb/subscriber/addTagByName",
    {
      method: "POST",
      body: JSON.stringify({
        subscriber_id: subscriberId,
        tag_name: MANYCHAT_BOOKING_TAG,
      }),
    },
  );

  return result;
}

export async function POST(request: NextRequest) {
  try {
    const integrationSecret = process.env.MANYCHAT_WEBHOOK_SECRET;

    if (integrationSecret) {
      const suppliedSecret = request.headers.get("x-manychat-webhook-secret");

      if (!suppliedSecret || suppliedSecret !== integrationSecret) {
        return NextResponse.json(
          { success: false, error: "Unauthorized." },
          { status: 401 },
        );
      }
    }

    const body = (await request.json()) as BookingIntegrationPayload;

    if (!body.bookingId || !body.fullName || !body.whatsappNumber) {
      return NextResponse.json(
        {
          success: false,
          error: "bookingId, fullName and whatsappNumber are required.",
        },
        { status: 400 },
      );
    }

    if (!MANYCHAT_TOKEN) {
      return NextResponse.json({
        success: true,
        integrated: false,
        skipped: true,
        reason: "MANYCHAT_API_TOKEN is not configured.",
      });
    }

    const subscriber = await findOrCreateSubscriber(body);
    const subscriberId = subscriber.id;

    if (subscriberId === undefined || subscriberId === null) {
      throw new Error("ManyChat subscriber ID is missing.");
    }

    await addBookingTag(subscriberId);

    return NextResponse.json({
      success: true,
      integrated: true,
      subscriberId,
      tagApplied: true,
      tagName: MANYCHAT_BOOKING_TAG,
      followUpTrigger: "tag_added",
      message:
        "ManyChat contact is ready and the TRIAL LESSON BOOKED tag has been applied. Configure a ManyChat tag-triggered automation to start the follow-up sequence.",
    });
  } catch (error) {
    console.error("ManyChat booking integration error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "ManyChat integration failed.",
      },
      { status: 502 },
    );
  }
}
