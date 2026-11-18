/**
 * Guards the "every page load checks for a profile" rule: fails if any
 * protected page doesn't call requireProfile().
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const APP_DIR = join(__dirname, "../app");

/** Route folders (relative to src/app) whose pages don't need a profile. */
const EXEMPT = new Set([
  "sign-in",
  "sign-up",
  "forgot-password",
  "auth/error",
  "update-password", // must work for someone who never finished setup
  "profile/setup", // where requireProfile() sends people
]);

function findPages(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return findPages(path);
    return name === "page.tsx" ? [path] : [];
  });
}

const pages = findPages(APP_DIR).map((file) => ({
  file,
  route: relative(APP_DIR, join(file, "..")).replaceAll("\\", "/"),
}));

describe("profile check on every protected page", () => {
  it("finds the app's pages", () => {
    expect(pages.map((p) => p.route)).toContain("");
    expect(pages.map((p) => p.route)).toContain("profile/setup");
  });

  it("every non-exempt page calls requireProfile()", () => {
    const missing = pages
      .filter((p) => !EXEMPT.has(p.route))
      .filter((p) => !/\brequireProfile\(\)/.test(readFileSync(p.file, "utf8")))
      .map((p) => p.route || "/");
    expect(missing).toEqual([]);
  });

  it("exempt list has no stale entries", () => {
    const routes = new Set(pages.map((p) => p.route));
    expect([...EXEMPT].filter((r) => !routes.has(r))).toEqual([]);
  });
});
