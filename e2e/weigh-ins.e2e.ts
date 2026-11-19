import { formatDate } from "@/lib/dates";
import { expect, signIn, test, today } from "./fixtures";

test("log a weigh-in and see it in the recent list", async ({ page, user }) => {
  await signIn(page, user);
  await expect(page.getByRole("heading", { name: "Log your first weigh-in" })).toBeVisible();
  // The browser fills in today's date once the page loads.
  await expect(page.getByLabel("Date")).toHaveValue(today());

  await page.getByLabel("Weight (kg)").fill("62.4");
  await page.getByRole("button", { name: "Save", exact: true }).click();

  await expect(page.getByRole("status")).toHaveText(`Saved 62.4 kg for ${formatDate(today())}.`);
  await expect(page.getByRole("listitem").filter({ hasText: formatDate(today()) })).toContainText("62.4 kg");
  await expect(page.getByRole("heading", { name: "Log a weigh-in" })).toBeVisible();
});
