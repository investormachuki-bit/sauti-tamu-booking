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
     * Diagnostic checks
     */

    if (!clientId) {
      return new NextResponse(
        "Gmail OAuth route is working, but GOOGLE_CLIENT_ID is missing.",
        {
          status: 500,
          headers: {
            "Content-Type": "text/plain",
          },
        }
      );
    }

    if (!redirectUri) {
      return new NextResponse(
        "Gmail OAuth route is working, but GOOGLE_REDIRECT_URI is missing.",
        {
          status: 500,
          headers: {
            "Content-Type": "text/plain",
          },
        }
      );
    }

    /*
     * Generate secure OAuth state.
     */

    const state =
      crypto.randomBytes(32).toString("hex");

    /*
     * Store state in secure cookie.
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

    /*
     * Build Google OAuth URL.
     */

    const params =
      new URLSearchParams({
        client_id: clientId,

        redirect_uri:
          redirectUri,

        response_type: "code",

        scope: GMAIL_SCOPE,

        access_type: "offline",

        prompt: "consent",

        include_granted_scopes:
          "true",

        state,

        login_hint:
          "sautitamupianocenter@gmail.com",
      });

    const googleUrl =
      `${GOOGLE_AUTH_URL}?${params.toString()}`;

    /*
     * Redirect to Google.
     */

    return NextResponse.redirect(
      googleUrl
    );

  } catch (error) {

    console.error(
      "Gmail OAuth start error:",
      error
    );

    return new NextResponse(
      error instanceof Error
        ? error.message
        : "Unable to start Gmail OAuth.",
      {
        status: 500,
        headers: {
          "Content-Type":
            "text/plain",
        },
      }
    );
  }
}