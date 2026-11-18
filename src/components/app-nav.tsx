/**
 * Layout for signed-in pages:
 *  - a header bar pinned to the top of the window: the app name centered,
 *    a Settings cog in the top-right corner;
 *  - a centered Weigh-ins | Calories | BMI | History nav (scrolls with the page, wraps
 *    onto a second line on narrow screens), then the page title.
 * Plain links, no session reads, so it renders instantly.
 */

import Link from "next/link";
import { APP_NAME } from "@/lib/app-info";

const LINKS = [
  { href: "/weigh-ins", label: "Weigh-ins", key: "weighIns" },
  { href: "/calories", label: "Calories", key: "calories" },
  { href: "/bmi", label: "BMI", key: "bmi" },
  { href: "/history", label: "History", key: "history" },
] as const;

export type NavKey = (typeof LINKS)[number]["key"];

/** `current` underlines that nav link; Settings (reached by the cog) passes none. */
export function AppPage({ title, current, children }: { title: string; current?: NavKey; children: React.ReactNode }) {
  return (
    <>
      <AppHeader />
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-6 px-4 py-8">
        <nav aria-label="Main" className="flex flex-wrap justify-center gap-x-4 gap-y-2 border-b border-line pb-3">
          {LINKS.map((link) => (
            <Link
              key={link.key}
              href={link.href}
              aria-current={link.key === current ? "page" : undefined}
              className={link.key === current ? "font-semibold underline underline-offset-4" : "text-muted"}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {children}
      </main>
    </>
  );
}

/**
 * Sticky (not fixed), so it takes up its own space at the top and page
 * content scrolls underneath it. Three columns: an empty one on the left the
 * same width as the cog's, so the name stays centered in the window.
 */
function AppHeader() {
  return (
    <header className="sticky top-0 z-10 grid h-14 grid-cols-[1fr_auto_1fr] items-center border-b border-line bg-background px-4 sm:px-6">
      <span aria-hidden="true" />
      <span className="text-lg font-semibold">{APP_NAME}</span>
      <Link
        href="/settings"
        aria-label="Settings"
        title="Settings"
        className="-mr-2 flex h-11 w-11 items-center justify-center justify-self-end rounded text-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
      >
        <CogIcon />
      </Link>
    </header>
  );
}

/** Gear outline (Feather Icons "settings", MIT license); draws in the current text color. */
function CogIcon() {
  return (
    <svg
      aria-hidden="true"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
