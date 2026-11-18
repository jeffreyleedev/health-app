import Link from "next/link";
import { requestPasswordReset } from "@/app/auth/actions";
import { AuthForm } from "@/components/auth-form";
import { AuthPage } from "@/components/auth-page";

export default function ForgotPasswordPage() {
  return (
    <AuthPage title="Reset your password">
      <p className="text-sm">Enter your email and we&apos;ll send you a link to choose a new password.</p>
      <p className="text-sm text-muted">
        Open the link in <strong>this same browser</strong>. It won&apos;t work on another device.
      </p>
      <AuthForm action={requestPasswordReset} fields={["email"]} submitLabel="Send reset link" />
      <Link href="/sign-in" className="text-sm underline">
        Back to sign in
      </Link>
    </AuthPage>
  );
}
