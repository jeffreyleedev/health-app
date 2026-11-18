"use server";

/**
 * Server Actions for logging. Each one loads the verified user's profile
 * (for their units and birthdate), validates and converts the form, then
 * saves through the data layer — which re-checks the user and profile itself.
 */

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import {
  createMyCalorieEntry,
  createMyWeighIn,
  deleteMyCalorieEntry,
  deleteMyWeighIn,
  updateMyCalorieEntry,
  updateMyWeighIn,
  type ChangeResult,
  type SaveResult,
} from "@/lib/data/entries";
import { getMyProfile } from "@/lib/data/profiles";
import { formatDate, todayUtc } from "@/lib/dates";
import {
  entryDateLimits,
  parseCalorieForm,
  parseEntryDate,
  parseEntryId,
  parseWeighInForm,
} from "@/lib/entry-validation";
import { displayWeight } from "@/lib/units";
import type { DeletedEntry, EditFormState, EntryFormState } from "./form-state";

function text(formData: FormData, field: string): string | undefined {
  const v = formData.get(field);
  return typeof v === "string" ? v : undefined;
}

/** Turns a refused save into form state (or a redirect). */
function refused(result: Exclude<SaveResult, "saved">): EntryFormState {
  if (result === "signed-out") redirect("/sign-in");
  return { noProfile: true };
}

export async function logWeighIn(_prev: EntryFormState, formData: FormData): Promise<EntryFormState> {
  const values = { date: text(formData, "date"), weight: text(formData, "weight") };
  const me = await getMyProfile();
  if (!me) redirect("/sign-in");
  if (!me.profile) return { noProfile: true };

  const { unitSystem, birthdate } = me.profile;
  const parsed = parseWeighInForm(values, unitSystem, entryDateLimits(birthdate, todayUtc()));
  if (!parsed.ok) return { fieldErrors: parsed.errors, values: { weight: values.weight ?? "" } };

  const result = await createMyWeighIn(parsed.value);
  if (result !== "saved") return refused(result);

  refresh(); // re-render the home page (e.g. drop the first-weigh-in heading)
  const shown = displayWeight(parsed.value.weightKg, unitSystem);
  return { message: `Saved ${shown.value.toFixed(1)} ${shown.unit} for ${formatDate(parsed.value.date)}.` };
}

export async function logCalories(_prev: EntryFormState, formData: FormData): Promise<EntryFormState> {
  const values = { date: text(formData, "date"), calories: text(formData, "calories") };
  const me = await getMyProfile();
  if (!me) redirect("/sign-in");
  if (!me.profile) return { noProfile: true };

  const parsed = parseCalorieForm(values, entryDateLimits(me.profile.birthdate, todayUtc()));
  if (!parsed.ok) return { fieldErrors: parsed.errors, values: { calories: values.calories ?? "" } };

  const result = await createMyCalorieEntry(parsed.value);
  if (result !== "saved") return refused(result);

  refresh();
  const { calories, date } = parsed.value;
  return { message: `Saved ${calories.toLocaleString("en-US")} calories for ${formatDate(date)}.` };
}

// ---------------------------------------------------------------------------
// Edit, delete, and Undo for the recent-entries lists.
// Everything here arrives from the browser and is re-checked: the id, the
// entry kind, and the values. The data layer adds the ownership filter.
// ---------------------------------------------------------------------------

const NOT_FOUND = "That entry wasn't found. It may already be deleted.";
const NO_PROFILE = "Finish profile setup first.";

/** Turns a refused change into a message (or a redirect). */
function changeRefused(result: Exclude<ChangeResult, "updated">): EditFormState {
  if (result === "signed-out") redirect("/sign-in");
  return { error: result === "no-profile" ? NO_PROFILE : NOT_FOUND };
}

export async function editWeighIn(_prev: EditFormState, formData: FormData): Promise<EditFormState> {
  const id = parseEntryId(text(formData, "id"));
  if (id === null) return { error: NOT_FOUND };
  const me = await getMyProfile();
  if (!me) redirect("/sign-in");
  if (!me.profile) return { error: NO_PROFILE };

  const { unitSystem, birthdate } = me.profile;
  const limits = entryDateLimits(birthdate, todayUtc());
  const values = { date: text(formData, "date"), weight: text(formData, "weight") };

  // The box starts at the rounded display value (e.g. 159.7 lb). If it wasn't
  // changed, keep the stored kg exactly instead of re-converting the rounded
  // number. ("weightUnchanged" only ever keeps the user's own stored value.)
  let update: { date: string; weightKg?: number };
  if (text(formData, "weightUnchanged") === "1") {
    const date = parseEntryDate(values.date, limits);
    if (!date.ok) return { fieldErrors: { date: date.error } };
    update = { date: date.date };
  } else {
    const parsed = parseWeighInForm(values, unitSystem, limits);
    if (!parsed.ok) return { fieldErrors: parsed.errors };
    update = parsed.value;
  }

  const result = await updateMyWeighIn(id, update);
  if (result !== "updated") return changeRefused(result);
  refresh();
  return { ok: true };
}

export async function editCalorieEntry(_prev: EditFormState, formData: FormData): Promise<EditFormState> {
  const id = parseEntryId(text(formData, "id"));
  if (id === null) return { error: NOT_FOUND };
  const me = await getMyProfile();
  if (!me) redirect("/sign-in");
  if (!me.profile) return { error: NO_PROFILE };

  const values = { date: text(formData, "date"), calories: text(formData, "calories") };
  const parsed = parseCalorieForm(values, entryDateLimits(me.profile.birthdate, todayUtc()));
  if (!parsed.ok) return { fieldErrors: parsed.errors };

  const result = await updateMyCalorieEntry(id, parsed.value);
  if (result !== "updated") return changeRefused(result);
  refresh();
  return { ok: true };
}

/** Deletes one entry and returns what was removed, for the Undo message. */
export async function deleteEntry(kind: unknown, rawId: unknown): Promise<{ deleted?: DeletedEntry; error?: string }> {
  const id = parseEntryId(typeof rawId === "string" ? rawId : undefined);
  if (id === null || (kind !== "weighIn" && kind !== "calories")) return { error: NOT_FOUND };

  if (kind === "weighIn") {
    const result = await deleteMyWeighIn(id);
    if (result === "signed-out") redirect("/sign-in");
    if (result === "not-found") return { error: NOT_FOUND };
    refresh();
    return { deleted: { kind, date: result.date, weightKg: result.weightKg } };
  }
  const result = await deleteMyCalorieEntry(id);
  if (result === "signed-out") redirect("/sign-in");
  if (result === "not-found") return { error: NOT_FOUND };
  refresh();
  return { deleted: { kind, date: result.date, calories: result.calories } };
}

/**
 * Undo = save the deleted values again as a new entry (approach A). Goes
 * through the same validation and profile check as logging. Weight comes
 * back in stored kg, so it's checked as metric (no lb rounding drift).
 */
export async function undoDelete(entry: unknown): Promise<{ error?: string }> {
  const e = (typeof entry === "object" && entry !== null ? entry : {}) as Record<string, unknown>;
  const me = await getMyProfile();
  if (!me) redirect("/sign-in");
  if (!me.profile) return { error: NO_PROFILE };
  const limits = entryDateLimits(me.profile.birthdate, todayUtc());
  const date = typeof e.date === "string" ? e.date : undefined;

  let result: SaveResult;
  if (e.kind === "weighIn") {
    const parsed = parseWeighInForm({ date, weight: String(e.weightKg) }, "metric", limits);
    if (!parsed.ok) return { error: "Couldn't restore that entry." };
    result = await createMyWeighIn(parsed.value);
  } else if (e.kind === "calories") {
    const parsed = parseCalorieForm({ date, calories: String(e.calories) }, limits);
    if (!parsed.ok) return { error: "Couldn't restore that entry." };
    result = await createMyCalorieEntry(parsed.value);
  } else {
    return { error: "Couldn't restore that entry." };
  }

  if (result === "signed-out") redirect("/sign-in");
  if (result === "no-profile") return { error: NO_PROFILE };
  refresh();
  return {};
}
