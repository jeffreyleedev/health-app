/**
 * Browser-safe Supabase settings (URL + publishable key).
 * The secret key is deliberately NOT read here; it will only be used by the
 * server-side data access code.
 */
export function supabasePublicEnv(): { url: string; publishableKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY — see .env.example");
  }
  return { url, publishableKey };
}
