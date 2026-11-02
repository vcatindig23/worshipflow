import { expect, test } from "@playwright/test"

const primaryDestinations = [
  ["Dashboard", "/"],
  ["Songs", "/songs"],
  ["Chord Chart", "/chord-chart"],
  ["Setlists", "/setlists"],
  ["Services", "/services"],
  ["My Schedule", "/my-schedule"],
  ["Team Chat", "/chat"],
  ["Files", "/files"],
] as const

test("desktop navigation separates workspace work from management", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto("/e2e/workspace-navigation")

  const workspaceNav = page.getByRole("navigation", { name: "Workspace navigation" })
  const managementNav = page.getByRole("navigation", { name: "Workspace management" })

  await expect(workspaceNav).toBeVisible()
  await expect(managementNav).toBeVisible()

  for (const [label, href] of primaryDestinations) {
    await expect(workspaceNav.getByRole("link", { name: label })).toHaveAttribute("href", href)
  }

  await expect(managementNav.getByRole("link", { name: "Team" })).toHaveAttribute("href", "/settings/team")
  await expect(managementNav.getByRole("link", { name: "Settings" })).toHaveAttribute("href", "/settings")
})

test("mobile navigation exposes the same destinations and account access", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/e2e/workspace-navigation")

  await page.getByRole("button", { name: "Open navigation" }).click()
  const drawer = page.getByRole("dialog", { name: "Workspace navigation" })
  await expect(drawer).toBeVisible()

  const workspaceNav = drawer.getByRole("navigation", { name: "Workspace" })
  for (const [label, href] of primaryDestinations) {
    await expect(workspaceNav.getByRole("link", { name: label })).toHaveAttribute("href", href)
  }

  const managementNav = drawer.getByRole("navigation", { name: "Workspace management" })
  await expect(managementNav.getByRole("link", { name: "Team", exact: true })).toHaveAttribute("href", "/settings/team")
  await expect(managementNav.getByRole("link", { name: "Settings", exact: true })).toHaveAttribute("href", "/settings")
  await expect(drawer.getByRole("link", { name: "View profile for Worship Leader" })).toHaveAttribute("href", "/profile")
})
