import { supabaseServer } from "@/lib/supabase-server";

const GOOGLE_TOKEN_URL =
  "https://oauth2.googleapis.com/token";

const GMAIL_SEND_URL =
  "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";

const GMAIL_PROFILE_URL =
  "https://gmail.googleapis.com/gmail/v1/users/me/profile";

const GMAIL_SCOPE =
  "https://www.googleapis.com/auth/gmail.send";

function getGoogleCredentials() {
  const clientId =
    process.env.GOOGLE_CLIENT_ID;

  const clientSecret =
    process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId) {
    throw new Error(
      "Missing GOOGLE_CLIENT_ID"
    );
  }

  if (!clientSecret) {
    throw new Error(
      "Missing GOOGLE_CLIENT_SECRET"
    );
  }

  return {
    clientId,
    clientSecret,
  };
}

async function getRefreshToken() {
  const { data, error } =
    await supabaseServer
      .from("gmail_connections")
      .select(
        "email, refresh_token, scope"
      )
      .order("updated_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

  if (error) {
    console.error(
      "Gmail connection lookup error:",
      error
    );

    throw new Error(
      "Unable to load Gmail connection."
    );
  }

  if (!data?.refresh_token) {
    throw new Error(
      "Gmail is not connected. Connect the Sauti Tamu Gmail account first."
    );
  }

  return data;
}

async function getAccessToken() {
  const { clientId, clientSecret } =
    getGoogleCredentials();

  const connection =
    await getRefreshToken();

  const body =
    new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token:
        connection.refresh_token,
      grant_type: "refresh_token",
    });

  const response = await fetch(
    GOOGLE_TOKEN_URL,
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded",
      },
      body,
      cache: "no-store",
    }
  );

  const data =
    await response.json();

  if (!response.ok) {
    console.error(
      "Google token refresh error:",
      data
    );

    throw new Error(
      "Unable to refresh Gmail access. Please reconnect Gmail."
    );
  }

  return {
    accessToken:
      data.access_token as string,
    email:
      connection.email as string,
  };
}

function encodeBase64Url(
  value: string
) {
  return Buffer.from(
    value,
    "utf8"
  )
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function escapeHtml(
  value: string
) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function sendGmailEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}) {
  const {
    accessToken,
    email,
  } = await getAccessToken();

  const recipients = Array.isArray(to)
    ? to
    : [to];

  const safeText =
    text ??
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<[^>]+>/g, "")
      .trim();

  const boundary =
    `=_SautiTamu_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}`;

  const message = [
    `From: Sauti Tamu Piano Center <${email}>`,
    `To: ${recipients.join(", ")}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    safeText,
    "",
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    html,
    "",
    `--${boundary}--`,
  ].join("\r\n");

  const raw =
    encodeBase64Url(message);

  const response = await fetch(
    GMAIL_SEND_URL,
    {
      method: "POST",
      headers: {
        Authorization:
          `Bearer ${accessToken}`,
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        raw,
      }),
      cache: "no-store",
    }
  );

  const data =
    await response.json();

  if (!response.ok) {
    console.error(
      "Gmail send error:",
      data
    );

    throw new Error(
      data?.error?.message ||
        "Gmail failed to send the email."
    );
  }

  return {
    success: true,
    messageId: data.id,
    threadId: data.threadId,
    from: email,
  };
}

export async function getConnectedGmail() {
  const {
    accessToken,
  } = await getAccessToken();

  const response = await fetch(
    GMAIL_PROFILE_URL,
    {
      headers: {
        Authorization:
          `Bearer ${accessToken}`,
      },
      cache: "no-store",
    }
  );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
        "Unable to verify Gmail connection."
    );
  }

  return {
    email:
      data.emailAddress as string,
    messagesTotal:
      data.messagesTotal,
    threadsTotal:
      data.threadsTotal,
  };
}