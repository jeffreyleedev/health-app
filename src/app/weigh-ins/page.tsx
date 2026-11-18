/**
 * Weigh-ins page (where you land after signing in; "/" redirects here):
 * the weigh-in form, then your recent weigh-ins.
 * The form says "Log your first weigh-in" until one exists.
 */

import { Suspense } from "react";
import { AppPage } from "@/components/app-nav";
import { WeighInForm } from "@/components/entry-forms";
import { RecentWeighIns } from "@/components/recent-entries";
import { listMyRecentWeighIns } from "@/lib/data/entries";
import { requireProfile } from "@/lib/require-profile";

export default function WeighInsPage() {
  return (
    <AppPage title="Weigh-ins" current="weighIns">
      {/* Reading the session happens per request, so it streams in behind a
          Suspense boundary (required with Cache Components). */}
      <Suspense fallback={<p>Loading…</p>}>
        <WeighInsContent />
      </Suspense>
    </AppPage>
  );
}

async function WeighInsContent() {
  const { profile } = await requireProfile();
  const weighIns = await listMyRecentWeighIns();

  return (
    <>
      {/* The recent list includes the newest weigh-in, so an empty list means none exist yet. */}
      <WeighInForm unitSystem={profile.unitSystem} birthdate={profile.birthdate} first={weighIns.length === 0} />
      <RecentWeighIns weighIns={weighIns} unitSystem={profile.unitSystem} birthdate={profile.birthdate} />
    </>
  );
}
