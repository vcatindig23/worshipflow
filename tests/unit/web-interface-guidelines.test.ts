import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8")
}

describe("Vercel web interface guidelines baseline", () => {
  it("provides touch-safe controls, native select colors, and safe-area handling", () => {
    const globals = source("src/app/globals.css")
    const designSystem = source("src/app/design-system.css")
    const button = source("src/components/ui/button.tsx")

    expect(globals).toContain("touch-action: manipulation")
    expect(globals).toContain("@media (pointer: coarse)")
    expect(globals).toContain('[class~="h-10"]')
    expect(globals).toContain('[class~="size-10"]')
    expect(globals).toContain("env(safe-area-inset-bottom)")
    expect(designSystem).toContain("overscroll-behavior: contain")
    expect(designSystem).toContain("env(safe-area-inset-top)")
    expect(globals).toContain("background-color: var(--card)")
    expect(globals).toContain("color: var(--foreground)")
    expect(button).toContain('data-size={size ?? "default"}')
  })

  it("keeps the original submit label visible while exposing pending feedback", () => {
    const submit = source("src/components/ui/form-submit-button.tsx")
    expect(submit).toContain('pendingText = "Saving…"')
    expect(submit).toContain("aria-busy={pending}")
    expect(submit).toContain("aria-label={pending ? pendingText : undefined}")
    expect(submit).toContain("{children}")
    expect(submit).not.toContain("{pending ? pendingText : children}")
  })

  it("keeps authentication surfaces and browser chrome synchronized with the theme", () => {
    const auth = source("src/components/auth/auth-layout.tsx")
    const theme = source("src/components/site-preferences.tsx")
    const layout = source("src/app/layout.tsx")
    const dialog = source("src/components/ui/confirmation-dialog.tsx")
    const mfa = source("src/app/auth/mfa/page.tsx")

    expect(auth).toContain("wf-auth-wordmark")
    expect(theme).toContain('meta[name="theme-color"]')
    expect(theme).toContain('"#101713" : "#f5f7f5"')
    expect(theme).toContain('"worshipflow:theme-changed"')
    expect(layout).toContain('themeColor: "#f5f7f5"')
    expect(dialog).not.toContain("autoFocus")
    expect(mfa).not.toContain("autoFocus")
  })

  it("animates progress fills with transforms instead of layout width", () => {
    const progressFiles = [
      "src/app/services/page.tsx",
      "src/app/services/insights/page.tsx",
      "src/components/dashboard-view.tsx",
      "src/app/setlists/[id]/service-preparation-checklist.tsx",
    ]
    for (const path of progressFiles) {
      const content = source(path)
      expect(content, path).not.toContain("transition-all")
      expect(content, path).toContain("scaleX(")
      expect(content, path).toContain("transition-transform")
    }
    const checklist = source(progressFiles[3])
    expect(checklist).toContain('role="progressbar"')
    expect(checklist).toContain("aria-valuenow={completionPercent}")
  })

  it("keeps mobile workspace action targets at or above 44px", () => {
    const mobile = source("src/components/dashboard-mobile-navigation.tsx")
    const header = source("src/components/workspace-header-actions.tsx")
    expect(mobile).toContain("size-11 shrink-0 items-center")
    expect(header).toContain("inline-flex h-11 items-center")
    expect(header).toContain("flex size-11 items-center justify-center")
  })
})
