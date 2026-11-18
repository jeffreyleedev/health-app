import Link from "next/link";
import { Suspense } from "react";
import { signIn } from "@/app/auth/actions";
import { AuthForm } from "@/components/auth-form";
import { AuthPage } from "@/components/auth-page";
import { accountDeletedNotice } from "@/lib/account-deletion";

export default function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  return (
    <AuthPage title="Sign in" showTagline>
      {/* Reading the URL's query is request-time work, so it streams in behind Suspense. */}
      <Suspense fallback={null}>
        <DeletedNotice searchParams={searchParams} />
      </Suspense>
      <AuthForm action={signIn} fields={["email", "password"]} submitLabel="Sign in" />
      <div className="flex flex-col gap-1 text-sm">
        <Link href="/forgot-password" className="underline">
          Forgot your password?
        </Link>
        <span>
          New here?{" "}
          <Link href="/sign-up" className="underline">
            Create an account
          </Link>
        </span>
      </div>
    </AuthPage>
  );
}

/** "Your account has been deleted." after /sign-in?deleted=1 (sent by deleteAccount). */
async function DeletedNotice({ searchParams }: { searchParams: PageProps<"/sign-in">["searchParams"] }) {
  const notice = accountDeletedNotice((await searchParams).deleted);
  if (!notice) return null;
  return (
    <p role="status" className="text-sm text-success">
      {notice}
    </p>
  );
}
