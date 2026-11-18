import Link from "next/link";
import { signUp } from "@/app/auth/actions";
import { AuthForm } from "@/components/auth-form";
import { AuthPage } from "@/components/auth-page";

export default function SignUpPage() {
  return (
    <AuthPage title="Create an account" showTagline>
      <AuthForm
        action={signUp}
        fields={["email", "password"]}
        submitLabel="Sign up"
        passwordAutocomplete="new-password"
      />
      <p className="text-sm">
        Already have an account?{" "}
        <Link href="/sign-in" className="underline">
          Sign in
        </Link>
      </p>
    </AuthPage>
  );
}
