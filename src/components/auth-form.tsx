"use client";

/**
 * Shared form for the sign-in pages. Submits to a Server Action and shows
 * the error or message it returns.
 */

import { useActionState } from "react";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth-validation";
import { initialFormState, type FormState } from "@/app/auth/form-state";

type Field = "email" | "password";

interface AuthFormProps {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  fields: Field[];
  submitLabel: string;
  /** "current-password" for sign-in; "new-password" when choosing one. */
  passwordAutocomplete?: "current-password" | "new-password";
}

export function AuthForm({ action, fields, submitLabel, passwordAutocomplete }: AuthFormProps) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  const choosingPassword = passwordAutocomplete === "new-password";

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {fields.includes("email") && (
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Email</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            className="rounded border border-line px-3 py-2"
          />
        </label>
      )}
      {fields.includes("password") && (
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Password</span>
          <input
            name="password"
            type="password"
            autoComplete={passwordAutocomplete ?? "current-password"}
            required
            minLength={choosingPassword ? MIN_PASSWORD_LENGTH : undefined}
            className="rounded border border-line px-3 py-2"
          />
          {choosingPassword && <span className="text-xs text-muted">At least {MIN_PASSWORD_LENGTH} characters.</span>}
        </label>
      )}

      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      {state.message && (
        <p role="status" className="text-sm text-success">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-foreground px-3 py-2 font-medium text-background disabled:opacity-50"
      >
        {pending ? "Please wait…" : submitLabel}
      </button>
    </form>
  );
}
