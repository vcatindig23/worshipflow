import { expect, test } from "@playwright/test"

test("server-returned sign-up errors focus the summary for keyboard users", async ({ page }) => {
  await page.goto("/signup?error=invalid_details")

  const summary = page.locator("[data-form-error-summary]")
  await expect(summary).toBeVisible()
  await expect(summary).toBeFocused()
  await expect(summary).toContainText("Passwords must match")
})
