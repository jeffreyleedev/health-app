/**
 * BMI page. The server only loads your height and latest weigh-in; the BMI
 * itself is calculated in the browser (src/components/bmi-calculator.tsx).
 */

import { Suspense } from "react";
import { AppPage } from "@/components/app-nav";
import { BmiCalculator } from "@/components/bmi-calculator";
import { getMyLatestWeighIn } from "@/lib/data/entries";
import { requireProfile } from "@/lib/require-profile";

export default function BmiPage() {
  return (
    <AppPage title="BMI" current="bmi">
      {/* Session reads stream in behind Suspense (required with Cache Components). */}
      <Suspense fallback={<p>Loading…</p>}>
        <BmiContent />
      </Suspense>
    </AppPage>
  );
}

async function BmiContent() {
  const { profile } = await requireProfile();
  const latest = await getMyLatestWeighIn();

  return <BmiCalculator heightCm={profile.heightCm} unitSystem={profile.unitSystem} latest={latest} />;
}
