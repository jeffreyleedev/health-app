import { formatDate } from "@/lib/dates";
import { expect, seedCalories, seedWeighIns, signIn, test, today } from "./fixtures";

test("History shows today's averages, charts and BMI", async ({ page, user }) => {
  await seedWeighIns(user, [{ date: today(), weightKg: 60 }]);
  await seedCalories(user, [
    { date: today(), calories: 2000 },
    { date: today(), calories: 500 },
  ]);
  await signIn(page, user);
  await page.goto("/history");

  await expect(page.getByRole("button", { name: "Daily" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("heading", { name: "Weight (kg)" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "BMI" })).toBeVisible();

  // Today's row: one weigh-in, two calorie entries summed into one day.
  const row = page.getByRole("row").filter({ hasText: "so far" });
  await expect(row).toContainText(formatDate(today()));
  await expect(row).toContainText("60.0 kg");
  await expect(row).toContainText("2,500");
  await expect(row).toContainText("22.0");
});
