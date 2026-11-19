# Health Tracker

Track your weight and calories, and calculate your BMR, TDEE, and BMI.

A responsive web app for a small group of users. Each person signs in with
their own account, and their data follows them between phone and laptop.

## Features

- **Accounts:** sign up, sign in, sign out, and reset your password by email.
- **Profile:** name (optional), date of birth, sex, height, activity level,
  and metric or imperial units. Everything can be changed later in Settings.
  Changing your height asks for confirmation, because it changes BMI for
  all your history.
- **Logging:** log weigh-ins and calories any time, for any date (no future
  dates). Edit or delete your 10 most recent entries of each kind, with Undo
  after a delete.
- **Calculators:**
  - BMR, using the Mifflin-St Jeor formula;
  - TDEE at all five activity levels, with yours highlighted;
  - daily calories to lose 1 or 2 lb (0.5 or 1 kg) a week, with a warning
    below common minimums;
  - BMI, colored by category.

  Calculators default to your latest weigh-in. You can type a different
  weight to preview results without saving it.

- **History:** your last 12 days, weeks, two-week blocks, or months. Each
  period shows average weight and average calories per logged day, with
  weight and BMI charts.
- **Light and dark mode:** follows your device setting.

## Tech stack

- [Next.js](https://nextjs.org) 16 (App Router, Server Actions) with
  TypeScript and React 19
- [Supabase](https://supabase.com) for the PostgreSQL database and
  authentication
- Tailwind CSS 4
- Vitest for unit tests, Playwright for end-to-end tests

## Getting started

### 1. Prerequisites

- Node.js 26 (the version this was built and tested with)
- A free [Supabase](https://supabase.com) project

### 2. Set up the database

In the Supabase dashboard, open **SQL Editor** and run each file in
`supabase/migrations/`, **in order**:

1. `0001_initial_schema.sql`: tables, constraints, and Row Level Security
2. `0002_grant_server_access.sql`: table access for the server's key only
3. `0003_display_name.sql`: optional display name on profiles

Then, under **Authentication → URL Configuration**:

- set **Site URL** to `http://localhost:3000`;
- add `http://localhost:3000/**` to **Redirect URLs**.

When the app is deployed, add its real address in both places too.

### 3. Add your keys

```bash
cp .env.example .env.local
```

Fill in `.env.local` with values from **Project Settings → API Keys** and
your project URL. `.env.local` is git-ignored. Never commit it, and never
give the secret key a `NEXT_PUBLIC_` prefix.

### 4. Install and check

```bash
npm install
npm run check:supabase   # the server key can reach the tables; the browser key can't
```

### 5. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and create an account.

## Scripts

| Command                  | What it does                                                  |
| ------------------------ | ------------------------------------------------------------- |
| `npm run dev`            | Start the development server                                  |
| `npm run build`          | Production build                                              |
| `npm start`              | Run the production build                                      |
| `npm test`               | Run all tests once                                            |
| `npm run test:watch`     | Re-run tests on every change                                  |
| `npm run lint`           | Lint                                                          |
| `npm run check:supabase` | Check database access with your real keys (never prints them) |
| `npm run test:e2e`       | Build the app and run the Playwright tests in Chromium        |
| `npm run e2e:cleanup`    | Delete leftover e2e test accounts (`-- --dry-run` to count)   |

## How it's built

```
Browser ── page loads + Server Actions (POST, CSRF-checked) ──► Next.js server
                                                                 │ proxy.ts: refresh session, signed-out → /sign-in
                                                                 │ requireProfile(): no profile → /profile/setup
                                                                 │ actions: validate (same rules everywhere)
                                                                 │ data layer: user id from the verified token only
                                                                 ▼
                                                        Supabase (secret key, server-only)
```

- **All data goes through the server.** The browser never queries the
  database. The browser's publishable key has no table privileges, and Row
  Level Security is on with no policies, so it can read nothing.
- **Ownership is checked on every query.** Every query in `src/lib/data/`
  is filtered by the signed-in user's id, taken from the verified session
  token, never from the request. Edits and deletes match both the entry id
  and the owner.
- **Everything is stored in metric** (kg and cm) and converted only for
  display. Switching units changes one profile field and nothing else.
- **Calculators run in the browser**, and their results are never saved.
  Age is worked out from your date of birth.
- **Dates are plain calendar days** (`YYYY-MM-DD`). The browser decides
  "today" in your own time zone. The server accepts dates up to one day past
  UTC today, which covers every time zone.

### Project layout

```
src/
  app/            pages, Server Actions, and the email-link route
  components/     forms, lists, charts, and layouts
  lib/            pure logic (dates, units, formulas, validation, history), with tests
  lib/data/       data access layer (server-only)
  lib/supabase/   Supabase clients (the secret-key client is server-only)
  proxy.ts        session refresh and sign-in redirects
supabase/migrations/   database schema, applied in order
e2e/                   Playwright tests (*.e2e.ts), fixtures, test-account rules
scripts/               check-supabase.mjs, e2e-cleanup.mjs
```

### Guard tests

Besides unit tests for the logic, a few tests protect the rules above:

- `require-profile.guard.test.ts` fails if a page skips the profile check.
- `theme.guard.test.ts` fails if a component uses a fixed color instead of a theme
  color, which would break dark mode.
- `schema.guard.test.ts` fails if a migration adds an RLS policy or grants table
  access to the browser's roles.
- Importing the secret-key client into browser code fails the build
  (`server-only`).

### End-to-end tests

`npm run test:e2e` builds the app, starts it on port 3100, and drives it in
Chromium: one happy path per page (sign-in/out, profile setup, Weigh-ins,
Calories, BMI, History, Settings, delete account, and the signed-out
redirect). Flows that send email (sign-up, password reset) aren't tested.

- **Real database.** The tests use the same Supabase project as the app.
  Each test creates its own confirmed account through the admin API (no
  email is sent) and deletes it when the test ends.
- **Test accounts** are `<name>+test<digits>@<domain>`, built from
  `E2E_EMAIL_BASE` in `.env.local`. The daily **E2E cleanup** workflow
  deletes only addresses of exactly that form that are over an hour old.
- **CI** runs them as the **E2E Tests** check, with the keys and
  `E2E_EMAIL_BASE` stored as GitHub Secrets.
- Supabase allows about 30 sign-ins per 5 minutes per IP address and a run
  uses 9, so running the suite more than ~3 times in 5 minutes locally fails
  until the limit resets.

## Notes

- **Email links:** confirmation and password-reset links use Supabase's
  default emails. A password-reset link only works in the browser where the
  reset was requested.
- **Editing `src/app/globals.css`:** the dev server doesn't always pick up
  changes to this file. If new styles don't appear, stop the server, run
  `rm -rf .next/dev`, and start it again.
