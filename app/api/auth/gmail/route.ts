import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

const GOOGLE_AUTH_URL =
  "https://accounts.google.com/o/oauth2/v2/auth";

const GMAIL_SCOPE =
  "https://www.googleapis.com/auth/gmail.send";

export async function GET() {
  const clientId =
    process.env.GOOGLE_CLIENT_ID;

  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI;

  if (!clientId) {
    return NextResponse.json(
      {
        error:
          "Missing GOOGLE_CLIENT_ID",
      },
      { status: 500 }
    );
  }

  if (!redirectUri) {
    return NextResponse.json(
      {
        error:
          "Missing GOOGLE_REDIRECT_URI",
      },
      { status: 500 }
    );
  }

  const state =
    crypto.randomBytes(32).toString(
      "hex"
    );

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

  const params =
    new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
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

  return NextResponse.redirect(
    `${GOOGLE_AUTH_URL}?${params.toString()}`
  );
}