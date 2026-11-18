"use client";

/**
 * History: the last 12 periods for the chosen cadence, grouped in the
 * browser so switching cadence is instant. Ends at the period containing
 * your local today (labeled "so far").
 */

import { useState } from "react";
import { BMI_CATEGORY_COLOR, BMI_CATEGORY_LABELS, bmi, bmiCategory } from "@/lib/formulas";
import {
  formatPeriod,
  HISTORY_PERIODS,
  recentHistory,
  type Cadence,
  type CalorieEntry,
  type WeighIn,
} from "@/lib/history";
import { displayWeight, roundTo, type UnitSystem } from "@/lib/units";
import { LineChart } from "./line-chart";
import { useLocalToday } from "./use-local-today";

const CADENCES: { key: Cadence; label: string }[] = [
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "biweekly", label: "Bi-weekly" },
  { key: "monthly", label: "Monthly" },
];

interface Props {
  weighIns: WeighIn[];
  calorieEntries: CalorieEntry[];
  unitSystem: UnitSystem;
  heightCm: number;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function History({ weighIns, calorieEntries, unitSystem, heightCm }: Props) {
  const [cadence, setCadence] = useState<Cadence>("weekly");
  const today = useLocalToday(); // "" until the browser fills it in

  const periods = today ? recentHistory(weighIns, calorieEntries, cadence, today, HISTORY_PERIODS) : [];
  const rows = periods.map((p, i) => {
    const bmiValue = p.averageWeightKg === null ? null : bmi(p.averageWeightKg, heightCm);
    return {
      ...p,
      label: formatPeriod(p, cadence),
      current: i === periods.length - 1,
      weight: p.averageWeightKg === null ? null : displayWeight(p.averageWeightKg, unitSystem),
      bmi: bmiValue === null ? null : roundTo(bmiValue, 1),
      category: bmiValue === null ? null : bmiCategory(bmiValue),
    };
  });
  const hasData = rows.some((r) => r.weighInCount > 0 || r.loggedCalorieDays > 0);
  const hasWeighIns = rows.some((r) => r.weighInCount > 0);
  const weightUnit = unitSystem === "metric" ? "kg" : "lb";
  // The table hides periods with no entries at all; the current period always shows.
  // Charts still get every period so their time axis stays even.
  const tableRows = rows.filter((r) => r.current || r.weighInCount > 0 || r.loggedCalorieDays > 0).reverse();

  return (
    <div className="flex flex-col gap-6">
      <div role="group" aria-label="Group by" className="flex flex-wrap gap-2">
        {CADENCES.map((c) => (
          <button
            key={c.key}
            type="button"
            aria-pressed={cadence === c.key}
            onClick={() => setCadence(c.key)}
            className={
              cadence === c.key
                ? "rounded bg-foreground px-3 py-1 text-sm font-medium text-background"
                : "rounded border border-line px-3 py-1 text-sm"
            }
          >
            {c.label}
          </button>
        ))}
      </div>

      {!today ? (
        <p>Loading…</p>
      ) : (
        <>
          {!hasData && <p className="text-sm text-muted">No entries in the last {HISTORY_PERIODS} periods yet.</p>}

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold">Weight ({weightUnit})</h2>
            {hasWeighIns ? (
              <LineChart
                name="Weight"
                unit={` ${weightUnit}`}
                step={1}
                points={rows.map((r) => ({ label: r.label, value: r.weight?.value ?? null }))}
              />
            ) : (
              <p className="text-sm text-muted">No weigh-ins in this window.</p>
            )}
            <p className="text-xs text-muted">Average weight per period.</p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold">BMI</h2>
            {hasWeighIns ? (
              <LineChart name="BMI" unit="" step={0.5} points={rows.map((r) => ({ label: r.label, value: r.bmi }))} />
            ) : (
              <p className="text-sm text-muted">No weigh-ins in this window.</p>
            )}
            <p className="text-xs text-muted">Uses your current height for every period.</p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold">By period</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th className="py-1 pr-2 font-medium">Period</th>
                  <th className="py-1 pr-2 text-right font-medium">Weight</th>
                  <th className="py-1 pr-2 text-right font-medium">Cal/day</th>
                  <th className="py-1 text-right font-medium">BMI</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((r) => (
                  <tr key={r.start} className="border-b border-line align-top">
                    <td className="py-2 pr-2">
                      {r.label}
                      {r.current && <span className="block text-xs text-muted">so far</span>}
                    </td>
                    <td className="py-2 pr-2 text-right tabular-nums">
                      {r.weight ? `${r.weight.value.toFixed(1)} ${r.weight.unit}` : "—"}
                      {r.weighInCount > 0 && (
                        <span className="block text-xs text-muted">{plural(r.weighInCount, "weigh-in")}</span>
                      )}
                    </td>
                    <td className="py-2 pr-2 text-right tabular-nums">
                      {r.averageDailyCalories === null
                        ? "—"
                        : Math.round(r.averageDailyCalories).toLocaleString("en-US")}
                      {r.loggedCalorieDays > 0 && (
                        <span className="block text-xs text-muted">{plural(r.loggedCalorieDays, "day")}</span>
                      )}
                    </td>
                    {/* Colored by category (number + label); "—" for empty periods stays plain. */}
                    <td className={`py-2 text-right tabular-nums ${r.category ? BMI_CATEGORY_COLOR[r.category] : ""}`}>
                      {r.bmi === null ? "—" : r.bmi.toFixed(1)}
                      {r.category && (
                        <span className="block text-xs">{BMI_CATEGORY_LABELS[r.category].split(" (")[0]}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}
