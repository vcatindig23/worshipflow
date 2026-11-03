import { expect, test } from "@playwright/test"

test("server-side sign-up validation focuses the error summary", async ({ page }) => {
  await page.goto("/signup")
  await page.getByLabel("Full name").fill("Worship Team Member")
  await page.getByLabel("Email address").fill("member@example.com")
  await page.getByLabel("Password", { exact: true }).fill("WorshipFlow#2026")
  await page.getByLabel("Confirm password").fill("DifferentPassword#2026")
  await page.getByRole("button", { name: "Create account" }).click()

  await expect(page).toHaveURL(/\/signup\?error=invalid_details/)
  const summary = page.locator("[data-form-error-summary]")
  await expect(summary).toBeVisible()
  await expect(summary).toBeFocused()
  await expect(summary).toContainText("Passwords must match")
})
