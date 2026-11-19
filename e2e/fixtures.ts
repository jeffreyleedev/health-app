/**
 * Playwright fixtures: every test that asks for `user` gets a brand-new,
 * already-confirmed account (created with Supabase's admin API, so no email
 * is sent) and that account is deleted when the test ends, pass or fail.
 * Deleting the auth user removes its profile and entries too (on delete
 * cascade).
 *
 * By default the account also gets a profile (TEST_PROFILE). Tests of
 * first-run setup turn that off with `test.use({ withProfile: false })`.
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY and E2E_EMAIL_BASE
 * (from .env.local locally, GitHub Secrets in CI).
 */

import { randomBytes } from "node:crypto";
import { test as base, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import type { ProfileRow } from "@/lib/db-types";
import { localDateString } from "@/lib/dates";
import { newTestEmail } from "./test-accounts";

export { expect };

export interface TestUser {
  id: string;
  email: string;
  password: string;
}

/**
 * The seeded profile. Born Jan 1 thirty years ago, so the age is 30 on every
 * day of the year and expected BMR/TDEE numbers don't drift. The name keeps
 * the test address off the page (Settings shows the email when there's no
 * name), so it doesn't end up in screenshots.
 */
export const TEST_PROFILE = {
  display_name: "E2E Tester",
  birthdate: `${new Date().getFullYear() - 30}-01-01`,
  sex: "female",
  height_cm: 165,
  activity_level: "moderatelyActive",
  unit_system: "metric",
} satisfies Omit<ProfileRow, "user_id">;

/** Today's date as the browser sees it (the browser runs on this machine, in its time zone). */
export const today = () => localDateString();

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY for e2e tests");
  return createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function deleteTestUser(id: string) {
  const { error } = await admin().auth.admin.deleteUser(id);
  // 404: the test already deleted the account itself (Delete account test).
  if (error && error.status !== 404) throw new Error(`Couldn't delete test user ${id}: ${error.message}`);
}

export const test = base.extend<{ withProfile: boolean; user: TestUser }>({
  withProfile: [true, { option: true }],

  // `provide` is Playwright's usual `use` argument, renamed so React's lint
  // rules don't mistake it for the React `use` hook.
  user: async ({ withProfile }, provide) => {
    const email = newTestEmail(process.env.E2E_EMAIL_BASE);
    const password = randomBytes(18).toString("base64url");
    const { data, error } = await admin().auth.admin.createUser({ email, password, email_confirm: true });
    // Error text only, never the address: CI logs are public.
    if (error || !data.user) throw new Error(`Couldn't create a test user: ${error?.message ?? "no user returned"}`);
    const user = { id: data.user.id, email, password };

    try {
      if (withProfile) {
        const { error: profileError } = await admin()
          .from("profiles")
          .insert({ user_id: user.id, ...TEST_PROFILE });
        if (profileError) throw new Error(`Couldn't create the test profile: ${profileError.message}`);
      }
      await provide(user);
    } finally {
      await deleteTestUser(user.id);
    }
  },
});

/** Whether the auth account still exists (for the Delete account test). */
export async function userExists(user: TestUser): Promise<boolean> {
  const { data, error } = await admin().auth.admin.getUserById(user.id);
  if (error && error.status !== 404) throw new Error(`Couldn't look up test user: ${error.message}`);
  return Boolean(data?.user);
}

export async function seedWeighIns(user: TestUser, rows: { date: string; weightKg: number }[]) {
  const { error } = await admin()
    .from("weigh_ins")
    .insert(rows.map((r) => ({ owner_id: user.id, date: r.date, weight_kg: r.weightKg })));
  if (error) throw new Error(`Couldn't seed weigh-ins: ${error.message}`);
}

export async function seedCalories(user: TestUser, rows: { date: string; calories: number }[]) {
  const { error } = await admin()
    .from("calorie_entries")
    .insert(rows.map((r) => ({ owner_id: user.id, date: r.date, calories: r.calories })));
  if (error) throw new Error(`Couldn't seed calorie entries: ${error.message}`);
}

/**
 * Signs in through the real sign-in form and waits until the app has moved on.
 *
 * Tip for tests: open a page with page.goto() rather than a nav link. After
 * in-app navigation Next keeps the previous page in the DOM (hidden, so Back
 * is instant), and its inputs can match the same labels ("Date", "Weight").
 */
export async function signIn(page: Page, user: TestUser) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => url.pathname !== "/sign-in");
}
