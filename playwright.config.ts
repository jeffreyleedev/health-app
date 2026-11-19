/**
 * End-to-end tests: a real browser (Chromium) drives a production build of
 * the app (`next build` + `next start` on port 3100, so it doesn't clash
 * with `npm run dev` on 3000). Tests live in e2e/*.e2e.ts; *.test.ts files
 * there are Vitest unit tests.
 *
 * Run with:  npm run test:e2e
 *
 * The app and the tests use the real Supabase project. Each test creates
 * its own +test account and deletes it afterwards (e2e/fixtures.ts).
 *
 * Supabase allows about 30 sign-ins per 5 minutes from one IP address, and a
 * run uses 9. Running the suite more than ~3 times in 5 minutes from one
 * machine (or using --repeat-each) fails with "Email or password is
 * incorrect." until the limit resets.
 */

import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// Locally the keys come from .env.local; in CI they're already in the environment.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;
const CI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.e2e.ts",
  fullyParallel: true,
  forbidOnly: CI, // a leftover test.only fails CI instead of silently skipping the rest
  workers: CI ? 2 : undefined,
  reporter: CI ? "list" : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: `${baseURL}/sign-in`,
    reuseExistingServer: !CI,
    timeout: 240_000,
  },
});
