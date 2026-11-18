import Link from "next/link";
import { AuthPage } from "@/components/auth-page";

export default function AuthErrorPage() {
  return (
    <AuthPage title="That link didn't work">
      <p>The link may have expired, or it was already used. Links work only once.</p>
      <ul className="flex list-disc flex-col gap-2 pl-5 text-sm">
        <li>
          <strong>Confirming a new account on a different device or browser?</strong> Your email is
          probably confirmed already. Try signing in where you created the account.
        </li>
        <li>
          <strong>Resetting your password?</strong> Open the reset link in the same browser where you
          asked for it, or request a new one there.
        </li>
      </ul>
      <div className="flex flex-col gap-1 text-sm">
        <Link href="/sign-in" className="underline">
          Sign in
        </Link>
        <Link href="/forgot-password" className="underline">
          Send a new password reset link
        </Link>
      </div>
    </AuthPage>
  );
}
