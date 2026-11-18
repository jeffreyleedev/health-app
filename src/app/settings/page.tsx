/**
 * Settings: edit your stats and units (same form and rules as setup),
 * sign out, and delete the account. Changing units only changes the display —
 * entries are stored in metric and never converted.
 */

import { Suspense } from "react";
import { signOut } from "@/app/auth/actions";
import { updateProfile } from "@/app/profile/actions";
import { AppPage } from "@/components/app-nav";
import { DeleteAccountForm } from "@/components/delete-account-form";
import { ProfileForm } from "@/components/profile-form";
import { todayUtc, yearsBefore } from "@/lib/dates";
import { MIN_AGE_YEARS } from "@/lib/profile-validation";
import { requireProfile } from "@/lib/require-profile";

export default function SettingsPage() {
  return (
    <AppPage title="Settings">
      {/* Session reads stream in behind Suspense (required with Cache Components). */}
      <Suspense fallback={<p>Loading…</p>}>
        <SettingsContent />
      </Suspense>
    </AppPage>
  );
}

async function SettingsContent() {
  const { user, profile } = await requireProfile();

  return (
    <>
      {/* Name if set; otherwise the email, as before. */}
      <p className="text-sm">
        Signed in as <strong>{profile.displayName ?? user.email ?? "unknown email"}</strong>.
      </p>
      <ProfileForm
        action={updateProfile}
        maxBirthdate={yearsBefore(todayUtc(), MIN_AGE_YEARS)}
        submitLabel="Save changes"
        initial={profile}
      />
      <form action={signOut}>
        <button type="submit" className="rounded border border-line px-3 py-2 font-medium">
          Sign out
        </button>
      </form>
      <DeleteAccountForm />
    </>
  );
}
