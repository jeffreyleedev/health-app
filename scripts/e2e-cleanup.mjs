// Deletes e2e test accounts left behind by runs that crashed or were
// cancelled before their after hooks ran. Runs daily from GitHub Actions
// (.github/workflows/e2e-cleanup.yml), or by hand:  npm run e2e:cleanup
//
// Dry run (counts what would be deleted, deletes nothing):
//   npm run e2e:cleanup -- --dry-run
//
// Only deletes accounts whose address is exactly <E2E_EMAIL_BASE local
// part>+test<digits>@<E2E_EMAIL_BASE domain> and that are over an hour old
// (see e2e/test-accounts.ts). Deleting the auth user removes its profile and
// entries too (on delete cascade).
//
// Never prints addresses or keys: GitHub Actions logs are public.

import { createClient } from "@supabase/supabase-js";
import { isSweepable, testEmailPattern } from "../e2e/test-accounts.ts";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!url || !secretKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
  process.exit(1);
}
const dryRun = process.argv.includes("--dry-run");
const pattern = testEmailPattern(process.env.E2E_EMAIL_BASE); // throws if E2E_EMAIL_BASE is missing

const admin = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });

// Collect first, delete after, so deleting doesn't shift the pages being read.
const PER_PAGE = 1000;
const leftovers = [];
let scanned = 0;
for (let page = 1; ; page++) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PER_PAGE });
  if (error) {
    console.error(`Couldn't list users: ${error.message}`);
    process.exit(1);
  }
  scanned += data.users.length;
  leftovers.push(...data.users.filter((user) => isSweepable(user, pattern)));
  if (data.users.length < PER_PAGE) break;
}

if (dryRun) {
  console.log(`Dry run: scanned ${scanned} accounts; would delete ${leftovers.length} leftover test accounts.`);
  process.exit(0);
}

let failed = 0;
for (const user of leftovers) {
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error && error.status !== 404) {
    failed++;
    console.error(`Couldn't delete user ${user.id}: ${error.message}`);
  }
}

console.log(`Scanned ${scanned} accounts; deleted ${leftovers.length - failed} leftover test accounts.`);
if (failed) process.exit(1);
