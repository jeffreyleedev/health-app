/**
 * Pure helpers for the sign-in flow. No Supabase or Next.js imports, so
 * they can be unit tested directly.
 */

export const MIN_PASSWORD_LENGTH = 8;
/** Supabase hashes passwords with bcrypt, which only uses the first 72 bytes. */
export const MAX_PASSWORD_LENGTH = 72;

/** Pages a signed-out visitor may open. Everything else redirects to /sign-in. */
export const PUBLIC_PATHS = ["/sign-in", "/sign-up", "/forgot-password", "/auth/confirm", "/auth/error"] as const;

/** Pages a signed-in user has no reason to see; they're sent home instead. */
export const SIGNED_OUT_ONLY_PATHS = ["/sign-in", "/sign-up"] as const;

function matchesPath(pathname: string, paths: readonly string[]): boolean {
  return paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function isPublicPath(pathname: string): boolean {
  return matchesPath(pathname, PUBLIC_PATHS);
}

export function isSignedOutOnlyPath(pathname: string): boolean {
  return matchesPath(pathname, SIGNED_OUT_ONLY_PATHS);
}

/**
 * Returns `next` only if it's a path on this site, otherwise `fallback`.
 *
 * Email links carry a `next` parameter saying where to go afterwards.
 * Without this check, a crafted link like `...&next=https://evil.example`
 * (or the sneakier `//evil.example`, which browsers treat as another site)
 * could bounce a freshly signed-in user to a lookalike page.
 */
export function safeRedirectPath(next: string | null | undefined, fallback = "/"): string {
  if (!next) return fallback;
  if (!next.startsWith("/")) return fallback; // absolute URLs, "javascript:", etc.
  if (next.startsWith("//") || next.startsWith("/\\")) return fallback; // protocol-relative
  return next;
}

/**
 * The address a Supabase email link should finally land on:
 * `<origin>/auth/confirm?next=<path>`. Supabase adds `&code=...` to it.
 *
 * `origin` comes from the request (e.g. http://localhost:3000 in development,
 * the real domain once deployed). Returns null if it isn't an http(s) origin.
 */
export function authConfirmUrl(origin: string | null | undefined, next: string): string | null {
  if (!origin) return null;
  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  const url = new URL("/auth/confirm", parsed.origin);
  url.searchParams.set("next", safeRedirectPath(next));
  return url.toString();
}

export type ValidationResult = { ok: true } | { ok: false; error: string };

// Deliberately loose: Supabase does the real check when it sends the email.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): ValidationResult {
  return EMAIL_PATTERN.test(email) ? { ok: true } : { ok: false, error: "Enter a valid email address." };
}

export function validateNewPassword(password: string): ValidationResult {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
  }
  if (new TextEncoder().encode(password).length > MAX_PASSWORD_LENGTH) {
    return { ok: false, error: `Password must be at most ${MAX_PASSWORD_LENGTH} characters.` };
  }
  return { ok: true };
}

/** Reads a text field from a submitted form, treating missing values as "". */
export function formText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}
