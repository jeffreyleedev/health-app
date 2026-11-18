/**
 * Data access layer for deleting the signed-in user's whole account.
 *
 * Deleting the Supabase Auth user (auth.users) also deletes their profile,
 * weigh-ins and calorie entries: every app table references auth.users with
 * `on delete cascade` (migration 0001). It's a hard delete; nothing is kept.
 *
 * The user id and email always come from the verified token, never from a form.
 */

import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { DeleteAccountResult } from "@/lib/account-deletion";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { supabasePublicEnv } from "@/lib/supabase/env";
import { getVerifiedUser } from "@/lib/supabase/server";

export async function deleteMyAccount(password: string): Promise<DeleteAccountResult> {
  const user = await getVerifiedUser();
  if (!user) return "signed-out";
  if (!user.email) return "failed";

  // 1. Re-check the password. A one-off client that never touches this
  //    browser's cookies, so a failed check leaves the current session alone.
  const { url, publishableKey } = supabasePublicEnv();
  const checker = createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await checker.auth.signInWithPassword({ email: user.email, password });
  if (error) {
    if (error.code === "over_request_rate_limit") return "rate-limited";
    return "wrong-password";
  }
  // The check created a short-lived extra session; revoke it right away.
  await checker.auth.signOut({ scope: "local" });
  // Belt and braces: the password must belong to the same account as the token.
  if (data.user?.id !== user.id) return "failed";

  // 2. Delete the auth user (secret key required). The database cascades the rest.
  const { error: deleteError } = await createSupabaseAdminClient().auth.admin.deleteUser(user.id);
  if (deleteError) return "failed";
  return "deleted";
}
