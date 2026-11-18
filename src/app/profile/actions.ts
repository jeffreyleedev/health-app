"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { createMyProfile, getMyProfile, updateMyProfile } from "@/lib/data/profiles";
import { todayUtc } from "@/lib/dates";
import { keepStoredHeight, parseProfileForm, type ProfileFormValues } from "@/lib/profile-validation";
import type { ProfileFormState } from "./form-state";

const FIELDS = [
  "displayName",
  "unitSystem",
  "birthdate",
  "sex",
  "heightCm",
  "heightFt",
  "heightIn",
  "activityLevel",
] as const;

function readValues(formData: FormData): ProfileFormValues {
  const values: ProfileFormValues = {};
  for (const field of FIELDS) {
    const v = formData.get(field);
    if (typeof v === "string") values[field] = v;
  }
  return values;
}

export async function saveProfile(_prev: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const values = readValues(formData);

  const parsed = parseProfileForm(values, todayUtc());
  if (!parsed.ok) return { fieldErrors: parsed.errors };

  // createMyProfile verifies the user itself; this action trusts nothing from the form about who they are.
  const result = await createMyProfile(parsed.value);
  if (result === "signed-out") redirect("/sign-in");
  redirect("/"); // "created", or "exists" (already set up — nothing to overwrite)
}

/**
 * Settings. Same rules as setup. If the height wasn't really changed, the
 * stored cm is kept exactly. If it was, nothing saves until the form comes
 * back with confirmHeight=1 — the server decides when to ask, so the
 * confirmation can't be skipped by editing the page.
 */
export async function updateProfile(_prev: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const values = readValues(formData);
  const me = await getMyProfile();
  if (!me) redirect("/sign-in");
  if (!me.profile) redirect("/profile/setup");

  const parsed = parseProfileForm(values, todayUtc());
  if (!parsed.ok) return { fieldErrors: parsed.errors };

  const keepHeight = keepStoredHeight(values, me.profile.heightCm);
  const input = keepHeight ? { ...parsed.value, heightCm: me.profile.heightCm } : parsed.value;
  if (!keepHeight && formData.get("confirmHeight") !== "1") return { confirmHeight: true };

  const result = await updateMyProfile(input);
  if (result === "signed-out") redirect("/sign-in");
  if (result === "no-profile") redirect("/profile/setup");
  refresh();
  return { message: "Settings saved." };
}
