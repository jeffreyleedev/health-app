import Link from "next/link";
import { signIn } from "@/app/auth/actions";
import { AuthForm } from "@/components/auth-form";
import { AuthPage } from "@/components/auth-page";

export default function SignInPage() {
  return (
    <AuthPage title="Sign in" showTagline>
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
