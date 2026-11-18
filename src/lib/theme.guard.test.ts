/**
 * Guards the "colors follow the device's light/dark setting" rule: fails if
 * a component uses a fixed Tailwind color (bg-black, text-gray-600, ...)
 * instead of a named theme color from src/app/globals.css, or if a BMI
 * category color is missing from the theme (light and dark values).
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { BMI_CATEGORY_COLOR, BMI_CATEGORY_LABELS } from "./formulas";

const SRC_DIR = join(__dirname, "..");

const PALETTE =
  "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const FIXED_COLOR = new RegExp(
  `\\b(?:bg|text|border|ring|outline|divide|fill|stroke|from|via|to|decoration|accent|caret|placeholder)-(?:black|white|(?:${PALETTE})-\\d{2,3})\\b`,
  "g",
);

function findFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return findFiles(path);
    return /\.(tsx|ts)$/.test(name) && !name.endsWith(".test.ts") ? [path] : [];
  });
}

describe("theme colors", () => {
  it("no component uses a fixed color class", () => {
    const found = findFiles(SRC_DIR).flatMap((file) =>
      [...readFileSync(file, "utf8").matchAll(FIXED_COLOR)].map((m) => `${relative(SRC_DIR, file)}: ${m[0]}`),
    );
    expect(found).toEqual([]);
  });
});

describe("BMI_CATEGORY_COLOR", () => {
  it("gives every category a color that exists in the theme", () => {
    const css = readFileSync(join(__dirname, "../app/globals.css"), "utf8");
    expect(Object.keys(BMI_CATEGORY_COLOR).sort()).toEqual(Object.keys(BMI_CATEGORY_LABELS).sort());
    for (const cls of Object.values(BMI_CATEGORY_COLOR)) {
      const name = cls.replace(/^text-/, "");
      expect(css).toContain(`--color-${name}: var(--${name});`); // registered with Tailwind
      expect(css.match(new RegExp(`--${name}: #`, "g"))?.length).toBe(2); // light + dark values
    }
  });

  it("uses a different color for each category", () => {
    expect(new Set(Object.values(BMI_CATEGORY_COLOR)).size).toBe(4);
  });
});
