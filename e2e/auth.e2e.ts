import { expect, signIn, test } from "./fixtures";

test("signed-out visitors are sent to sign-in", async ({ page }) => {
  await page.goto("/history");
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("sign in lands on Weigh-ins; sign out returns to sign-in", async ({ page, user }) => {
  await signIn(page, user);
  await expect(page).toHaveURL(/\/weigh-ins$/);
  await expect(page.getByRole("heading", { name: "Weigh-ins", level: 1 })).toBeVisible();

  await page.getByRole("link", { name: "Settings" }).click();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);

  // The session is really gone: protected pages bounce back to sign-in.
  await page.goto("/weigh-ins");
  await expect(page).toHaveURL(/\/sign-in$/);
});
