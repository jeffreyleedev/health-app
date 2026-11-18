"use client";

/**
 * Weigh-in and calorie forms (the Weigh-ins and Calories pages).
 *
 * The date box defaults to the user's *local* today, which only the browser
 * knows. During server rendering the date is left blank (the server would
 * use its own time zone), then the browser fills it in as soon as it loads.
 */

import Link from "next/link";
import { useActionState, useState } from "react";
import { logCalories, logWeighIn } from "@/app/log/actions";
import { initialEntryFormState, type EntryFormState } from "@/app/log/form-state";
import { MAX_CALORIES } from "@/lib/entry-validation";
import type { UnitSystem } from "@/lib/units";
import { useLocalToday } from "./use-local-today";

const inputClass = "rounded border border-line px-3 py-2";

function FieldError({ message }: { message?: string }) {
  return message ? <span className="text-sm text-danger">{message}</span> : null;
}

interface ShellProps {
  heading: string;
  action: (prev: EntryFormState, formData: FormData) => Promise<EntryFormState>;
  birthdate: string;
  children: (state: EntryFormState) => React.ReactNode;
}

/** Shared form: heading, date box, save button, and messages. */
function EntryForm({ heading, action, birthdate, children }: ShellProps) {
  const [state, formAction, pending] = useActionState(action, initialEntryFormState);
  const today = useLocalToday();
  const [picked, setPicked] = useState<string | null>(null);
  const date = picked ?? today;

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded border border-line p-4">
      <h2 className="text-lg font-semibold">{heading}</h2>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Date</span>
        <input
          name="date"
          type="date"
          required
          value={date}
          onChange={(e) => setPicked(e.target.value)}
          min={birthdate}
          max={today || undefined}
          className={inputClass}
        />
        <FieldError message={state.fieldErrors?.date} />
      </label>

      {children(state)}

      {state.noProfile && (
        <p role="alert" className="text-sm text-danger">
          Finish profile setup first.{" "}
          <Link href="/profile/setup" className="underline">
            Set up your profile
          </Link>
        </p>
      )}
      {state.message && (
        <p role="status" className="text-sm text-success">
          {state.message}
        </p>
      )}

      {/* Disabled while saving, so a double-tap doesn't log the entry twice. */}
      <button
        type="submit"
        disabled={pending || !date}
        className="rounded bg-foreground px-3 py-2 font-medium text-background disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}

export function WeighInForm({
  unitSystem,
  birthdate,
  first,
}: {
  unitSystem: UnitSystem;
  birthdate: string;
  /** True until the user's first weigh-in is saved. */
  first: boolean;
}) {
  const unit = unitSystem === "metric" ? "kg" : "lb";
  return (
    <EntryForm heading={first ? "Log your first weigh-in" : "Log a weigh-in"} action={logWeighIn} birthdate={birthdate}>
      {(state) => (
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Weight ({unit})</span>
          <input
            name="weight"
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            required
            defaultValue={state.values?.weight ?? ""}
            className={inputClass}
          />
          <FieldError message={state.fieldErrors?.weight} />
        </label>
      )}
    </EntryForm>
  );
}

export function CalorieForm({ birthdate }: { birthdate: string }) {
  return (
    <EntryForm heading="Log calories" action={logCalories} birthdate={birthdate}>
      {(state) => (
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Calories</span>
          <span className="text-xs text-muted">Entries on the same day are added together.</span>
          <input
            name="calories"
            type="number"
            inputMode="numeric"
            step="1"
            min="0"
            max={MAX_CALORIES}
            required
            defaultValue={state.values?.calories ?? ""}
            className={inputClass}
          />
          <FieldError message={state.fieldErrors?.calories} />
        </label>
      )}
    </EntryForm>
  );
}
