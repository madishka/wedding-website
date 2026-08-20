import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * The server-side Supabase client.
 *
 * Uses the SERVICE ROLE key, which bypasses row level security. Every
 * table has RLS enabled with no policies, so this is the only way to
 * read guest data at all — and it exists only on the server.
 *
 * The `server-only` import above makes importing this file from a client
 * component a build error. Do not remove it: the service role key is
 * full read/write access to the whole database.
 */
const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Copy .env.local.example " +
      "to .env.local and fill in the values from your Supabase project settings."
  );
}

export const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
