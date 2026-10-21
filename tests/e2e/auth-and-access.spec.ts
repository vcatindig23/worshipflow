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

  test("split-screen branding panel is present on desktop for login and signup", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })

    for (const path of ["/login", "/signup"]) {
      const response = await page.goto(path)
      expect(response?.status()).toBe(200)

      const brandPanel = page.locator("#main-content > div > aside")
      await expect(brandPanel).toBeVisible()
      await expect(
        brandPanel.getByRole("heading", { name: "Make room for what matters." })
      ).toBeVisible()
      await expect(
        brandPanel.getByText("Songs, lyrics, and chords", { exact: true })
      ).toBeVisible()
      await expect(
        brandPanel.getByText("Services and schedules", { exact: true })
      ).toBeVisible()
      await expect(page.locator("#main-content > div > section")).toBeVisible()
      await expect(
        page.getByRole("heading", {
          name: path === "/login" ? "Sign in to WorshipFlow" : "Create your account",
          level: 1,
        })
      ).toBeVisible()
      await expect(page.locator(".wf-aurora-background .wf-aurora-layer")).toHaveCount(1)
    }
  })

  test("mobile authentication keeps the aurora background and uses a stacked layout", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })

    for (const path of ["/login", "/signup"]) {
      await page.goto(path)

      await expect(page.locator("#main-content > div > aside")).toBeHidden()
      await expect(page.locator("#main-content > div > section")).toBeVisible()
      await expect(page.locator("#main-content > div > section header img[alt='WorshipFlow']")).toBeVisible()
      await expect(page.locator(".wf-aurora-background .wf-aurora-layer")).toHaveCount(1)
      await expect(
        page.getByRole("heading", {
          name: path === "/login" ? "Sign in to WorshipFlow" : "Create your account",
          level: 1,
        })
      ).toBeVisible()

      const dimensions = await page.evaluate(() => ({
        viewportWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
      }))
      expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth)
    }
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

  test("signed-out visitors see the animated public homepage and its calls to action", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    const desktopResponse = await page.goto("/")
    expect(desktopResponse?.status()).toBe(200)

    await expect(
      page.getByRole("heading", { name: /Bring your worship team into harmony/i, level: 1 })
    ).toBeVisible()
    await expect(page.getByRole("link", { name: "Create your workspace" })).toBeVisible()
    await expect(page.getByRole("link", { name: "I already have an account" })).toBeVisible()
    await expect(page.locator(".wf-landing-mesh")).toBeVisible()
    await expect(page.locator(".wf-landing-drape")).toBeVisible()
    await expect(page.locator(".wf-landing-drape canvas")).toHaveCount(1)
    await expect(page.getByRole("heading", { name: /Everything your team needs to prepare with confidence/i })).toBeVisible()
    const howItWorks = page.locator("#how-it-works")
    await expect(
      howItWorks.getByRole("heading", { name: "From song prep to service review.", level: 2 })
    ).toBeVisible()
    await expect(howItWorks.locator(":scope > ol > li")).toHaveCount(3)
    await expect(howItWorks.getByRole("link", { name: "Start your workspace" })).toHaveAttribute("href", "/signup")
    await expect(howItWorks.getByRole("link", { name: "Explore the Help Center" })).toHaveAttribute("href", "/faq")

    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/")
    await expect(page.getByRole("heading", { name: /Bring your worship team into harmony/i, level: 1 })).toBeVisible()
    await expect(page.getByRole("link", { name: "Create your workspace" })).toBeVisible()

    const dimensions = await page.evaluate(() => ({
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
    }))
    expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth)
  })

  test("landing FAQ is interactive and the full help center is public", async ({ page }) => {
    await page.goto("/")

    const landingFaq = page.locator("#landing-faq")
    await expect(
      landingFaq.getByRole("heading", {
        name: "Questions before you get started?",
        level: 2,
      })
    ).toBeVisible()
    await expect(landingFaq.locator("details")).toHaveCount(4)

    const firstQuestion = landingFaq.locator("details").first()
    await firstQuestion.locator("summary").click()
    await expect(
      firstQuestion.getByText(/Open My Schedule to review upcoming services/i)
    ).toBeVisible()

    const landingSchemas = await page
      .locator('script[type="application/ld+json"]')
      .evaluateAll((scripts) => scripts.map((script) => script.textContent ?? ""))
    expect(landingSchemas.some((schema) => schema.includes('"FAQPage"'))).toBe(true)

    await page.getByRole("link", { name: "Browse all help questions" }).click()
    await expect(page).toHaveURL(/faq$/)
    await expect(
      page.getByRole("heading", { name: "How can we help?", level: 1 })
    ).toBeVisible()
    const helpSchemas = await page
      .locator('script[type="application/ld+json"]')
      .evaluateAll((scripts) => scripts.map((script) => script.textContent ?? ""))
    expect(helpSchemas.some((schema) => schema.includes('"FAQPage"'))).toBe(true)
  })

  test("privacy and terms pages are public, linked, and responsive", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })

    const privacyResponse = await page.goto("/privacy")
    expect(privacyResponse?.status()).toBe(200)
    await expect(page).toHaveTitle(/Privacy Policy.*WorshipFlow/i)
    await expect(page.getByRole("heading", { name: "Privacy Policy", level: 1 })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Information you provide", level: 2 })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Browser storage and offline charts", level: 2 })).toBeVisible()
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/privacy$/)
    await expect(page.getByRole("navigation", { name: "Legal navigation" }).getByRole("link", { name: "Terms", exact: true })).toHaveAttribute("href", "/terms")

    const termsResponse = await page.goto("/terms")
    expect(termsResponse?.status()).toBe(200)
    await expect(page).toHaveTitle(/Terms of Service.*WorshipFlow/i)
    await expect(page.getByRole("heading", { name: "Terms of Service", level: 1 })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Your content and permissions", level: 2 })).toBeVisible()
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/terms$/)
    await expect(page.getByRole("navigation", { name: "Legal navigation" }).getByRole("link", { name: "Privacy", exact: true })).toHaveAttribute("href", "/privacy")

    await page.setViewportSize({ width: 390, height: 844 })
    for (const path of ["/privacy", "/terms"]) {
      const response = await page.goto(path)
      expect(response?.status()).toBe(200)
      const dimensions = await page.evaluate(() => ({
        viewportWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
      }))
      expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth)
    }
  })

  test("workspace routes redirect unauthenticated visitors to sign-in", async ({ page }) => {
    const protectedPaths = [
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
