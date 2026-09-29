import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

const MANYCHAT_API_BASE =
  "https://api.manychat.com";

const MANYCHAT_TOKEN =
  process.env.MANYCHAT_API_TOKEN;

const MANYCHAT_BOOKING_TAG =
  process.env.MANYCHAT_BOOKING_TAG || "ST_BOOKED_TRIAL";

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

function normalizedPhone(value: string) {
  return value.replace(/[^0-9]/g, "");
}

function buildTriggerPayload(
  subscriberId: number,
  payload: BookingIntegrationPayload
) {
  return {
    version: 1,
    subscriber_id: subscriberId,
    trigger_name: "trial_booking_created",
    context: {
      booking_id: payload.bookingId,
      full_name: payload.fullName,
      email: payload.email,
      whatsapp_number: payload.whatsappNumber,
      instrument: payload.instrument,
      booking_status: payload.bookingStatus,
      lesson_starts_at: payload.startsAt,
      lesson_ends_at: payload.endsAt,
    },
  };
}

async function manychatRequest<T>(
  path: string,
  init: RequestInit
): Promise<T> {
  if (!MANYCHAT_TOKEN) {
    throw new Error(
      "MANYCHAT_API_TOKEN is not configured."
    );
  }

  const response = await fetch(
    `${MANYCHAT_API_BASE}${path}`,
    {
      ...init,
      headers: {
        Authorization: `Bearer ${MANYCHAT_TOKEN}`,
        "Content-Type": "application/json",
        ...(init.headers || {}),
      },
      cache: "no-store",
    }
  );

  const body = await response
    .json()
    .catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      typeof body?.message === "string"
        ? body.message
        : `ManyChat request failed with HTTP ${response.status}.`
    );
  }

  return body as T;
}

async function findOrCreateWhatsappSubscriber(
  payload: BookingIntegrationPayload
) {
  const phone = normalizedPhone(
    payload.whatsappNumber
  );

  if (!phone) {
    throw new Error(
      "A valid WhatsApp number is required for ManyChat integration."
    );
  }

  try {
    const existing =
      await manychatRequest<{
        data?: {
          id?: number;
        };
      }>(
        "/fb/subscriber/findBySystemField",
        {
          method: "POST",
          body: JSON.stringify({
            field: "whatsapp_phone",
            value: phone,
          }),
        }
      );

    const existingId = existing?.data?.id;

    if (typeof existingId === "number") {
      return existingId;
    }
  } catch (error) {
    console.warn(
      "ManyChat subscriber lookup failed; attempting create:",
      error
    );
  }

  const created =
    await manychatRequest<{
      data?: {
        id?: number;
      };
    }>(
      "/fb/subscriber/createSubscriber",
      {
        method: "POST",
        body: JSON.stringify({
          phone,
          first_name: payload.fullName,
          name: payload.fullName,
        }),
      }
    );

  const createdId = created?.data?.id;

  if (typeof createdId !== "number") {
    throw new Error(
      "ManyChat did not return a subscriber ID."
    );
  }

  return createdId;
}

export async function POST(
  request: NextRequest
) {
  try {
    const integrationSecret =
      process.env.MANYCHAT_WEBHOOK_SECRET;

    if (integrationSecret) {
      const suppliedSecret =
        request.headers.get(
          "x-manychat-webhook-secret"
        );

      if (
        !suppliedSecret ||
        suppliedSecret !== integrationSecret
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Unauthorized.",
          },
          { status: 401 }
        );
      }
    }

    const body =
      (await request.json()) as BookingIntegrationPayload;

    if (
      !body.bookingId ||
      !body.fullName ||
      !body.whatsappNumber
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "bookingId, fullName and whatsappNumber are required.",
        },
        { status: 400 }
      );
    }

    if (!MANYCHAT_TOKEN) {
      return NextResponse.json({
        success: true,
        integrated: false,
        skipped: true,
        reason:
          "MANYCHAT_API_TOKEN is not configured.",
      });
    }

    const subscriberId =
      await findOrCreateWhatsappSubscriber(
        body
      );

    try {
      await manychatRequest(
        "/fb/subscriber/addTagByName",
        {
          method: "POST",
          body: JSON.stringify({
            subscriber_id: subscriberId,
            tag_name: MANYCHAT_BOOKING_TAG,
          }),
        }
      );
    } catch (tagError) {
      console.warn(
        "ManyChat booking tag could not be applied:",
        tagError
      );
    }

    const appKey =
      process.env.MANYCHAT_APP_KEY;

    if (!appKey) {
      return NextResponse.json({
        success: true,
        integrated: true,
        subscriberId,
        tagApplied: true,
        flowTriggered: false,
        warning:
          "ManyChat subscriber was created/found and tagged, but MANYCHAT_APP_KEY is not configured, so the external booking trigger was not fired.",
      });
    }

    const hookResponse =
      await fetch(
        "https://hooks.manychat.com/apps/wh",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${appKey}`,
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(
            buildTriggerPayload(
              subscriberId,
              body
            )
          ),
          cache: "no-store",
        }
      );

    const hookBody =
      await hookResponse
        .json()
        .catch(() => ({}));

    if (!hookResponse.ok) {
      throw new Error(
        typeof hookBody?.message ===
          "string"
          ? hookBody.message
          : `ManyChat trigger failed with HTTP ${hookResponse.status}.`
      );
    }

    return NextResponse.json({
      success: true,
      integrated: true,
      subscriberId,
      tagApplied: true,
      flowTriggered: true,
    });
  } catch (error) {
    console.error(
      "ManyChat booking integration error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "ManyChat integration failed.",
      },
      { status: 502 }
    );
  }
}
