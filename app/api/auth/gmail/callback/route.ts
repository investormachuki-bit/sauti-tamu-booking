import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabase-server";

const GOOGLE_TOKEN_URL =
  "https://oauth2.googleapis.com/token";

const GMAIL_PROFILE_URL =
  "https://gmail.googleapis.com/gmail/v1/users/me/profile";

export async function GET(
  request: NextRequest
) {
  try {
    const url =
      new URL(request.url);

    const code =
      url.searchParams.get("code");

    const state =
      url.searchParams.get("state");

    const error =
      url.searchParams.get("error");

    if (error) {
      return NextResponse.redirect(
        new URL(
          `/?gmail=error&reason=${encodeURIComponent(
            error
          )}`,
          request.url
        )
      );
    }

    if (!code || !state) {
      return NextResponse.json(
        {
          error:
            "Missing Google authorization code or state.",
        },
        { status: 400 }
      );
    }

    const cookieStore =
      await cookies();

    const storedState =
      cookieStore.get(
        "gmail_oauth_state"
      )?.value;

    if (
      !storedState ||
      storedState !== state
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid OAuth state.",
        },
        { status: 400 }
      );
    }

    cookieStore.delete(
      "gmail_oauth_state"
    );

    const clientId =
      process.env.GOOGLE_CLIENT_ID;

    const clientSecret =
      process.env.GOOGLE_CLIENT_SECRET;

    const redirectUri =
      process.env.GOOGLE_REDIRECT_URI;

    if (
      !clientId ||
      !clientSecret ||
      !redirectUri
    ) {
      throw new Error(
        "Google OAuth environment variables are missing."
      );
    }

    /*
     * Exchange authorization code
     * for access + refresh tokens.
     */

    const tokenBody =
      new URLSearchParams({
        code,
        client_id: clientId,
        client_secret:
          clientSecret,
        redirect_uri:
          redirectUri,
        grant_type:
          "authorization_code",
      });

    const tokenResponse =
      await fetch(
        GOOGLE_TOKEN_URL,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded",
          },
          body: tokenBody,
          cache: "no-store",
        }
      );

    const tokenData =
      await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error(
        "Google token exchange error:",
        tokenData
      );

      throw new Error(
        tokenData?.error_description ||
          "Google token exchange failed."
      );
    }

    const accessToken =
      tokenData.access_token;

    const refreshToken =
      tokenData.refresh_token;

    if (!accessToken) {
      throw new Error(
        "Google did not return an access token."
      );
    }

    if (!refreshToken) {
      throw new Error(
        "Google did not return a refresh token. Please revoke the existing Sauti Tamu authorization and connect again."
      );
    }

    /*
     * Verify which Gmail account
     * actually authorized the app.
     */

    const profileResponse =
      await fetch(
        GMAIL_PROFILE_URL,
        {
          headers: {
            Authorization:
              `Bearer ${accessToken}`,
          },
          cache: "no-store",
        }
      );

    const profileData =
      await profileResponse.json();

    if (!profileResponse.ok) {
      console.error(
        "Gmail profile error:",
        profileData
      );

      throw new Error(
        "Unable to verify the Gmail account."
      );
    }

    const email =
      profileData.emailAddress;

    if (!email) {
      throw new Error(
        "Google did not return the Gmail address."
      );
    }

    /*
     * For this Sauti Tamu system,
     * only the official account should
     * be connected.
     */

    if (
      email.toLowerCase() !==
      "sautitamupianocenter@gmail.com"
    ) {
      return NextResponse.redirect(
        new URL(
          `/?gmail=error&reason=${encodeURIComponent(
            "Please connect sautitamupianocenter@gmail.com"
          )}`,
          request.url
        )
      );
    }

    /*
     * Save the refresh token.
     */

    const { error: dbError } =
      await supabaseServer
        .from("gmail_connections")
        .upsert(
          {
            email:
              email.toLowerCase(),
            refresh_token:
              refreshToken,
            scope:
              tokenData.scope ||
              "https://www.googleapis.com/auth/gmail.send",
            updated_at:
              new Date().toISOString(),
          },
          {
            onConflict:
              "email",
          }
        );

    if (dbError) {
      console.error(
        "Gmail connection database error:",
        dbError
      );

      throw new Error(
        "Unable to save Gmail connection."
      );
    }

    /*
     * Send the admin back to the app.
     */

    return NextResponse.redirect(
      new URL(
        `/?gmail=connected&email=${encodeURIComponent(
          email
        )}`,
        request.url
      )
    );
  } catch (error) {
    console.error(
      "Gmail OAuth callback error:",
      error
    );

    return NextResponse.redirect(
      new URL(
        `/?gmail=error&reason=${encodeURIComponent(
          error instanceof Error
            ? error.message
            : "Unable to connect Gmail."
        )}`,
        request.url
      )
    );
  }
}