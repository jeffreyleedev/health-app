/**
 * First-run profile setup. Exempt from requireProfile() (it's where that
 * redirects to), but still requires sign-in, and sends users who already
 * have a profile home so nothing gets overwritten.
 */

import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthPage } from "@/components/auth-page";
import { saveProfile } from "@/app/profile/actions";
import { ProfileForm } from "@/components/profile-form";
import { HOME_PATH } from "@/lib/app-info";
import { getMyProfile } from "@/lib/data/profiles";
import { todayUtc, yearsBefore } from "@/lib/dates";
import { MIN_AGE_YEARS } from "@/lib/profile-validation";

export default function ProfileSetupPage() {
  return (
    <AuthPage title="Set up your profile">
      <p className="text-sm">These are used to calculate your BMR, TDEE, and BMI. You can change them later.</p>
      <Suspense fallback={<p>Loading…</p>}>
        <SetupGate />
      </Suspense>
    </AuthPage>
  );
}

async function SetupGate() {
  const result = await getMyProfile(); // verifies the session (and calls connection())
  if (!result) redirect("/sign-in");
  if (result.profile) redirect(HOME_PATH);
  return (
    <ProfileForm
      action={saveProfile}
      maxBirthdate={yearsBefore(todayUtc(), MIN_AGE_YEARS)}
      submitLabel="Save and continue"
    />
  );
}
