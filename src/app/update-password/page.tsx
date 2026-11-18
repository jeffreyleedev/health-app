/**
 * Reached from the password-reset email. /auth/confirm has already verified
 * the link and signed the user in, so this page requires a session.
 */

import { redirect } from "next/navigation";
import { Suspense } from "react";
import { updatePassword } from "@/app/auth/actions";
import { AuthForm } from "@/components/auth-form";
import { AuthPage } from "@/components/auth-page";
import { getVerifiedUser } from "@/lib/supabase/server";

export default function UpdatePasswordPage() {
  return (
    <AuthPage title="Choose a new password">
      <Suspense fallback={<p>Loading…</p>}>
        <RequireSession>
          <AuthForm
            action={updatePassword}
            fields={["password"]}
            submitLabel="Save new password"
            passwordAutocomplete="new-password"
          />
        </RequireSession>
      </Suspense>
    </AuthPage>
  );
}

async function RequireSession({ children }: { children: React.ReactNode }) {
  if (!(await getVerifiedUser())) redirect("/sign-in");
  return <>{children}</>;
}
