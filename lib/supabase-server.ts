import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL"
  );
}

if (!serviceRoleKey) {
  throw new Error(
    "Missing SUPABASE_SERVICE_ROLE_KEY"
  );
}

/*
 * SERVER-ONLY SUPABASE CLIENT
 *
 * This client uses the service-role key.
 *
 * NEVER import this file into:
 * - client components
 * - booking/page.tsx
 * - browser-side code
 *
 * It must only be used inside server-side
 * routes/functions.
 */

export const supabaseServer = createClient(
  supabaseUrl,
  serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);