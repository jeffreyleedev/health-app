/**
 * Rules for e2e test accounts, shared by the tests (which create them) and
 * the daily cleanup sweep (which deletes leftovers). Keeping both in one
 * place means the sweep can only ever delete addresses the tests could have
 * created.
 *
 * A test address is the base address (E2E_EMAIL_BASE) with "+test<digits>"
 * added before the "@":  name@example.com → name+test1763500000000123@example.com
 *
 * No imports, so `node` can load this file directly (type stripping) from
 * scripts/e2e-cleanup.mjs.
 */

/** Leftovers younger than this are left alone: a test run may still be using them. */
export const SWEEP_MIN_AGE_MS = 60 * 60 * 1000;

/** Splits and checks the base address. Throws if it isn't a plain "local@domain". */
export function parseBaseEmail(base: string | undefined): { local: string; domain: string } {
  const trimmed = (base ?? "").trim().toLowerCase();
  const match = /^([^@\s]+)@([^@\s]+\.[^@\s]+)$/.exec(trimmed);
  if (!match) throw new Error("E2E_EMAIL_BASE must be set to an email address like name@example.com");
  return { local: match[1], domain: match[2] };
}

/** A new, unique test address: millisecond timestamp plus 4 random digits. */
export function newTestEmail(base: string | undefined, now: number = Date.now(), random: number = Math.random()) {
  const { local, domain } = parseBaseEmail(base);
  const digits = `${now}${String(Math.floor(random * 10_000)).padStart(4, "0")}`;
  return `${local}+test${digits}@${domain}`;
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Matches exactly <base local>+test<one or more digits>@<base domain>, nothing else. */
export function testEmailPattern(base: string | undefined): RegExp {
  const { local, domain } = parseBaseEmail(base);
  return new RegExp(`^${escapeRegExp(local)}\\+test\\d+@${escapeRegExp(domain)}$`, "i");
}

/** Whether the sweep may delete this account. */
export function isSweepable(
  user: { email?: string | null; created_at: string },
  pattern: RegExp,
  now: number = Date.now(),
): boolean {
  if (!user.email || !pattern.test(user.email)) return false;
  const created = Date.parse(user.created_at);
  return Number.isFinite(created) && now - created > SWEEP_MIN_AGE_MS;
}
