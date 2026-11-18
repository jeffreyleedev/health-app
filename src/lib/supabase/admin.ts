/**
 * Supabase client using the SECRET key. It bypasses Row Level Security, so
 * the code that calls it (src/lib/data/*) must always filter by the verified
 * user's id.
 *
 * `server-only` makes the build fail if this module is ever imported by code
 * that runs in the browser.
 */

import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabasePublicEnv } from "./env";

export function createSupabaseAdminClient() {
  const { url } = supabasePublicEnv();
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) throw new Error("Missing SUPABASE_SECRET_KEY — see .env.example");
  return createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
