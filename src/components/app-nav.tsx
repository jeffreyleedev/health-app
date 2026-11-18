/**
 * Layout for signed-in pages: a Log | Calculators | History | Settings nav above the page title.
 * Plain links, no session reads, so it renders instantly.
 */

import Link from "next/link";

const LINKS = [
  { href: "/", label: "Log", key: "log" },
  { href: "/calculators", label: "Calculators", key: "calculators" },
  { href: "/history", label: "History", key: "history" },
  { href: "/settings", label: "Settings", key: "settings" },
] as const;

export type NavKey = (typeof LINKS)[number]["key"];

export function AppPage({ title, current, children }: { title: string; current: NavKey; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-6 px-4 py-8">
      <nav aria-label="Main" className="flex gap-4 border-b border-line pb-3">
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
  );
}
