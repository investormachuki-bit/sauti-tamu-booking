import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseServer } from "@/lib/supabase-server";

const GOOGLE_TOKEN_URL =
  "https://oauth2.googleapis.com/token";

const GMAIL_PROFILE_URL =
  "https://gmail.googleapis.com/gmail/v1/users/me/profile";

const ALLOWED_GMAIL =
  "sautitamupianocenter@gmail.com";

function verifyState(state: string) {
  const secret =
    process.env.GMAIL_OAUTH_STATE_SECRET;

  if (!secret) {
    throw new Error(
      "GMAIL_OAUTH_STATE_SECRET is missing."
    );
  }

  const parts = state.split(".");

  if (parts.length !== 2) {
    return false;
  }

  const [timestamp, signature] = parts;

  const timestampNumber =
    Number(timestamp);

  if (
    !Number.isFinite(timestampNumber)
  ) {
    return false;
  }

  /*
   * State expires after 10 minutes.
   */
  const age =
    Date.now() - timestampNumber;

  if (age < 0 || age > 10 * 60 * 1000) {
    return false;
  }

  const expectedSignature =
    crypto
      .createHmac("sha256", secret)
      .update(timestamp)
      .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

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

    /*
     * =====================================================
     * GOOGLE OAUTH ERROR
     * =====================================================
     */

    if (error) {
      return NextResponse.redirect(
        new URL(
          `/admin?gmail=error&reason=${encodeURIComponent(
            error
          )}`,
          request.url
        )
      );
    }

    /*
     * =====================================================
     * REQUIRED PARAMETERS
     * =====================================================
     */

    if (!code || !state) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing Google authorization code or state.",
        },
        { status: 400 }
      );
    }

    /*
     * =====================================================
     * VERIFY OAUTH STATE
     * =====================================================
     */

    if (!verifyState(state)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid or expired OAuth state.",
        },
        { status: 400 }
      );
    }

    /*
     * =====================================================
     * ENVIRONMENT VARIABLES
     * =====================================================
     */

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
     * =====================================================
     * EXCHANGE CODE FOR TOKENS
     * =====================================================
     */

    const tokenBody =
      new URLSearchParams({
        code,
        client_id:
          clientId,
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
        "Google did not return a refresh token. Revoke the existing Sauti Tamu authorization and connect again."
      );
    }

    /*
     * =====================================================
     * VERIFY GMAIL ACCOUNT
     * =====================================================
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
     * =====================================================
     * ONLY ALLOW SAUTI TAMU GMAIL
     * =====================================================
     */

    if (
      email.toLowerCase() !==
      ALLOWED_GMAIL
    ) {
      return NextResponse.redirect(
        new URL(
          `/admin?gmail=error&reason=${encodeURIComponent(
            `Please connect ${ALLOWED_GMAIL}`
          )}`,
          request.url
        )
      );
    }

    /*
     * =====================================================
     * SAVE GMAIL CONNECTION
     * =====================================================
     */

    const {
      error: dbError,
    } =
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
     * =====================================================
     * SUCCESS
     * =====================================================
     */

    return NextResponse.redirect(
      new URL(
        `/admin?gmail=connected&email=${encodeURIComponent(
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
        `/admin?gmail=error&reason=${encodeURIComponent(
          error instanceof Error
            ? error.message
            : "Unable to connect Gmail."
        )}`,
        request.url
      )
    );
  }
}