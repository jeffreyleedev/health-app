/**
 * Pure rules for deleting an account: reading the form, the message for each
 * outcome, and the notice the sign-in page shows afterward. No I/O here; the
 * real work is in src/lib/data/account.ts.
 */

import { formText } from "./auth-validation";

/** Query value the sign-in page looks for after a deletion: /sign-in?deleted=1 */
export const ACCOUNT_DELETED_PARAM = "deleted";
export const ACCOUNT_DELETED_NOTICE = "Your account has been deleted.";

/** How deleteMyAccount() can end. */
export type DeleteAccountResult = "deleted" | "signed-out" | "wrong-password" | "rate-limited" | "failed";

/** What the form shows for each outcome that leaves the user on Settings. */
export const DELETE_ACCOUNT_ERRORS: Record<Exclude<DeleteAccountResult, "deleted" | "signed-out">, string> = {
  "wrong-password": "Password is incorrect. Your account was not deleted.",
  "rate-limited": "Too many attempts. Please wait a few minutes and try again.",
  failed: "Couldn't delete your account. Nothing was deleted. Please try again.",
};

export function parseDeleteAccountForm(
  formData: FormData,
): { ok: true; password: string } | { ok: false; error: string } {
  // Not trimmed: spaces can be part of a password.
  const password = formText(formData, "password");
  if (!password) return { ok: false, error: "Enter your password to delete your account." };
  return { ok: true, password };
}

/** The sign-in page's notice for its ?deleted= value, or null. */
export function accountDeletedNotice(value: string | string[] | undefined): string | null {
  return value === "1" ? ACCOUNT_DELETED_NOTICE : null;
}
