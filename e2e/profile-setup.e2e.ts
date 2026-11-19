import { expect, signIn, test } from "./fixtures";

// A brand-new account with no profile yet.
test.use({ withProfile: false });

test("a new user sets up their profile and is asked for a first weigh-in", async ({ page, user }) => {
  await signIn(page, user);
  await expect(page).toHaveURL(/\/profile\/setup$/);

  await page.getByLabel("Name (optional)").fill("New Tester");
  await page.getByLabel("Imperial (lb, ft/in)").check();
  await page.getByLabel("Date of birth").fill("1990-05-20");
  await page.getByLabel("Female").check();
  await page.getByLabel("ft", { exact: true }).fill("5");
  await page.getByLabel("in", { exact: true }).fill("6");
  await page.getByLabel("Activity level").selectOption("lightlyActive");
  await page.getByRole("button", { name: "Save and continue" }).click();

  await expect(page).toHaveURL(/\/weigh-ins$/);
  await expect(page.getByRole("heading", { name: "Log your first weigh-in" })).toBeVisible();
  // The chosen units are used from now on.
  await expect(page.getByLabel("Weight (lb)")).toBeVisible();
});
