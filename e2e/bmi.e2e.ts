import { expect, seedWeighIns, signIn, test, today } from "./fixtures";

test("BMI uses the latest weigh-in and previews a typed weight", async ({ page, user }) => {
  await seedWeighIns(user, [{ date: today(), weightKg: 60 }]);
  await signIn(page, user);
  await page.goto("/bmi");

  // 60 kg at 165 cm → 22.0.
  const result = page.getByRole("region", { name: "Your BMI" });
  await expect(result).toContainText("22.0");
  await expect(result).toContainText("Healthy weight (18.5–24.9)");

  // 80 kg → 29.4, shown as a preview only.
  await page.getByLabel("Weight (kg)").fill("80");
  await expect(result).toContainText("29.4");
  await expect(result).toContainText("Overweight (25–29.9)");
  await expect(page.getByText("Preview — not saved.")).toBeVisible();
});
