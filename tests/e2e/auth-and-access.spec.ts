import { expect, test } from "@playwright/test"

test.describe("WorshipFlow authentication", () => {
  test("sign-in page exposes accessible email and password controls", async ({ page }) => {
    const response = await page.goto("/login")

    expect(response?.status()).toBe(200)
    await expect(page).toHaveTitle(/WorshipFlow/i)
    await expect(
      page.getByRole("heading", { name: "Sign in to WorshipFlow", level: 1 })
    ).toBeVisible()

    const email = page.getByRole("textbox", { name: "Email address" })
    const password = page.locator("#password")
    await expect(email).toHaveAttribute("type", "email")
    await expect(email).toHaveAttribute("autocomplete", "email")
    await expect(password).toHaveAttribute("type", "password")

    await page.getByRole("button", { name: "Show password" }).click()
    await expect(password).toHaveAttribute("type", "text")
    await page.getByRole("button", { name: "Hide password" }).click()
    await expect(password).toHaveAttribute("type", "password")
  })

  test("visitors can navigate from sign-in to sign-up", async ({ page }) => {
    await page.goto("/login")
    await page.getByRole("link", { name: "Create an account" }).click()

    await expect(page).toHaveURL(/\/signup$/)
    await expect(
      page.getByRole("heading", { name: "Create your account", level: 1 })
    ).toBeVisible()

    await expect(page.getByLabel("Full name")).toBeVisible()
    await expect(page.getByLabel("Email address")).toBeVisible()
    await expect(page.getByLabel("Password", { exact: true })).toBeVisible()
    await expect(page.getByLabel("Confirm password")).toBeVisible()
    await expect(
      page.getByRole("link", { name: "Sign in", exact: true })
    ).toBeVisible()
  })

  test("forgot-password journey returns to sign-in", async ({ page }) => {
    await page.goto("/login")
    await page.getByRole("link", { name: "Forgot password?" }).click()

    await expect(page).toHaveURL(/\/forgot-password$/)
    await expect(
      page.getByRole("heading", { name: "Reset your password", level: 1 })
    ).toBeVisible()
    await expect(page.getByLabel("Email address")).toBeVisible()

    await page.getByRole("link", { name: "Back to sign in" }).click()
    await expect(page).toHaveURL(/\/login$/)
    await expect(
      page.getByRole("heading", { name: "Sign in to WorshipFlow" })
    ).toBeVisible()
  })

  test("workspace routes redirect unauthenticated visitors to sign-in", async ({ page }) => {
    const protectedPaths = [
      "/",
      "/my-schedule",
      "/services",
      "/setlists",
      "/notifications",
      "/settings/team",
      "/profile",
    ]

    for (const path of protectedPaths) {
      await page.goto(path)
      await expect(page, `Expected ${path} to require authentication`).toHaveURL(/\/login$/)
    }
  })

  test("authentication form controls remain visible on a narrow viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/login")

    const main = page.locator("#main-content")
    const email = page.getByRole("textbox", { name: "Email address" })
    const password = page.locator("#password")
    const submit = page.getByRole("button", { name: "Sign in" })

    for (const element of [main, email, password, submit]) {
      await expect(element).toBeVisible()
      const bounds = await element.boundingBox()
      expect(bounds).not.toBeNull()
      expect(bounds!.x).toBeGreaterThanOrEqual(0)
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(391)
    }
  })

  test("public pages include key security response headers", async ({ page }) => {
    const response = await page.goto("/login")
    expect(response).not.toBeNull()

    const headers = response!.headers()
    expect(headers["x-content-type-options"]).toBe("nosniff")
    expect(headers["x-frame-options"]).toBe("DENY")
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin")
  })
})
