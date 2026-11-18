"use client";

/**
 * BMR, TDEE, and weight-loss targets (bottom of the Calories page). Runs
 * entirely in the browser: results update as you type and are never saved.
 */

import { calculate, MIN_SAFE_CALORIES, weightLossTargets, type CalculatorStats } from "@/lib/calculator";
import { ACTIVITY_LEVELS, type ActivityLevel } from "@/lib/formulas";
import type { UnitSystem } from "@/lib/units";
import { useLocalToday } from "./use-local-today";
import { useWeightBox, type LatestWeighIn } from "./weight-box";

interface Props {
  stats: CalculatorStats;
  activityLevel: ActivityLevel;
  unitSystem: UnitSystem;
  latest: LatestWeighIn;
}

export function BmrTdee({ stats, activityLevel, unitSystem, latest }: Props) {
  const { kg, box } = useWeightBox(latest, unitSystem);
  const today = useLocalToday(); // "" until the browser fills it in (age needs it)
  const result = kg !== null && today ? calculate({ weightKg: kg, stats, today }) : null;

  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold">BMR and TDEE</h2>
      {box}

      {result && (
        <>
          <section className="flex flex-col gap-1">
            <h3 className="font-semibold">BMR</h3>
            <p className="text-3xl font-semibold">
              {result.bmr.toLocaleString("en-US")} <span className="text-base font-normal">calories/day</span>
            </p>
            <p className="text-sm text-muted">
              Calories your body burns at rest (Mifflin-St Jeor, age {result.ageYears}).
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="font-semibold">TDEE</h3>
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
                      <td className="py-1 text-right tabular-nums">
                        {result.tdeeByLevel[level].toLocaleString("en-US")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="font-semibold">Weight loss</h3>
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
        </>
      )}
    </section>
  );
}
