import { APP_NAME, APP_TAGLINE } from "@/lib/app-info";

/**
 * Centered layout shared by the signed-out pages (sign-in, sign-up,
 * password pages, link error) and profile setup. Shows the app name first,
 * so the first page a visitor sees says which app this is.
 */
export function AuthPage({
  title,
  showTagline = false,
  children,
}: {
  title: string;
  /** Sign-in and sign-up only: a one-line description for new visitors. */
  showTagline?: boolean;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-12">
      <header className="flex flex-col gap-1">
        <p className="text-3xl font-bold">{APP_NAME}</p>
        {showTagline && <p className="text-sm text-muted">{APP_TAGLINE}</p>}
      </header>
      <h1 className="text-xl font-semibold">{title}</h1>
      {children}
    </main>
  );
}
