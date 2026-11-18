/**
 * Data access layer for profiles.
 *
 * Every function verifies the user from their session token first, then
 * touches only that user's row. The user id always comes from the verified
 * token, never from the caller or a form.
 */

import "server-only";
import type { DateString } from "@/lib/dates";
import type { ActivityLevel, Sex } from "@/lib/formulas";
import type { ProfileInput } from "@/lib/profile-validation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getVerifiedUser, type VerifiedUser } from "@/lib/supabase/server";
import type { UnitSystem } from "@/lib/units";

/** What the app needs from a profile (no user id; the caller already knows who it is). */
export interface Profile {
  /** Optional; null means no name. */
  displayName: string | null;
  birthdate: DateString;
  sex: Sex;
  heightCm: number;
  activityLevel: ActivityLevel;
  unitSystem: UnitSystem;
}

const PROFILE_COLUMNS = "display_name, birthdate, sex, height_cm, activity_level, unit_system";

/**
 * The signed-in user and their profile (null if they haven't set one up),
 * or null if nobody is signed in.
 */
export async function getMyProfile(): Promise<{ user: VerifiedUser; profile: Profile | null } | null> {
  const user = await getVerifiedUser();
  if (!user) return null;

  const { data, error } = await createSupabaseAdminClient()
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("user_id", user.id) // the ownership check
    .maybeSingle();
  if (error) throw new Error(`Couldn't load profile (${error.code})`);

  return {
    user,
    profile: data
      ? {
          displayName: data.display_name,
          birthdate: data.birthdate,
          sex: data.sex,
          heightCm: Number(data.height_cm),
          activityLevel: data.activity_level,
          unitSystem: data.unit_system,
        }
      : null,
  };
}

/**
 * Creates the signed-in user's profile. Returns "exists" if they already
 * have one (the table's key allows only one per user).
 */
export async function createMyProfile(input: ProfileInput): Promise<"created" | "exists" | "signed-out"> {
  const user = await getVerifiedUser();
  if (!user) return "signed-out";

  const { error } = await createSupabaseAdminClient().from("profiles").insert({
    user_id: user.id, // from the verified token, never from the form
    display_name: input.displayName,
    birthdate: input.birthdate,
    sex: input.sex,
    height_cm: input.heightCm,
    activity_level: input.activityLevel,
    unit_system: input.unitSystem,
  });
  if (error?.code === "23505") return "exists"; // unique violation: profile already there
  if (error) throw new Error(`Couldn't save profile (${error.code})`);
  return "created";
}

/** Updates the signed-in user's profile (settings page). */
export async function updateMyProfile(input: ProfileInput): Promise<"updated" | "no-profile" | "signed-out"> {
  const user = await getVerifiedUser();
  if (!user) return "signed-out";

  const { data, error } = await createSupabaseAdminClient()
    .from("profiles")
    .update({
      display_name: input.displayName,
      birthdate: input.birthdate,
      sex: input.sex,
      height_cm: input.heightCm,
      activity_level: input.activityLevel,
      unit_system: input.unitSystem,
    })
    .eq("user_id", user.id) // from the verified token, never from the form
    .select("user_id");
  if (error) throw new Error(`Couldn't update profile (${error.code})`);
  return data.length === 0 ? "no-profile" : "updated";
}
