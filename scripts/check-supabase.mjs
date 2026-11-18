// Checks the live Supabase project matches the design:
//   1. The secret key (server-only) can reach all three tables.
//   2. The publishable key (browser) gets no rows and can't insert.
//
// Run with:  npm run check:supabase
// Reads .env.local. Never prints key values.

import { createClient } from "@supabase/supabase-js";

const TABLES = ["profiles", "weigh_ins", "calorie_entries"];

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;

const missing = Object.entries({
  NEXT_PUBLIC_SUPABASE_URL: url,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
  SUPABASE_SECRET_KEY: secretKey,
})
  .filter(([, v]) => !v || v.endsWith("xxx") || v.includes("your-project-ref"))
  .map(([k]) => k);
if (missing.length) {
  console.error(`Missing or placeholder values in .env.local: ${missing.join(", ")}`);
  process.exit(1);
}

const options = { auth: { persistSession: false, autoRefreshToken: false } };
const server = createClient(url, secretKey, options);
const browser = createClient(url, publishableKey, options);

let failures = 0;
const pass = (msg) => console.log(`PASS  ${msg}`);
const fail = (msg) => {
  failures += 1;
  console.log(`FAIL  ${msg}`);
};
const describeError = (e) => `${e.code ?? "no code"}: ${e.message}`;

console.log("Secret key (server):");
for (const table of TABLES) {
  // A normal select (not a count-only HEAD request) so errors include a message.
  const { error } = await server.from(table).select("*").limit(1);
  if (error) fail(`${table}: ${describeError(error)}`);
  else pass(`${table}: reachable`);
}

console.log("\nPublishable key (browser):");
for (const table of TABLES) {
  const { data, error } = await browser.from(table).select("*").limit(1);
  if (error?.code === "42501") pass(`${table}: read denied — no table privileges (42501)`);
  else if (error) fail(`${table}: read failed for an unexpected reason (${describeError(error)})`);
  else if (data.length === 0) pass(`${table}: read returns 0 rows — blocked by RLS`);
  else fail(`${table}: read returned data — this table is not protected`);
}

const { error: insertError } = await browser
  .from("weigh_ins")
  .insert({ owner_id: "00000000-0000-0000-0000-000000000000", date: "2026-01-01", weight_kg: 80 });
if (insertError?.code === "42501") pass("weigh_ins: insert denied (42501)");
else if (insertError) fail(`weigh_ins: insert failed, but not from permissions/RLS (${describeError(insertError)})`);
else fail("weigh_ins: insert SUCCEEDED with the publishable key — this table is not protected");

console.log(failures ? `\n${failures} check(s) failed.` : "\nAll checks passed.");
process.exit(failures ? 1 : 0);
