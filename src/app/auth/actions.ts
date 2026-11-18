"use server";

/**
 * Server Actions for the sign-in forms. They run only on the server.
 * Next.js only accepts them as POST requests from this site's own origin,
 * which protects them against CSRF.
 */

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { HOME_PATH } from "@/lib/app-info";
import { ACCOUNT_DELETED_PARAM, DELETE_ACCOUNT_ERRORS, parseDeleteAccountForm } from "@/lib/account-deletion";
import { authConfirmUrl, formText, validateEmail, validateNewPassword } from "@/lib/auth-validation";
import { deleteMyAccount } from "@/lib/data/account";
import { createSupabaseServerClient, getVerifiedUser } from "@/lib/supabase/server";
import type { FormState } from "./form-state";

const RATE_LIMITED = "Too many emails have been sent recently. Please wait a while and try again.";

/**
 * Where an email link should end up, built from this request's origin
 * (Next.js already rejects Server Action requests whose Origin doesn't match
 * the site). Must also be in Supabase's Redirect URLs allowlist.
 */
async function confirmUrl(next: string): Promise<string | undefined> {
  const origin = (await headers()).get("origin");
  return authConfirmUrl(origin, next) ?? undefined;
}

export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = formText(formData, "email").trim();
  const password = formText(formData, "password");

  const emailCheck = validateEmail(email);
  if (!emailCheck.ok) return { error: emailCheck.error };
  const passwordCheck = validateNewPassword(password);
  if (!passwordCheck.ok) return { error: passwordCheck.error };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: await confirmUrl(HOME_PATH) },
  });
  if (error) {
    if (error.code === "over_email_send_rate_limit") return { error: RATE_LIMITED };
    if (error.code === "weak_password") return { error: error.message };
    return { error: "Sign-up failed. Please try again." };
  }
  // Same message whether or not the email already had an account, so the
  // form doesn't reveal who has signed up.
  return { message: "Check your email for a link to confirm your account." };
}

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = formText(formData, "email").trim();
  const password = formText(formData, "password");
  if (!email || !password) return { error: "Enter your email and password." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.code === "email_not_confirmed") {
      return { error: "Please confirm your email first. Check your inbox for the link." };
    }
    return { error: "Email or password is incorrect." };
  }
  redirect(HOME_PATH);
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}

/**
 * Permanently deletes the signed-in user's account after re-checking their
 * password. Order: check password → delete → clear this browser's cookies →
 * sign-in page. If anything fails before the delete, nothing is deleted.
 */
export async function deleteAccount(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseDeleteAccountForm(formData);
  if (!parsed.ok) return { error: parsed.error };

  const result = await deleteMyAccount(parsed.password);
  if (result === "signed-out") redirect("/sign-in");
  if (result !== "deleted") return { error: DELETE_ACCOUNT_ERRORS[result] };

  // The account is gone, but the signed access token in the cookie would stay
  // valid for up to an hour. "local" removes the cookies before it contacts
  // Supabase, so this works even though the user no longer exists.
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect(`/sign-in?${ACCOUNT_DELETED_PARAM}=1`);
}

export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = formText(formData, "email").trim();
  const emailCheck = validateEmail(email);
  if (!emailCheck.ok) return { error: emailCheck.error };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: await confirmUrl("/update-password"),
  });
  if (error?.code === "over_email_send_rate_limit") return { error: RATE_LIMITED };
  // Same message either way, so the form doesn't reveal which emails have accounts.
  return { message: "If an account exists for that email, we've sent a link to reset the password." };
}

export async function updatePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  // Re-verify here: the proxy's check doesn't protect a Server Action on its own.
  const user = await getVerifiedUser();
  if (!user) redirect("/sign-in");

  const password = formText(formData, "password");
  const passwordCheck = validateNewPassword(password);
  if (!passwordCheck.ok) return { error: passwordCheck.error };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (error.code === "same_password") return { error: "Choose a password different from your current one." };
    if (error.code === "weak_password") return { error: error.message };
    return { error: "Couldn't update the password. Please try again." };
  }
  redirect(HOME_PATH);
}
