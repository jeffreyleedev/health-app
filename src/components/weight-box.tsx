"use client";

/**
 * The weight box shared by the BMR/TDEE section (Calories page) and the BMI
 * page. It starts at your latest weigh-in; typing a different weight
 * previews it. Nothing is saved, and each page has its own box, so leaving
 * the page resets it to your latest weigh-in.
 */

import Link from "next/link";
import { useState } from "react";
import { chosenWeight, weightBoxText } from "@/lib/calculator";
import { formatDate, type DateString } from "@/lib/dates";
import type { UnitSystem } from "@/lib/units";

export type LatestWeighIn = { date: DateString; weightKg: number } | null;

/** The weight a calculator should use (kg, or null while empty/invalid), plus the box to show. */
export function useWeightBox(latest: LatestWeighIn, unitSystem: UnitSystem) {
  const [typed, setTyped] = useState<string | null>(null);
  const weight = chosenWeight(typed, latest?.weightKg ?? null, unitSystem);
  const kg = weight.kind === "latest" || weight.kind === "preview" ? weight.kg : null;
  const box = <WeightBox latest={latest} unitSystem={unitSystem} typed={typed} onTyped={setTyped} weight={weight} />;
  return { kg, box };
}

interface WeightBoxProps {
  latest: LatestWeighIn;
  unitSystem: UnitSystem;
  typed: string | null;
  onTyped: (text: string | null) => void;
  weight: ReturnType<typeof chosenWeight>;
}

function WeightBox({ latest, unitSystem, typed, onTyped, weight }: WeightBoxProps) {
  const unit = unitSystem === "metric" ? "kg" : "lb";
  const startText = latest ? weightBoxText(latest.weightKg, unitSystem) : "";

  return (
    <section className="flex flex-col gap-2">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Weight ({unit})</span>
        <input
          type="number"
          inputMode="decimal"
          step="any"
          min="0"
          value={typed ?? startText}
          onChange={(e) => onTyped(e.target.value)}
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
          <Link href="/weigh-ins" className="underline">
            Go to Weigh-ins
          </Link>
        </p>
      )}
      {latest && typed !== null && typed !== startText && (
        <button
          type="button"
          onClick={() => onTyped(null)}
          className="self-start rounded border border-line px-3 py-1 text-sm"
        >
          Use my latest weigh-in
        </button>
      )}
    </section>
  );
}
