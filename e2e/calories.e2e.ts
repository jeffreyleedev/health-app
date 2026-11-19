import { formatDate } from "@/lib/dates";
import { expect, seedWeighIns, signIn, test, today } from "./fixtures";

test("log calories and see BMR and TDEE from the latest weigh-in", async ({ page, user }) => {
  await seedWeighIns(user, [{ date: today(), weightKg: 60 }]);
  await signIn(page, user);
  await page.goto("/calories");
  await expect(page.getByLabel("Date")).toHaveValue(today());

  await page.getByLabel("Calories").fill("1800");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText(`Saved 1,800 calories for ${formatDate(today())}.`);
  await expect(page.getByRole("listitem").filter({ hasText: formatDate(today()) })).toContainText("1,800 cal");

  // Seeded profile: female, 30, 165 cm, moderately active; weight 60 kg.
  // BMR = 10×60 + 6.25×165 − 5×30 − 161 = 1,320.25; TDEE = BMR × 1.55 ≈ 2,046.
  await expect(page.getByText(`From your weigh-in on ${formatDate(today())}.`)).toBeVisible();
  // The section directly around each result's heading.
  const section = (name: string) => page.getByRole("heading", { name, exact: true, level: 3 }).locator("..");
  await expect(section("BMR")).toContainText("1,320 calories/day");
  await expect(section("TDEE")).toContainText("2,046 calories/day");
});
