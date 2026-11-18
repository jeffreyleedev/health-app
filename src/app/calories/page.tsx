/**
 * Calories page: the calorie form, then your recent calorie entries.
 */

import { Suspense } from "react";
import { AppPage } from "@/components/app-nav";
import { CalorieForm } from "@/components/entry-forms";
import { RecentCalories } from "@/components/recent-entries";
import { listMyRecentCalorieEntries } from "@/lib/data/entries";
import { requireProfile } from "@/lib/require-profile";

export default function CaloriesPage() {
  return (
    <AppPage title="Calories" current="calories">
      {/* Reading the session happens per request, so it streams in behind a
          Suspense boundary (required with Cache Components). */}
      <Suspense fallback={<p>Loading…</p>}>
        <CaloriesContent />
      </Suspense>
    </AppPage>
  );
}

async function CaloriesContent() {
  const { profile } = await requireProfile();
  const calorieEntries = await listMyRecentCalorieEntries();

  return (
    <>
      <CalorieForm birthdate={profile.birthdate} />
      <RecentCalories calorieEntries={calorieEntries} birthdate={profile.birthdate} />
    </>
  );
}
