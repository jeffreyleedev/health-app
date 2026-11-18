/**
 * Log page (home): weigh-in and calorie forms, then your recent entries.
 * The weigh-in form says "Log your first weigh-in" until one exists.
 * Profile details and Sign out live on /settings.
 */

import { Suspense } from "react";
import { AppPage } from "@/components/app-nav";
import { APP_NAME } from "@/lib/app-info";
import { CalorieForm, WeighInForm } from "@/components/entry-forms";
import { RecentEntries } from "@/components/recent-entries";
import { hasAnyWeighIn, listMyRecentCalorieEntries, listMyRecentWeighIns } from "@/lib/data/entries";
import { requireProfile } from "@/lib/require-profile";

export default function Home() {
  return (
    <AppPage title={APP_NAME} current="log">
      {/* Reading the session happens per request, so it streams in behind a
          Suspense boundary (required with Cache Components). */}
      <Suspense fallback={<p>Loading…</p>}>
        <HomeContent />
      </Suspense>
    </AppPage>
  );
}

async function HomeContent() {
  const { profile } = await requireProfile();
  const [hasWeighIn, weighIns, calorieEntries] = await Promise.all([
    hasAnyWeighIn(),
    listMyRecentWeighIns(),
    listMyRecentCalorieEntries(),
  ]);

  return (
    <>
      <WeighInForm unitSystem={profile.unitSystem} birthdate={profile.birthdate} first={!hasWeighIn} />
      <CalorieForm birthdate={profile.birthdate} />
      <RecentEntries
        weighIns={weighIns}
        calorieEntries={calorieEntries}
        unitSystem={profile.unitSystem}
        birthdate={profile.birthdate}
      />
    </>
  );
}
