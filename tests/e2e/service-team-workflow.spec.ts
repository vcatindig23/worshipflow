import { expect, test, type Page } from "@playwright/test"

const leaderEmail = process.env.E2E_LEADER_EMAIL ?? ""
const leaderPassword = process.env.E2E_LEADER_PASSWORD ?? ""
const requesterEmail = process.env.E2E_REQUESTER_EMAIL ?? ""
const requesterPassword = process.env.E2E_REQUESTER_PASSWORD ?? ""
const requesterName = process.env.E2E_REQUESTER_DISPLAY_NAME ?? ""
const substituteEmail = process.env.E2E_SUBSTITUTE_EMAIL ?? ""
const substitutePassword = process.env.E2E_SUBSTITUTE_PASSWORD ?? ""
const substituteName = process.env.E2E_SUBSTITUTE_DISPLAY_NAME ?? ""

const enabled =
  process.env.E2E_ENABLE_SERVICE_WORKFLOW === "true" &&
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
    leaderEmail &&
    leaderPassword &&
    requesterEmail &&
    requesterPassword &&
    requesterName &&
    substituteEmail &&
    substitutePassword &&
    substituteName
  )

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login")
  await page.getByLabel("Email address").fill(email)
  await page.locator("#password").fill(password)
  await page.getByRole("button", { name: "Sign in", exact: true }).click()
  await expect(page).not.toHaveURL(/\/login$/)
          ).not.toHaveURL(/\/login(?:\?|$)|\/onboarding(?:\?|$)/)
}

function futureServiceDate(daysAhead = 7) {
  const date = new Date()
  date.setDate(date.getDate() + daysAhead)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}


const responsiveViewports = [
  { name: "compact phone", width: 320, height: 740 },
  { name: "small phone", width: 360, height: 800 },
  { name: "standard phone", width: 390, height: 844 },
  { name: "tablet portrait", width: 768, height: 1024 },
  { name: "tablet landscape", width: 1024, height: 768 },
  { name: "standard laptop", width: 1366, height: 768 },
  { name: "wide projection", width: 1920, height: 1080 },
] as const

const authenticatedWorkspaceRoutes = [
  "/",
  "/songs",
  "/songs/new",
  "/chord-chart",
  "/setlists",
  "/setlists/new",
  "/services",
  "/services/history",
  "/services/insights",
  "/services/templates",
  "/my-schedule",
  "/settings/team",
  "/settings/team/audit",
  "/files",
  "/profile",
  "/settings",
  "/settings/church",
  "/settings/profile",
  "/settings/security",
  "/chat",
  "/activity",
  "/notifications",
  "/search",
] as const

async function expectResponsiveLayout(
  page: Page,
  context: string,
  phase: "top" | "bottom"
) {
  const diagnostics = await page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth
    const visible = (element: HTMLElement) => {
      const style = window.getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity || "1") > 0.01 &&
        rect.width > 0 &&
        rect.height > 0
      )
    }
    const insideHorizontalScroller = (element: HTMLElement) => {
      let parent = element.parentElement
      while (parent && parent !== document.body) {
        const style = window.getComputedStyle(parent)
        if (
          (style.overflowX === "auto" || style.overflowX === "scroll") &&
          parent.scrollWidth > parent.clientWidth + 1
        ) {
          return true
        }
        parent = parent.parentElement
      }
      return false
    }
    const interactive = Array.from(
      document.querySelectorAll<HTMLElement>(
        "main a[href], main button, main input:not([type='hidden']), main select, main textarea, .app-header a[href], .app-header button"
      )
    ).filter(visible)
    const outOfViewportControls = interactive
      .filter((element) => !insideHorizontalScroller(element))
      .flatMap((element) => {
        const rect = element.getBoundingClientRect()
        if (rect.left >= -1 && rect.right <= viewportWidth + 1) return []
        const label =
          element.getAttribute("aria-label") ||
          element.textContent?.trim().slice(0, 70) ||
          element.tagName.toLowerCase()
        return [
          {
            label,
            left: Math.round(rect.left),
            right: Math.round(rect.right),
          },
        ]
      })

    const fixedControls = Array.from(
      document.querySelectorAll<HTMLElement>(
        "body button, body a[href], body [role='button']"
      )
    ).filter((element) => {
      if (element.matches(".wf-skip-link") && !element.matches(":focus")) {
        return false
      }
      return visible(element) && window.getComputedStyle(element).position === "fixed"
    })
    const mainControls = Array.from(
      document.querySelectorAll<HTMLElement>(
        "main a[href], main button, main input:not([type='hidden']), main select, main textarea"
      )
    ).filter(visible)
    const fixedBounds = fixedControls.flatMap((element) => {
      const rect = element.getBoundingClientRect()
      if (
        rect.left >= -1 &&
        rect.top >= -1 &&
        rect.right <= viewportWidth + 1 &&
        rect.bottom <= window.innerHeight + 1
      ) {
        return []
      }
      return [
        element.getAttribute("aria-label") ||
          element.textContent?.trim().slice(0, 50) ||
          element.tagName.toLowerCase(),
      ]
    })
    const fixedOverlaps = fixedControls.flatMap((fixed) => {
      const fixedRect = fixed.getBoundingClientRect()
      return mainControls.flatMap((control) => {
        if (fixed === control || fixed.contains(control)) return []
        if (insideHorizontalScroller(control)) return []
        const controlRect = control.getBoundingClientRect()
        const overlaps =
          fixedRect.left < controlRect.right &&
          fixedRect.right > controlRect.left &&
          fixedRect.top < controlRect.bottom &&
          fixedRect.bottom > controlRect.top
        if (!overlaps) return []
        const label =
          fixed.getAttribute("aria-label") ||
          fixed.textContent?.trim().slice(0, 45) ||
          fixed.tagName.toLowerCase()
        const controlLabel =
          control.getAttribute("aria-label") ||
          control.textContent?.trim().slice(0, 45) ||
          control.tagName.toLowerCase()
        return [`${label} overlaps ${controlLabel}`]
      })
    })

    return {
      viewportWidth,
      documentWidth: Math.max(
        document.documentElement.scrollWidth,
        document.body.scrollWidth
      ),
      outOfViewportControls,
      fixedBounds,
      fixedOverlaps,
    }
  })

  expect(
    diagnostics.documentWidth,
    `${context} (${phase}): document must not scroll horizontally`
  ).toBeLessThanOrEqual(diagnostics.viewportWidth + 1)
  expect(
    diagnostics.outOfViewportControls,
    `${context} (${phase}): visible controls must fit the viewport`
  ).toEqual([])
  expect(
    diagnostics.fixedBounds,
    `${context} (${phase}): fixed controls must remain inside the viewport`
  ).toEqual([])
  if (phase === "bottom") {
    expect(
      diagnostics.fixedOverlaps,
      `${context}: fixed controls must not cover page actions or form controls`
    ).toEqual([])
  }
}

async function expectPanelInsideViewport(
  page: Page,
  selector: string,
  context: string
) {
  const bounds = await page.locator(selector).boundingBox()
  expect(bounds, `${context}: panel should have a measurable box`).not.toBeNull()
  if (!bounds) return

  const viewport = page.viewportSize()
  expect(bounds.x, `${context}: panel must not be clipped on the left`).toBeGreaterThanOrEqual(-1)
  expect(
    bounds.x + bounds.width,
    `${context}: panel must not be clipped on the right`
  ).toBeLessThanOrEqual((viewport?.width ?? 0) + 1)
  expect(bounds.y, `${context}: panel must not be clipped at the top`).toBeGreaterThanOrEqual(-1)
  expect(
    bounds.y + bounds.height,
    `${context}: panel must not be clipped at the bottom`
  ).toBeLessThanOrEqual((viewport?.height ?? 0) + 1)
}

test.describe("isolated multi-member service workflow", () => {
  test("leader creates a service, a member confirms and requests a swap, substitute accepts, and leader approves", async ({
    browser,
  }) => {
    test.setTimeout(20 * 60 * 1000)
    test.skip(
      !enabled,
      "Configure the opt-in E2E Supabase project and three dedicated test accounts to run the authenticated service workflow."
    )

    const leader = await browser.newPage()
    const requester = await browser.newPage()
    const substitute = await browser.newPage()
    let createdSetlistId = ""

    try {
      await signIn(leader, leaderEmail, leaderPassword)

      // Verify mobile navigation contains keyboard focus and restores it when closed.
      await leader.setViewportSize({ width: 390, height: 844 })
      await leader.goto("/")
      const mobileNavTrigger = leader.locator('button[aria-controls="mobile-workspace-navigation"]')
      await expect(mobileNavTrigger).toBeVisible()
      await mobileNavTrigger.click()

      const mobileNav = leader.getByRole("dialog", { name: "Workspace navigation" })
      const closeNavButton = mobileNav.getByRole("button", { name: "Close navigation", exact: true })
      const signOutButton = mobileNav.getByRole("button", { name: "Sign out", exact: true })
      await expect(closeNavButton).toBeFocused()
      await leader.keyboard.press("Shift+Tab")
      await expect(signOutButton).toBeFocused()
      await leader.keyboard.press("Tab")
      await expect(closeNavButton).toBeFocused()

      // Even if focus moves outside programmatically, Tab must not escape the drawer.
      await leader.evaluate(() => {
        document.querySelector<HTMLButtonElement>(
          'button[aria-controls="mobile-workspace-navigation"]'
        )?.focus()
      })
      await leader.keyboard.press("Tab")
      await expect(closeNavButton).toBeFocused()

      await leader.keyboard.press("Escape")
      await expect(mobileNav).toBeHidden()
      await expect(mobileNavTrigger).toHaveAttribute("aria-expanded", "false")
      await expect(mobileNavTrigger).toBeFocused()
      await leader.setViewportSize({ width: 1280, height: 900 })

      // Desktop navigation must announce the active section, including nested routes.
      await leader.goto("/songs/new")
      const desktopWorkspaceNav = leader.getByRole("navigation", {
        name: "Workspace navigation",
      })
      await expect(
        desktopWorkspaceNav.getByRole("link", { name: "Songs" })
      ).toHaveAttribute("aria-current", "location")
      await expect(
        desktopWorkspaceNav.getByRole("link", { name: "Dashboard" })
      ).not.toHaveAttribute("aria-current", "page")

      await leader.goto("/settings/church")
      const desktopManagementNav = leader.getByRole("navigation", {
        name: "Workspace management",
      })
      await expect(
        desktopManagementNav.getByRole("link", { name: "Settings" })
      ).toHaveAttribute("aria-current", "location")
      await expect(
        desktopWorkspaceNav.getByRole("link", { name: "Team" })
      ).not.toHaveAttribute("aria-current", "page")
      await leader.goto("/")

      // Verify that the global-search modal keeps keyboard focus contained and
      // returns focus to its trigger when dismissed.
      const searchTrigger = leader.locator('button[aria-controls="workspace-global-search"]')
      await searchTrigger.click()
      const searchDialog = leader.getByRole("dialog", { name: "Global search" })
      const searchInput = searchDialog.getByRole("searchbox", {
        name: /Search songs, artists, albums, setlists, and services/,
      })
      await expect(searchInput).toBeFocused()
      await leader.keyboard.press("Shift+Tab")
      await expect(searchDialog.getByRole("button", { name: "Close search", exact: true })).toBeFocused()
      await leader.keyboard.press("Tab")
      await expect(searchInput).toBeFocused()
      await leader.keyboard.press("Escape")
      await expect(searchDialog).toBeHidden()
      await expect(searchTrigger).toHaveAttribute("aria-expanded", "false")
      await expect(searchTrigger).toBeFocused()

      // The notifications control should expose its dialog and restore focus on Escape.
      const notificationTrigger = leader.locator('button[aria-controls="workspace-notifications-panel"]')
      await expect(notificationTrigger).toBeVisible()
      await notificationTrigger.click()
      const notificationsDialog = leader.locator("#workspace-notifications-panel")
      await expect(notificationsDialog).toHaveAttribute("role", "dialog")
      await expect(notificationsDialog).toBeVisible()
      await expect(notificationTrigger).toHaveAttribute("aria-expanded", "true")
      await leader.keyboard.press("Escape")
      await expect(notificationsDialog).toBeHidden()
      await expect(notificationTrigger).toHaveAttribute("aria-expanded", "false")
      await expect(notificationTrigger).toBeFocused()

      const serviceName = `E2E QA Service ${new Date().toISOString().replace(/[:.]/g, "-")}`
      await leader.goto("/setlists/new")
      await leader.getByLabel("Setlist name").fill(serviceName)
      await leader.getByLabel("Service date").fill(futureServiceDate())
      await leader.getByRole("button", { name: "Create Setlist", exact: true }).click()
      await expect(leader).toHaveURL(/\/setlists\/[0-9a-f-]+$/)

      createdSetlistId = new URL(leader.url()).pathname.split("/").pop() ?? ""
      expect(createdSetlistId).toMatch(/^[0-9a-f-]{36}$/i)
      await expect(leader.getByRole("heading", { name: serviceName })).toBeVisible()

      const assignmentSelect = leader.locator("#assignmentKey")
      await expect(assignmentSelect).toBeVisible()
      await assignmentSelect.selectOption({
        label: `${requesterName} — Drummer`,
      })
      await leader.getByRole("button", { name: "Assign to Service", exact: true }).click()
      await expect(leader.getByText(requesterName, { exact: true })).toBeVisible()

      await signIn(requester, requesterEmail, requesterPassword)
      await requester.goto("/my-schedule")
      await expect(requester.getByText(serviceName, { exact: true })).toBeVisible()

      await requester.getByRole("button", { name: "Confirm", exact: true }).click()
      await expect(requester.getByText("Confirmed", { exact: true })).toBeVisible()

      await requester.getByText("Request a swap", { exact: true }).click()
      const substituteSelect = requester.locator('select[name="substituteUserId"]')
      await expect(substituteSelect).toBeVisible()
      await substituteSelect.selectOption({ label: substituteName })
      await requester.locator('textarea[name="reason"]').fill("Automated E2E coverage change")
      await requester.getByRole("button", { name: "Send swap request", exact: true }).click()
      await expect(requester).toHaveURL(/\/my-schedule\?swapRequested=1$/)
      await expect(
        requester.getByText(
          `Swap request sent to ${substituteName}; waiting for their response.`,
          { exact: true }
        )
      ).toBeVisible()

      await signIn(substitute, substituteEmail, substitutePassword)
      await substitute.goto("/notifications")
      await expect(
        substitute.getByRole("heading", { name: "Swap request for your review" })
      ).toBeVisible()

      await substitute.goto(`/setlists/${createdSetlistId}`)
      await expect(substitute.getByText("Waiting for substitute", { exact: true })).toBeVisible()
      await substitute.getByRole("button", { name: "Accept", exact: true }).click()
      await expect(
        substitute.getByText("Waiting for leader approval", { exact: true })
      ).toBeVisible()

      await requester.goto("/notifications")
      await expect(
        requester.getByRole("heading", { name: "Swap request accepted" })
      ).toBeVisible()

      await leader.goto(`/setlists/${createdSetlistId}`)
      await expect(leader.getByText("Waiting for leader approval", { exact: true })).toBeVisible()
      await leader.getByRole("button", { name: "Approve swap", exact: true }).click()
      await expect(leader.getByText("Approved", { exact: true })).toBeVisible()
      await expect(leader.getByText(substituteName, { exact: true })).toBeVisible()

      await leader.goto("/notifications")
      await expect(
        leader.getByRole("heading", { name: "Assignment swap requested" })
      ).toBeVisible()

      // The service was created without songs, so this also verifies the live
      // stage's intentional empty state rather than a blank or broken screen.
      await leader.goto(`/setlists/${createdSetlistId}/live`)
      await expect(leader.getByRole("heading", { name: "Live stage", exact: true })).toBeVisible()
      await expect(leader.getByRole("heading", { name: "No songs in this service" })).toBeVisible()
      await expect(leader.getByRole("link", { name: "Go to home dashboard" })).toBeVisible()


      // Exercise every authenticated workspace destination at real device widths.
      // The temporary service created above supplies stable data for all service-detail views.
      const responsiveRoutes = [
        ...authenticatedWorkspaceRoutes,
        `/setlists/${createdSetlistId}`,
        `/setlists/${createdSetlistId}/edit`,
        `/setlists/${createdSetlistId}/preparation`,
        `/setlists/${createdSetlistId}/complete`,
        `/setlists/${createdSetlistId}/live`,
        `/setlists/${createdSetlistId}/print`,
      ]

      // Include a real song-detail page when the isolated QA workspace has a song fixture.
      await leader.goto("/songs")
      const existingSongHref = await leader.locator('a[href^="/songs/"]').evaluateAll((links) =>
        links
          .map((link) => link.getAttribute("href"))
          .find((href) => Boolean(href && href.startsWith("/songs/") && href !== "/songs/new" && href.split("/").length === 3))
      )
      if (existingSongHref) responsiveRoutes.push(existingSongHref)

      // Include a team-member profile detail when another member is present in the workspace.
      await leader.goto("/settings/team")
      const memberProfileHref = await leader.locator('a[href^="/profile/"]').evaluateAll((links) =>
        links
          .map((link) => link.getAttribute("href"))
          .find((href) => Boolean(href && href.startsWith("/profile/") && href.split("/").length === 3))
      )
      if (memberProfileHref) responsiveRoutes.push(memberProfileHref)

      for (const viewport of responsiveViewports) {
        await leader.setViewportSize({
          width: viewport.width,
          height: viewport.height,
        })

        for (const route of responsiveRoutes) {
          const response = await leader.goto(route, { waitUntil: "domcontentloaded" })
          expect(
            response?.status(),
            `${viewport.name} (${viewport.width}px): ${route} should load successfully`
          ).toBe(200)
          await expect(
            leader,
            `${viewport.name} (${viewport.width}px): ${route} must remain authenticated`
          ).not.toHaveURL(/\/login(?:\?|$)|\/onboarding(?:\?|$)/)
          await expect(leader.locator("body")).toBeVisible()

          const routeContext = `${viewport.name} ${viewport.width}x${viewport.height} ${route}`
          await expectResponsiveLayout(leader, routeContext, "top")

          await leader.evaluate(() => {
            window.scrollTo(0, document.documentElement.scrollHeight)
          })
          await leader.evaluate(
            () => new Promise<void>((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
            )
          )
          await expectResponsiveLayout(leader, routeContext, "bottom")
        }

        // Check mobile/tablet navigation and the two header popovers at each breakpoint.
        await leader.goto("/")
        const context = `${viewport.name} ${viewport.width}x${viewport.height}`

        if (viewport.width < 1024) {
          const mobileNavTrigger = leader.locator(
            'button[aria-controls="mobile-workspace-navigation"]'
          )
          await expect(mobileNavTrigger, `${context}: mobile navigation trigger`).toBeVisible()
          await mobileNavTrigger.click()
          const mobileDrawer = leader.locator("#mobile-workspace-navigation")
          await expect(mobileDrawer).toBeVisible()
          await expectPanelInsideViewport(
            leader,
            "#mobile-workspace-navigation",
            `${context} mobile navigation drawer`
          )
          await leader.keyboard.press("Escape")
          await expect(mobileDrawer).toBeHidden()
        } else {
          await expect(leader.locator(".app-sidebar")).toBeVisible()
        }

        const searchTrigger = leader.locator(
          'button[aria-controls="workspace-global-search"]'
        )
        await expect(searchTrigger, `${context}: global search trigger`).toBeVisible()
        await searchTrigger.click()
        const searchDialog = leader.locator("#workspace-global-search")
        await expect(searchDialog).toBeVisible()
        await expectPanelInsideViewport(
          leader,
          "#workspace-global-search",
          `${context} global search dialog`
        )
        await leader.keyboard.press("Escape")
        await expect(searchDialog).toBeHidden()

        const notificationTrigger = leader.locator(
          'button[aria-controls="workspace-notifications-panel"]'
        )
        await expect(notificationTrigger, `${context}: notifications trigger`).toBeVisible()
        await notificationTrigger.click()
        const notificationPanel = leader.locator("#workspace-notifications-panel")
        await expect(notificationPanel).toBeVisible()
        await expectPanelInsideViewport(
          leader,
          "#workspace-notifications-panel",
          `${context} notifications panel`
        )
        await leader.keyboard.press("Escape")
        await expect(notificationPanel).toBeHidden()
      }
    } finally {
      if (createdSetlistId) {
        try {
          await leader.goto(`/setlists/${createdSetlistId}`)
          const deleteButton = leader.getByRole("button", { name: "Delete", exact: true })
          if (await deleteButton.isVisible()) {
            await deleteButton.click()
            await expect(leader).toHaveURL(/\/setlists$/)
          }
        } catch {
          // A cleanup problem should be visible in the isolated QA workspace,
          // but must not mask the original workflow failure.
          console.warn("Could not automatically delete the E2E service plan.")
        }
      }

      await Promise.all([leader.close(), requester.close(), substitute.close()])
    }
  })
})
