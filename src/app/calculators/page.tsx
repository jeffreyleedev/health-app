/**
 * Calculators page. The server only loads your stats and latest weigh-in;
 * all calculating happens in the browser (src/components/calculators.tsx).
 */

import { Suspense } from "react";
import { AppPage } from "@/components/app-nav";
import { Calculators } from "@/components/calculators";
import { getMyLatestWeighIn } from "@/lib/data/entries";
import { requireProfile } from "@/lib/require-profile";

export default function CalculatorsPage() {
  return (
    <AppPage title="Calculators" current="calculators">
      {/* Session reads stream in behind Suspense (required with Cache Components). */}
      <Suspense fallback={<p>Loading…</p>}>
        <CalculatorsContent />
      </Suspense>
    </AppPage>
  );
}

async function CalculatorsContent() {
  const { profile } = await requireProfile();
  const latest = await getMyLatestWeighIn();

  return (
    <Calculators
      stats={{ birthdate: profile.birthdate, sex: profile.sex, heightCm: profile.heightCm }}
      activityLevel={profile.activityLevel}
      unitSystem={profile.unitSystem}
      latest={latest}
    />
  );
}
