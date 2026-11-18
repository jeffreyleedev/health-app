"use client";

/**
 * Profile form shared by first-run setup (empty) and settings (pre-filled).
 * Every input is controlled, so values survive a round trip to the server
 * (e.g. the settings height confirmation). Switching units converts the
 * height boxes; the server still converts everything to metric.
 */

import { useActionState, useState } from "react";
import { initialProfileFormState, type ProfileFormState } from "@/app/profile/form-state";
import { ACTIVITY_LEVELS, type ActivityLevel, type Sex } from "@/lib/formulas";
import { heightBoxesFor, MAX_NAME_LENGTH, type ProfileField } from "@/lib/profile-validation";
import { heightInputToCm, type UnitSystem } from "@/lib/units";

const inputClass = "rounded border border-line px-3 py-2";

function FieldError({ message }: { message?: string }) {
  return message ? <span className="text-sm text-danger">{message}</span> : null;
}

type Heights = { heightCm: string; heightFt: string; heightIn: string };
const EMPTY_HEIGHTS: Heights = { heightCm: "", heightFt: "", heightIn: "0" };

function boxes(cm: number, units: UnitSystem): Heights {
  return { ...EMPTY_HEIGHTS, ...heightBoxesFor(cm, units) };
}

/** The height currently typed, in cm, or null if it isn't a usable number. */
function typedCm(h: Heights, units: UnitSystem): number | null {
  if (units === "metric") {
    const cm = Number(h.heightCm);
    return h.heightCm.trim() && Number.isFinite(cm) && cm > 0 ? cm : null;
  }
  const feet = Number(h.heightFt);
  const inches = h.heightIn.trim() ? Number(h.heightIn) : 0;
  return h.heightFt.trim() && Number.isFinite(feet) && Number.isFinite(inches)
    ? heightInputToCm({ feet, inches })
    : null;
}

export interface ProfileFormInitial {
  displayName: string | null;
  birthdate: string;
  sex: Sex;
  heightCm: number;
  activityLevel: ActivityLevel;
  unitSystem: UnitSystem;
}

interface Props {
  action: (prev: ProfileFormState, formData: FormData) => Promise<ProfileFormState>;
  maxBirthdate: string;
  submitLabel: string;
  /** Settings: the saved profile. Setup: omitted (empty form). */
  initial?: ProfileFormInitial;
}

export function ProfileForm({ action, maxBirthdate, submitLabel, initial }: Props) {
  const [hidePrompt, setHidePrompt] = useState(false);
  const [state, formAction, pending] = useActionState(async (prev: ProfileFormState, formData: FormData) => {
    setHidePrompt(false); // a new submission can ask again
    return action(prev, formData);
  }, initialProfileFormState);

  const [name, setName] = useState(initial?.displayName ?? "");
  const [units, setUnits] = useState<UnitSystem | null>(initial?.unitSystem ?? null);
  const [birthdate, setBirthdate] = useState(initial?.birthdate ?? "");
  const [sex, setSex] = useState<Sex | "">(initial?.sex ?? "");
  const [activity, setActivity] = useState<ActivityLevel | "">(initial?.activityLevel ?? "");
  const [heights, setHeights] = useState<Heights>(
    initial ? boxes(initial.heightCm, initial.unitSystem) : EMPTY_HEIGHTS,
  );
  const err = (f: ProfileField) => state.fieldErrors?.[f];
  const setHeight = (field: keyof Heights, value: string) => setHeights((h) => ({ ...h, [field]: value }));

  function switchUnits(next: UnitSystem) {
    if (units && units !== next) {
      // Untouched stored height → show the stored height in the new units
      // (so the server sees it as unchanged). Otherwise convert what's typed.
      const untouched = initial && JSON.stringify(heights) === JSON.stringify(boxes(initial.heightCm, units));
      const cm = untouched ? initial.heightCm : typedCm(heights, units);
      setHeights(cm === null ? EMPTY_HEIGHTS : boxes(cm, next));
    }
    setUnits(next);
  }

  function cancelHeightChange() {
    if (initial && units) setHeights(boxes(initial.heightCm, units));
    setHidePrompt(true);
  }

  const showPrompt = state.confirmHeight && !hidePrompt;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Name (optional)</span>
        <input
          name="displayName"
          type="text"
          autoComplete="name"
          maxLength={MAX_NAME_LENGTH}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
        />
        <FieldError message={err("displayName")} />
      </label>

      <fieldset className="flex flex-col gap-1">
        <legend className="text-sm font-medium">Units</legend>
        <div className="flex gap-4">
          {(["imperial", "metric"] as const).map((u) => (
            <label key={u} className="flex items-center gap-2">
              <input
                type="radio"
                name="unitSystem"
                value={u}
                required
                checked={units === u}
                onChange={() => switchUnits(u)}
              />
              {u === "imperial" ? "Imperial (lb, ft/in)" : "Metric (kg, cm)"}
            </label>
          ))}
        </div>
        <FieldError message={err("unitSystem")} />
      </fieldset>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Date of birth</span>
        <input
          name="birthdate"
          type="date"
          required
          max={maxBirthdate}
          value={birthdate}
          onChange={(e) => setBirthdate(e.target.value)}
          className={inputClass}
        />
        <FieldError message={err("birthdate")} />
      </label>

      <fieldset className="flex flex-col gap-1">
        <legend className="text-sm font-medium">Sex</legend>
        <span className="text-xs text-muted">Used only by the BMR formula, which has male and female versions.</span>
        <div className="flex gap-4">
          {(["female", "male"] as const).map((s) => (
            <label key={s} className="flex items-center gap-2">
              <input type="radio" name="sex" value={s} required checked={sex === s} onChange={() => setSex(s)} />
              {s === "female" ? "Female" : "Male"}
            </label>
          ))}
        </div>
        <FieldError message={err("sex")} />
      </fieldset>

      {units && (
        <fieldset className="flex flex-col gap-1">
          <legend className="text-sm font-medium">Height</legend>
          {units === "metric" ? (
            <label className="flex items-center gap-2">
              <input
                name="heightCm"
                type="number"
                inputMode="decimal"
                step="0.1"
                min="100"
                max="250"
                required
                value={heights.heightCm}
                onChange={(e) => setHeight("heightCm", e.target.value)}
                className={`${inputClass} w-28`}
              />
              cm
            </label>
          ) : (
            <div className="flex gap-3">
              <label className="flex items-center gap-2">
                <input
                  name="heightFt"
                  type="number"
                  inputMode="numeric"
                  step="1"
                  min="3"
                  max="8"
                  required
                  value={heights.heightFt}
                  onChange={(e) => setHeight("heightFt", e.target.value)}
                  className={`${inputClass} w-20`}
                />
                ft
              </label>
              <label className="flex items-center gap-2">
                <input
                  name="heightIn"
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  min="0"
                  max="11.5"
                  value={heights.heightIn}
                  onChange={(e) => setHeight("heightIn", e.target.value)}
                  className={`${inputClass} w-20`}
                />
                in
              </label>
            </div>
          )}
          <FieldError message={err("height")} />
        </fieldset>
      )}

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Activity level</span>
        <select
          name="activityLevel"
          required
          value={activity}
          onChange={(e) => setActivity(e.target.value as ActivityLevel)}
          className={inputClass}
        >
          <option value="" disabled>
            Choose one…
          </option>
          {Object.entries(ACTIVITY_LEVELS).map(([key, level]) => (
            <option key={key} value={key}>
              {level.label}
            </option>
          ))}
        </select>
        <FieldError message={err("activityLevel")} />
      </label>

      {showPrompt ? (
        <div role="alert" className="flex flex-col gap-3 rounded border border-line p-3">
          <p className="text-sm">Changing your height recalculates BMI for all your history. Save anyway?</p>
          <div className="flex gap-2">
            {/* This button's name/value is sent with the form: the server's go-ahead. */}
            <button
              type="submit"
              name="confirmHeight"
              value="1"
              disabled={pending}
              className="rounded bg-foreground px-3 py-2 font-medium text-background disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save anyway"}
            </button>
            <button type="button" onClick={cancelHeightChange} className="rounded border border-line px-3 py-2">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-foreground px-3 py-2 font-medium text-background disabled:opacity-50"
        >
          {pending ? "Saving…" : submitLabel}
        </button>
      )}

      {state.message && !showPrompt && (
        <p role="status" className="text-sm text-success">
          {state.message}
        </p>
      )}
    </form>
  );
}
