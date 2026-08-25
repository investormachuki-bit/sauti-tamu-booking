import { NextResponse } from "next/server";
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

  const signature = crypto
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

    /*
     * Generate OAuth state.
     */
    const state = createState();

    /*
     * Build Google authorization URL.
     */
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

    /*
     * Redirect directly to Google.
     */
    const response =
      NextResponse.redirect(googleUrl);

    /*
     * Store the exact OAuth state
     * that Google will return to us.
     *
     * The callback checks this cookie.
     */
    response.cookies.set(
      "gmail_oauth_state",
      state,
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV ===
          "production",
        sameSite: "lax",
        path: "/",
        maxAge: 10 * 60,
      }
    );

    return response;
  } catch (error) {
    console.error(
      "Gmail OAuth start error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to start Gmail OAuth.",
      },
      { status: 500 }
    );
  }
}