"use client";

/**
 * BMR, TDEE, and BMI calculators. Runs entirely in the browser: results
 * update as you type and are never saved. The weight starts at your latest
 * weigh-in; changing it previews a what-if weight.
 */

import Link from "next/link";
import { useState } from "react";
import {
  calculate,
  chosenWeight,
  MIN_SAFE_CALORIES,
  weightBoxText,
  weightLossTargets,
  type CalculatorStats,
} from "@/lib/calculator";
import { formatDate, type DateString } from "@/lib/dates";
import { ACTIVITY_LEVELS, BMI_CATEGORY_COLOR, BMI_CATEGORY_LABELS, type ActivityLevel } from "@/lib/formulas";
import type { UnitSystem } from "@/lib/units";
import { useLocalToday } from "./use-local-today";

interface Props {
  stats: CalculatorStats;
  activityLevel: ActivityLevel;
  unitSystem: UnitSystem;
  latest: { date: DateString; weightKg: number } | null;
}

export function Calculators({ stats, activityLevel, unitSystem, latest }: Props) {
  const unit = unitSystem === "metric" ? "kg" : "lb";
  const startText = latest ? weightBoxText(latest.weightKg, unitSystem) : "";
  const [typed, setTyped] = useState<string | null>(null);
  const today = useLocalToday(); // "" until the browser fills it in
  const weight = chosenWeight(typed, latest?.weightKg ?? null, unitSystem);
  const kg = weight.kind === "latest" || weight.kind === "preview" ? weight.kg : null;
  const result = kg !== null && today ? calculate({ weightKg: kg, stats, today }) : null;

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Weight ({unit})</span>
          <input
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            value={typed ?? startText}
            onChange={(e) => setTyped(e.target.value)}
            className="rounded border border-line px-3 py-2"
          />
        </label>

        {weight.kind === "latest" && latest && (
          <p className="text-sm text-muted">From your weigh-in on {formatDate(latest.date)}.</p>
        )}
        {weight.kind === "preview" && <p className="text-sm font-medium text-warning">Preview — not saved.</p>}
        {weight.kind === "error" && (
          <p role="alert" className="text-sm text-danger">
            {weight.error}
          </p>
        )}
        {!latest && (
          <p className="text-sm text-muted">
            Log a weigh-in to use your latest weight.{" "}
            <Link href="/" className="underline">
              Go to Log
            </Link>
          </p>
        )}
        {latest && typed !== null && typed !== startText && (
          <button
            type="button"
            onClick={() => setTyped(null)}
            className="self-start rounded border border-line px-3 py-1 text-sm"
          >
            Use my latest weigh-in
          </button>
        )}
      </section>

      {result && (
        <>
          <section className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">BMR</h2>
            <p className="text-3xl font-semibold">
              {result.bmr.toLocaleString("en-US")} <span className="text-base font-normal">calories/day</span>
            </p>
            <p className="text-sm text-muted">
              Calories your body burns at rest (Mifflin-St Jeor, age {result.ageYears}).
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold">TDEE</h2>
            <p className="text-3xl font-semibold">
              {result.tdeeByLevel[activityLevel].toLocaleString("en-US")}{" "}
              <span className="text-base font-normal">calories/day</span>
            </p>
            <p className="text-sm text-muted">BMR × your activity level: calories to maintain your weight.</p>
            <table className="w-full text-sm">
              <tbody>
                {(Object.keys(ACTIVITY_LEVELS) as ActivityLevel[]).map((level) => {
                  const mine = level === activityLevel;
                  return (
                    // Highlight tints with the page's own text color (works in light and dark mode),
                    // plus a left bar so it doesn't rely on the tint alone.
                    <tr key={level} className={mine ? "bg-foreground/10 font-semibold" : undefined}>
                      <td className={`border-l-4 py-1 pr-2 pl-2 ${mine ? "border-foreground" : "border-transparent"}`}>
                        {ACTIVITY_LEVELS[level].label}
                        {mine && " — yours"}
                      </td>
                      <td className="py-1 text-right tabular-nums">{result.tdeeByLevel[level].toLocaleString("en-US")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold">Weight loss</h2>
            <p className="text-sm text-muted">Most you can eat per day to lose weight at each pace.</p>
            <ul className="flex flex-col gap-2">
              {weightLossTargets(result.tdeeByLevel[activityLevel], unitSystem, stats.sex).map((t) => (
                <li key={t.label} className="flex flex-col border-b border-line pb-2 text-sm">
                  <span className="flex justify-between gap-2">
                    <span>{t.label}</span>
                    <span className={`tabular-nums font-semibold ${t.belowMinimum ? "text-warning" : ""}`}>
                      {t.calories === null ? "Not possible" : `${t.calories.toLocaleString("en-US")} calories/day`}
                    </span>
                  </span>
                  {t.calories === null ? (
                    <span role="alert" className="text-xs text-warning">
                      This would be below zero calories.
                    </span>
                  ) : (
                    t.belowMinimum && (
                      <span role="alert" className="text-xs text-warning">
                        Below the commonly recommended minimum of {MIN_SAFE_CALORIES[stats.sex].toLocaleString("en-US")}{" "}
                        calories/day. Talk to a doctor before eating this little.
                      </span>
                    )
                  )}
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted">
              Estimates use about 3,500 calories per pound of fat. Actual loss varies.
            </p>
          </section>

          <section className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">BMI</h2>
            <p className={`text-3xl font-semibold ${BMI_CATEGORY_COLOR[result.bmiCategory]}`}>{result.bmi.toFixed(1)}</p>
            <p className={`text-sm ${BMI_CATEGORY_COLOR[result.bmiCategory]}`}>{BMI_CATEGORY_LABELS[result.bmiCategory]}</p>
            <p className="text-xs text-muted">Standard adult categories. BMI doesn&apos;t account for muscle or build.</p>
          </section>
        </>
      )}
    </div>
  );
}
