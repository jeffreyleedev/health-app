/**
 * Where links in Supabase emails land (sign-up confirmation and password
 * reset). Verifying the link creates a session (sets the cookies), then the
 * user is sent to `next`.
 *
 * Two link styles are handled:
 *  - `code` (used now): Supabase's default emails. Supabase has already
 *    verified the link — and for sign-up, confirmed the email — before
 *    redirecting here. Exchanging the code needs a secret stored in the
 *    browser that started the sign-up/reset, so it only works there.
 *  - `token_hash` (kept for later): only sent if the email templates are
 *    customized, which requires custom SMTP. Works on any device.
 */

import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { safeRedirectPath } from "@/lib/auth-validation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Only the token_hash link types this app would send. */
const ALLOWED_TYPES: readonly EmailOtpType[] = ["email", "recovery"];

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const next = safeRedirectPath(params.get("next"));

  // Supabase reports problems such as an expired link this way.
  if (params.get("error") || params.get("error_code")) redirect("/auth/error");

  const code = params.get("code");
  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) redirect(next);
    redirect("/auth/error");
  }

  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;
  if (tokenHash && type && ALLOWED_TYPES.includes(type)) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) redirect(next);
  }

  redirect("/auth/error");
}
