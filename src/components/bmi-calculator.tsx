"use client";

/**
 * BMI from the weight box and your stored height. Runs in the browser and
 * shows as soon as the weight is valid (BMI needs no age, so no date).
 */

import { calculateBmi } from "@/lib/calculator";
import { BMI_CATEGORY_COLOR, BMI_CATEGORY_LABELS } from "@/lib/formulas";
import type { UnitSystem } from "@/lib/units";
import { useWeightBox, type LatestWeighIn } from "./weight-box";

interface Props {
  heightCm: number;
  unitSystem: UnitSystem;
  latest: LatestWeighIn;
}

export function BmiCalculator({ heightCm, unitSystem, latest }: Props) {
  const { kg, box } = useWeightBox(latest, unitSystem);
  const result = kg !== null ? calculateBmi(kg, heightCm) : null;

  return (
    <div className="flex flex-col gap-6">
      {box}
      {result && (
        <section className="flex flex-col gap-1" aria-label="Your BMI">
          <p className={`text-3xl font-semibold ${BMI_CATEGORY_COLOR[result.bmiCategory]}`}>{result.bmi.toFixed(1)}</p>
          <p className={`text-sm ${BMI_CATEGORY_COLOR[result.bmiCategory]}`}>
            {BMI_CATEGORY_LABELS[result.bmiCategory]}
          </p>
          <p className="text-xs text-muted">Standard adult categories. BMI doesn&apos;t account for muscle or build.</p>
        </section>
      )}
    </div>
  );
}
