import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

const GOOGLE_AUTH_URL =
  "https://accounts.google.com/o/oauth2/v2/auth";

const GMAIL_SCOPE =
  "https://www.googleapis.com/auth/gmail.send";

export async function GET() {
  try {
    const clientId =
      process.env.GOOGLE_CLIENT_ID;

    const redirectUri =
      process.env.GOOGLE_REDIRECT_URI;

    /*
     * Check required OAuth configuration.
     */
    if (!clientId) {
      return NextResponse.json(
        {
          error:
            "Missing GOOGLE_CLIENT_ID environment variable.",
        },
        { status: 500 }
      );
    }

    if (!redirectUri) {
      return NextResponse.json(
        {
          error:
            "Missing GOOGLE_REDIRECT_URI environment variable.",
        },
        { status: 500 }
      );
    }

    /*
     * Generate a secure OAuth state value.
     */
    const state =
      crypto.randomBytes(32).toString(
        "hex"
      );

    /*
     * Store OAuth state in a secure,
     * short-lived cookie.
     */
    const cookieStore =
      await cookies();

    cookieStore.set(
      "gmail_oauth_state",
      state,
      {
        httpOnly: true,

        secure:
          process.env.NODE_ENV ===
          "production",

        sameSite: "lax",

        maxAge: 10 * 60,

        path: "/",
      }
    );

    /*
     * Build Google's OAuth authorization URL.
     */
    const params =
      new URLSearchParams({
        client_id:
          clientId,

        redirect_uri:
          redirectUri,

        response_type:
          "code",

        scope:
          GMAIL_SCOPE,

        access_type:
          "offline",

        prompt:
          "consent",

        include_granted_scopes:
          "true",

        state,

        login_hint:
          "sautitamupianocenter@gmail.com",
      });

    const authorizationUrl =
      `${GOOGLE_AUTH_URL}?${params.toString()}`;

    /*
     * Redirect the browser directly
     * to Google's OAuth consent screen.
     */
    return NextResponse.redirect(
      authorizationUrl
    );
  } catch (error) {
    console.error(
      "Gmail OAuth initiation error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to start Gmail OAuth.",
      },
      { status: 500 }
    );
  }
}