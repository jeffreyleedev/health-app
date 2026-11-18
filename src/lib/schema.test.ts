/**
 * Guards against the SQL schema and the TypeScript code drifting apart:
 * the allowed values in the database's CHECK constraints must match the
 * values the app's code uses.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ACTIVITY_LEVELS } from "./formulas";

const migrationsDir = join(__dirname, "../../supabase/migrations");
const sql = readFileSync(join(migrationsDir, "0001_initial_schema.sql"), "utf8");

/** Every migration with SQL comments stripped, so commentary can't trigger a match. */
const allMigrations = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => ({
    file: f,
    sql: readFileSync(join(migrationsDir, f), "utf8").replace(/--.*$/gm, ""),
  }));

/** Pulls the quoted values out of `check (<column> in (...))`. */
function allowedValues(column: string): string[] {
  const match = new RegExp(`check \\(${column} in \\(([^)]*)\\)\\)`).exec(sql);
  if (!match) throw new Error(`No CHECK ... IN constraint found for ${column}`);
  return [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

describe("schema matches the code", () => {
  it("activity levels", () => {
    expect(allowedValues("activity_level")).toEqual(Object.keys(ACTIVITY_LEVELS));
  });

  it("sex", () => {
    expect(allowedValues("sex")).toEqual(["male", "female"]);
  });

  it("unit system", () => {
    expect(allowedValues("unit_system")).toEqual(["metric", "imperial"]);
  });
});

describe("row level security", () => {
  const created = [...sql.matchAll(/create table (public\.\w+)/g)].map((m) => m[1]);
  const secured = new Set([...sql.matchAll(/alter table (public\.\w+)\s+enable row level security/g)].map((m) => m[1]));

  it("finds the tables", () => {
    expect(created).toEqual(["public.profiles", "public.weigh_ins", "public.calorie_entries"]);
  });

  it("is enabled on every table the migration creates", () => {
    expect(created.filter((t) => !secured.has(t))).toEqual([]);
  });

  it("has no policies in any migration (only the server's secret key may access rows)", () => {
    for (const m of allMigrations) expect(m.sql, m.file).not.toMatch(/create policy/i);
  });
});

describe("table privileges", () => {
  const grants = allMigrations.flatMap((m) =>
    [...m.sql.matchAll(/grant\s[\s\S]*?\bto\s+([^;]+);/gi)].map((g) => ({
      file: m.file,
      roles: g[1].split(",").map((r) => r.trim().toLowerCase()),
    })),
  );

  it("never grants anything to the browser roles", () => {
    const browserGrants = grants.filter((g) =>
      g.roles.some((r) => r === "anon" || r === "authenticated" || r === "public"),
    );
    expect(browserGrants).toEqual([]);
  });

  it("grants the server role access", () => {
    expect(grants.some((g) => g.roles.includes("service_role"))).toBe(true);
  });
});
