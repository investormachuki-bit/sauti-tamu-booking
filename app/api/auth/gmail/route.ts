import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

const GOOGLE_AUTH_URL =
  "https://accounts.google.com/o/oauth2/v2/auth";

const GMAIL_SCOPE =
  "https://www.googleapis.com/auth/gmail.send";

function createState() {
  const secret =
    process.env.GMAIL_OAUTH_STATE_SECRET;

  if (!secret) {
    throw new Error(
      "GMAIL_OAUTH_STATE_SECRET is missing"
    );
  }

  const timestamp =
    Date.now().toString();

  const signature =
    crypto
      .createHmac("sha256", secret)
      .update(timestamp)
      .digest("hex");

  return `${timestamp}.${signature}`;
}

export async function GET() {
  try {
    const clientId =
      process.env.GOOGLE_CLIENT_ID;

    const redirectUri =
      process.env.GOOGLE_REDIRECT_URI;

    if (!clientId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "GOOGLE_CLIENT_ID is missing",
        },
        { status: 500 }
      );
    }

    if (!redirectUri) {
      return NextResponse.json(
        {
          success: false,
          error:
            "GOOGLE_REDIRECT_URI is missing",
        },
        { status: 500 }
      );
    }

    const state = createState();

    /*
     * Store OAuth state in a secure cookie.
     * The callback will verify this exact value.
     */
    const cookieStore =
      await cookies();

    cookieStore.set(
      "gmail_oauth_state",
      state,
      {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 10 * 60,
        path: "/",
      }
    );

    const params =
      new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: GMAIL_SCOPE,
        access_type: "offline",
        prompt: "consent",
        include_granted_scopes: "true",
        state,
        login_hint:
          "sautitamupianocenter@gmail.com",
      });

    const googleUrl =
      `${GOOGLE_AUTH_URL}?${params.toString()}`;

    return NextResponse.json({
      success: true,
      message:
        "Gmail OAuth URL generated successfully.",
      clientIdExists: true,
      clientIdPreview:
        clientId.substring(0, 20) + "...",
      redirectUri,
      stateStored: true,
      googleUrl,
    });
  } catch (error) {
    console.error(
      "Gmail OAuth diagnostic error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 }
    );
  }
}