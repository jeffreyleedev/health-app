import { ACCOUNT_DELETED_NOTICE } from "@/lib/account-deletion";
import { expect, signIn, test, userExists } from "./fixtures";

test("change your name in Settings", async ({ page, user }) => {
  await signIn(page, user);
  await page.getByRole("link", { name: "Settings" }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByText("Signed in as E2E Tester.")).toBeVisible();

  await page.getByLabel("Name (optional)").fill("E2E Renamed");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status")).toHaveText("Settings saved.");

  await page.reload();
  await expect(page.getByText("Signed in as E2E Renamed.")).toBeVisible();
});

test("delete your account from Settings", async ({ page, user }) => {
  await signIn(page, user);
  await page.goto("/settings");

  await page.getByLabel("Enter your password to confirm").fill(user.password);
  await page.getByRole("button", { name: "Delete my account" }).click();

  await expect(page).toHaveURL(/\/sign-in\?deleted=1$/);
  await expect(page.getByRole("status")).toHaveText(ACCOUNT_DELETED_NOTICE);
  expect(await userExists(user)).toBe(false);
});
