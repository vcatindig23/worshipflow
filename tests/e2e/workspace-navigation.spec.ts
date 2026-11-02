import { expect, test } from "@playwright/test"

test("mobile workspace navigation keeps primary, utility, and account destinations discoverable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/e2e/navigation")

  await expect(page.getByRole("heading", { name: "Navigation test workspace" })).toBeVisible()
  await page.getByRole("button", { name: "Open navigation" }).click()

  const drawer = page.getByRole("dialog", { name: "Workspace navigation" })
  await expect(drawer).toBeVisible()

  const workspace = drawer.getByRole("navigation", { name: "Workspace" })
  const tools = drawer.getByRole("navigation", { name: "Tools" })
  const account = drawer.getByRole("navigation", { name: "Account" })

  for (const label of ["Dashboard", "Songs", "Setlists", "Team", "Files", "Team chat", "Services", "My Schedule"]) {
    await expect(workspace.getByRole("link", { name: label })).toBeVisible()
  }
  for (const label of ["Search", "Notifications", "Activity"]) {
    await expect(tools.getByRole("link", { name: label })).toBeVisible()
  }
  for (const label of ["Profile", "Settings"]) {
    await expect(account.getByRole("link", { name: label })).toBeVisible()
  }

  await page.keyboard.press("Escape")
  await expect(drawer).toBeHidden()
})

test("desktop workspace shell exposes the same navigation groups", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto("/e2e/navigation")

  await expect(page.getByRole("heading", { name: "Navigation test workspace" })).toBeVisible()
  for (const label of ["Workspace", "Tools", "Account"]) {
    await expect(page.getByRole("navigation", { name: label })).toBeVisible()
  }
  await expect(page.getByRole("button", { name: "Open global search" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Team Chat" })).toBeVisible()
})
