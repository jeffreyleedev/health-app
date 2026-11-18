"use client";

/**
 * Settings → Delete account. The user re-enters their password; the server
 * checks it before deleting anything (see deleteAccount in auth/actions.ts).
 */

import { useActionState } from "react";
import { deleteAccount } from "@/app/auth/actions";
import { initialFormState } from "@/app/auth/form-state";

export function DeleteAccountForm() {
  const [state, formAction, pending] = useActionState(deleteAccount, initialFormState);

  return (
    <section className="flex flex-col gap-3 border-t border-line pt-6">
      <h2 className="text-lg font-semibold">Delete account</h2>
      <p className="text-sm">
        This permanently deletes your account, your profile, and all your weigh-ins and calorie entries.{" "}
        <strong>It can&apos;t be undone.</strong>
      </p>
      <form action={formAction} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Enter your password to confirm</span>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="rounded border border-line px-3 py-2"
          />
        </label>
        {state.error && (
          <p role="alert" className="text-sm text-danger">
            {state.error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="self-start rounded border border-danger px-3 py-2 font-medium text-danger disabled:opacity-50"
        >
          {pending ? "Deleting…" : "Delete my account"}
        </button>
      </form>
    </section>
  );
}
