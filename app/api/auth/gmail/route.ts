import { NextResponse } from "next/server";
import crypto from "crypto";

export async function GET() {
  try {
    const secret =
      process.env.GMAIL_OAUTH_STATE_SECRET;

    const clientId =
      process.env.GOOGLE_CLIENT_ID;

    const redirectUri =
      process.env.GOOGLE_REDIRECT_URI;

    if (!secret) {
      return NextResponse.json(
        {
          success: false,
          step: "state_secret",
          error:
            "GMAIL_OAUTH_STATE_SECRET is missing",
        },
        { status: 500 }
      );
    }

    if (!clientId) {
      return NextResponse.json(
        {
          success: false,
          step: "client_id",
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
          step: "redirect_uri",
          error:
            "GOOGLE_REDIRECT_URI is missing",
        },
        { status: 500 }
      );
    }

    const timestamp =
      Date.now().toString();

    const signature =
      crypto
        .createHmac(
          "sha256",
          secret
        )
        .update(timestamp)
        .digest("hex");

    const state =
      `${timestamp}.${signature}`;

    const params =
      new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope:
          "https://www.googleapis.com/auth/gmail.send",
        access_type: "offline",
        prompt: "consent",
        include_granted_scopes: "true",
        state,
        login_hint:
          "sautitamupianocenter@gmail.com",
      });

    const googleUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    return NextResponse.json({
      success: true,
      step: "oauth_url_created",
      message:
        "OAuth route is working.",
      clientIdExists: true,
      redirectUri,
      stateCreated: true,
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
        step: "unexpected_error",
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 }
    );
  }
}