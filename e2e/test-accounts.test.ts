// Unit tests (Vitest) for the rule that decides which accounts are e2e test
// accounts. The daily sweep deletes whatever this rule matches, so these
// cases check it can never match a real address.

import { describe, expect, it } from "vitest";
import { isSweepable, newTestEmail, parseBaseEmail, SWEEP_MIN_AGE_MS, testEmailPattern } from "./test-accounts";

const BASE = "someone@example.com";
const pattern = testEmailPattern(BASE);

describe("parseBaseEmail", () => {
  it("splits a plain address and lowercases it", () => {
    expect(parseBaseEmail(" Someone@Example.com ")).toEqual({ local: "someone", domain: "example.com" });
  });

  it.each([undefined, "", "someone", "someone@", "@example.com", "a@b@example.com", "someone@localhost"])(
    "rejects %j",
    (base) => {
      expect(() => parseBaseEmail(base)).toThrow(/E2E_EMAIL_BASE/);
    },
  );
});

describe("newTestEmail", () => {
  it("adds +test, the timestamp and 4 random digits", () => {
    expect(newTestEmail(BASE, 1763500000000, 0.0123)).toBe("someone+test17635000000000123@example.com");
  });

  it("always produces an address the sweep pattern matches", () => {
    for (const random of [0, 0.5, 0.99999]) expect(pattern.test(newTestEmail(BASE, Date.now(), random))).toBe(true);
  });
});

describe("testEmailPattern", () => {
  it.each(["someone+test1@example.com", "someone+test17635000000000123@example.com", "SOMEONE+TEST42@EXAMPLE.COM"])(
    "matches %s",
    (email) => {
      expect(pattern.test(email)).toBe(true);
    },
  );

  it.each([
    "someone@example.com", // the base address itself
    "someone+test@example.com", // no digits
    "someone+testing@example.com",
    "someone+test12a@example.com",
    "someone+test1@example.co", // other domain
    "someone+test1@example.com.evil.com",
    "someone+test1@sub.example.com",
    "xsomeone+test1@example.com", // other local part
    "some+test1@example.com",
    "other+test1@example.com",
    "someone+test1+x@example.com",
    "someone+test1@exampleXcom", // "." must be literal
  ])("does not match %s", (email) => {
    expect(pattern.test(email)).toBe(false);
  });
});

describe("isSweepable", () => {
  const now = Date.parse("2026-11-18T12:00:00Z");
  const old = new Date(now - SWEEP_MIN_AGE_MS - 1000).toISOString();
  const recent = new Date(now - 5 * 60 * 1000).toISOString();

  it("deletes old test accounts", () => {
    expect(isSweepable({ email: "someone+test1@example.com", created_at: old }, pattern, now)).toBe(true);
  });

  it("leaves test accounts younger than an hour (a run may be using them)", () => {
    expect(isSweepable({ email: "someone+test1@example.com", created_at: recent }, pattern, now)).toBe(false);
  });

  it("never deletes other accounts, however old", () => {
    expect(isSweepable({ email: "someone@example.com", created_at: old }, pattern, now)).toBe(false);
    expect(isSweepable({ email: "friend+test1@gmail.com", created_at: old }, pattern, now)).toBe(false);
    expect(isSweepable({ email: null, created_at: old }, pattern, now)).toBe(false);
  });

  it("skips accounts with an unreadable creation time", () => {
    expect(isSweepable({ email: "someone+test1@example.com", created_at: "?" }, pattern, now)).toBe(false);
  });
});
