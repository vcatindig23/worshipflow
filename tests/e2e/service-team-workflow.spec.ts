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
  await expect(page).not.toHaveURL(/\/onboarding$/)
}

function futureServiceDate(daysAhead = 7) {
  const date = new Date()
  date.setDate(date.getDate() + daysAhead)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

test.describe("isolated multi-member service workflow", () => {
  test("leader creates a service, a member confirms and requests a swap, substitute accepts, and leader approves", async ({
    browser,
  }) => {
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
