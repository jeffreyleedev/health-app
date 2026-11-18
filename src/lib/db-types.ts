/**
 * Row shapes for the database tables in
 * supabase/migrations/0001_initial_schema.sql.
 *
 * Column names are snake_case to match the database. Values are metric;
 * dates are "YYYY-MM-DD" strings.
 */

import type { DateString } from "./dates";
import type { ActivityLevel, Sex } from "./formulas";
import type { UnitSystem } from "./units";

/** Supabase Auth user id (a UUID string). */
export type UserId = string;

/** public.profiles — exactly one row per user. */
export interface ProfileRow {
  user_id: UserId;
  /** Optional (migration 0003); null means no name. */
  display_name: string | null;
  birthdate: DateString;
  sex: Sex;
  height_cm: number;
  activity_level: ActivityLevel;
  unit_system: UnitSystem;
}

/** public.weigh_ins — many rows per user. */
export interface WeighInRow {
  id: number;
  owner_id: UserId;
  date: DateString;
  weight_kg: number;
}

/** public.calorie_entries — many rows per user. */
export interface CalorieEntryRow {
  id: number;
  owner_id: UserId;
  date: DateString;
  calories: number;
}
