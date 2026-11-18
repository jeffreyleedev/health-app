/**
 * Calories page: the calorie form, your recent calorie entries, then BMR,
 * TDEE, and weight-loss targets. The server only loads your stats and
 * entries; the BMR/TDEE math runs in the browser (src/components/bmr-tdee.tsx).
 * Old /calculators links redirect here (next.config.ts).
 */

import { Suspense } from "react";
import { AppPage } from "@/components/app-nav";
import { BmrTdee } from "@/components/bmr-tdee";
import { CalorieForm } from "@/components/entry-forms";
import { RecentCalories } from "@/components/recent-entries";
import { getMyLatestWeighIn, listMyRecentCalorieEntries } from "@/lib/data/entries";
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
  const [calorieEntries, latest] = await Promise.all([listMyRecentCalorieEntries(), getMyLatestWeighIn()]);

  return (
    <>
      <CalorieForm birthdate={profile.birthdate} />
      <RecentCalories calorieEntries={calorieEntries} birthdate={profile.birthdate} />
      <BmrTdee
        stats={{ birthdate: profile.birthdate, sex: profile.sex, heightCm: profile.heightCm }}
        activityLevel={profile.activityLevel}
        unitSystem={profile.unitSystem}
        latest={latest}
      />
    </>
  );
}
