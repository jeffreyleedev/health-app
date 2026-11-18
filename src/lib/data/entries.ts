/**
 * Data access layer for weigh-ins and calorie entries.
 *
 * Same rules as profiles.ts: verify the user from their session token first,
 * take the owner id only from that token, and touch only their rows.
 * Saves also require a profile — the database doesn't link entries to
 * profiles, so this check is the enforcement.
 */

import "server-only";
import type { DateString } from "@/lib/dates";
import type { CalorieInput, WeighInInput } from "@/lib/entry-validation";
import type { CalorieEntry, WeighIn } from "@/lib/history";
import { fetchAllPages } from "@/lib/paging";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getVerifiedUser } from "@/lib/supabase/server";
import { getMyProfile } from "./profiles";

export type SaveResult = "saved" | "no-profile" | "signed-out";

/** The verified user's id, if they're signed in and have a profile. */
async function ownerWithProfile(): Promise<{ ownerId: string } | "no-profile" | "signed-out"> {
  const me = await getMyProfile(); // verifies the token
  if (!me) return "signed-out";
  if (!me.profile) return "no-profile";
  return { ownerId: me.user.id };
}

export async function createMyWeighIn(input: WeighInInput): Promise<SaveResult> {
  const owner = await ownerWithProfile();
  if (typeof owner === "string") return owner;

  const { error } = await createSupabaseAdminClient().from("weigh_ins").insert({
    owner_id: owner.ownerId, // from the verified token, never from the form
    date: input.date,
    weight_kg: input.weightKg,
  });
  if (error) throw new Error(`Couldn't save weigh-in (${error.code})`);
  return "saved";
}

export async function createMyCalorieEntry(input: CalorieInput): Promise<SaveResult> {
  const owner = await ownerWithProfile();
  if (typeof owner === "string") return owner;

  const { error } = await createSupabaseAdminClient().from("calorie_entries").insert({
    owner_id: owner.ownerId,
    date: input.date,
    calories: input.calories,
  });
  if (error) throw new Error(`Couldn't save calories (${error.code})`);
  return "saved";
}

/**
 * The signed-in user's latest weigh-in: newest date, and if several share
 * that date, the one saved last (highest id). Null if none or signed out.
 */
export async function getMyLatestWeighIn(): Promise<{ date: DateString; weightKg: number } | null> {
  const user = await getVerifiedUser();
  if (!user) return null;

  const { data, error } = await createSupabaseAdminClient()
    .from("weigh_ins")
    .select("date, weight_kg")
    .eq("owner_id", user.id) // the ownership check
    .order("date", { ascending: false })
    .order("id", { ascending: false }) // same date → last saved wins
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Couldn't load latest weigh-in (${error.code})`);
  return data ? { date: data.date, weightKg: Number(data.weight_kg) } : null;
}

/**
 * The signed-in user's weigh-ins and calorie entries dated on or after
 * `since`, oldest first. Fetched in pages so nothing is cut off at
 * Supabase's 1,000-row limit. Null if signed out.
 */
export async function getMyEntriesSince(
  since: DateString,
): Promise<{ weighIns: WeighIn[]; calorieEntries: CalorieEntry[] } | null> {
  const user = await getVerifiedUser();
  if (!user) return null;
  const db = createSupabaseAdminClient();

  const [weighIns, calorieEntries] = await Promise.all([
    fetchAllPages(async (from, to) => {
      const { data, error } = await db
        .from("weigh_ins")
        .select("date, weight_kg")
        .eq("owner_id", user.id) // the ownership check
        .gte("date", since)
        .order("date")
        .order("id") // stable order so pages don't overlap or skip
        .range(from, to);
      if (error) throw new Error(`Couldn't load weigh-ins (${error.code})`);
      return data.map((r) => ({ date: r.date, weightKg: Number(r.weight_kg) }));
    }),
    fetchAllPages(async (from, to) => {
      const { data, error } = await db
        .from("calorie_entries")
        .select("date, calories")
        .eq("owner_id", user.id)
        .gte("date", since)
        .order("date")
        .order("id")
        .range(from, to);
      if (error) throw new Error(`Couldn't load calorie entries (${error.code})`);
      return data.map((r) => ({ date: r.date, calories: r.calories }));
    }),
  ]);
  return { weighIns, calorieEntries };
}

// ---------------------------------------------------------------------------
// Recent entries, edits, and deletes.
//
// Ids come from the browser, so they're untrusted. Every update and delete
// matches on BOTH the id and the verified owner: someone else's id simply
// matches no row, and gets the same "not-found" as an already-deleted entry.
// ---------------------------------------------------------------------------

export const RECENT_LIMIT = 10;

export interface RecentWeighIn extends WeighIn {
  id: number;
}
export interface RecentCalorieEntry extends CalorieEntry {
  id: number;
}

export type ChangeResult = "updated" | "not-found" | "no-profile" | "signed-out";

/** Your last 10 saved weigh-ins, most recently saved first. */
export async function listMyRecentWeighIns(): Promise<RecentWeighIn[]> {
  const user = await getVerifiedUser();
  if (!user) return [];
  const { data, error } = await createSupabaseAdminClient()
    .from("weigh_ins")
    .select("id, date, weight_kg")
    .eq("owner_id", user.id)
    .order("id", { ascending: false }) // ids increase with every save
    .limit(RECENT_LIMIT);
  if (error) throw new Error(`Couldn't load weigh-ins (${error.code})`);
  return data.map((r) => ({ id: r.id, date: r.date, weightKg: Number(r.weight_kg) }));
}

/** Your last 10 saved calorie entries, most recently saved first. */
export async function listMyRecentCalorieEntries(): Promise<RecentCalorieEntry[]> {
  const user = await getVerifiedUser();
  if (!user) return [];
  const { data, error } = await createSupabaseAdminClient()
    .from("calorie_entries")
    .select("id, date, calories")
    .eq("owner_id", user.id)
    .order("id", { ascending: false })
    .limit(RECENT_LIMIT);
  if (error) throw new Error(`Couldn't load calorie entries (${error.code})`);
  return data.map((r) => ({ id: r.id, date: r.date, calories: r.calories }));
}

/**
 * Updates one of your weigh-ins in place (it keeps its id). Leave out
 * weightKg to change only the date and keep the stored weight exactly.
 */
export async function updateMyWeighIn(
  id: number,
  input: { date: DateString; weightKg?: number },
): Promise<ChangeResult> {
  const owner = await ownerWithProfile();
  if (typeof owner === "string") return owner;
  const changes = input.weightKg === undefined ? { date: input.date } : { date: input.date, weight_kg: input.weightKg };
  const { data, error } = await createSupabaseAdminClient()
    .from("weigh_ins")
    .update(changes)
    .eq("id", id)
    .eq("owner_id", owner.ownerId) // the ownership check
    .select("id");
  if (error) throw new Error(`Couldn't update weigh-in (${error.code})`);
  return data.length === 0 ? "not-found" : "updated";
}

export async function updateMyCalorieEntry(id: number, input: CalorieInput): Promise<ChangeResult> {
  const owner = await ownerWithProfile();
  if (typeof owner === "string") return owner;
  const { data, error } = await createSupabaseAdminClient()
    .from("calorie_entries")
    .update({ date: input.date, calories: input.calories })
    .eq("id", id)
    .eq("owner_id", owner.ownerId)
    .select("id");
  if (error) throw new Error(`Couldn't update calorie entry (${error.code})`);
  return data.length === 0 ? "not-found" : "updated";
}

/** Deletes one of your weigh-ins; returns what was deleted, so Undo can re-save it. */
export async function deleteMyWeighIn(id: number): Promise<WeighIn | "not-found" | "signed-out"> {
  const user = await getVerifiedUser();
  if (!user) return "signed-out";
  const { data, error } = await createSupabaseAdminClient()
    .from("weigh_ins")
    .delete()
    .eq("id", id)
    .eq("owner_id", user.id) // the ownership check
    .select("date, weight_kg");
  if (error) throw new Error(`Couldn't delete weigh-in (${error.code})`);
  return data.length === 0 ? "not-found" : { date: data[0].date, weightKg: Number(data[0].weight_kg) };
}

export async function deleteMyCalorieEntry(id: number): Promise<CalorieEntry | "not-found" | "signed-out"> {
  const user = await getVerifiedUser();
  if (!user) return "signed-out";
  const { data, error } = await createSupabaseAdminClient()
    .from("calorie_entries")
    .delete()
    .eq("id", id)
    .eq("owner_id", user.id)
    .select("date, calories");
  if (error) throw new Error(`Couldn't delete calorie entry (${error.code})`);
  return data.length === 0 ? "not-found" : { date: data[0].date, calories: data[0].calories };
}
