/**
 * History page. The server loads ~13 months of your entries once; the
 * browser groups them by cadence (src/components/history.tsx).
 */

import { Suspense } from "react";
import { AppPage } from "@/components/app-nav";
import { History } from "@/components/history";
import { getMyEntriesSince } from "@/lib/data/entries";
import { todayUtc } from "@/lib/dates";
import { historyFetchStart } from "@/lib/history";
import { requireProfile } from "@/lib/require-profile";

export default function HistoryPage() {
  return (
    <AppPage title="History" current="history">
      {/* Session reads stream in behind Suspense (required with Cache Components). */}
      <Suspense fallback={<p>Loading…</p>}>
        <HistoryContent />
      </Suspense>
    </AppPage>
  );
}

async function HistoryContent() {
  const { profile } = await requireProfile();
  const entries = await getMyEntriesSince(historyFetchStart(todayUtc()));
  if (!entries) return null; // requireProfile already redirected signed-out users

  return (
    <History
      weighIns={entries.weighIns}
      calorieEntries={entries.calorieEntries}
      unitSystem={profile.unitSystem}
      heightCm={profile.heightCm}
    />
  );
}
