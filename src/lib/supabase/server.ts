/**
 * Supabase client for sign-in work on the server (Server Components,
 * Server Actions, Route Handlers). It reads and writes the session cookies.
 *
 * It uses the publishable key: it only talks to Supabase Auth. Reading or
 * writing app tables will use a separate, secret-key client in the API layer.
 *
 * Create a new client per request; never share one between requests.
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { supabasePublicEnv } from "./env";

export async function createSupabaseServerClient() {
  const { url, publishableKey } = supabasePublicEnv();
  const cookieStore = await cookies();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components can't set cookies. That's fine: the proxy
          // (src/proxy.ts) refreshes the session cookies on every request.
        }
      },
    },
  });
}

export interface VerifiedUser {
  id: string;
  email: string | null;
}

/**
 * The signed-in user, or null.
 *
 * Uses getClaims(), which verifies the access token's signature, so a forged
 * or edited cookie is rejected. Never use getSession() for this on the
 * server: it trusts whatever the cookie says.
 */
export async function getVerifiedUser(): Promise<VerifiedUser | null> {
  // getClaims() checks token expiry against the clock (Date.now()). With
  // Cache Components, Next.js forbids reading the clock while prerendering
  // unless we first declare "this only runs for a real request".
  await connection();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  const email = typeof data.claims.email === "string" ? data.claims.email : null;
  return { id: data.claims.sub, email };
}
