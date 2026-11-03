import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8")
}

describe("form error summary accessibility", () => {
  it("moves focus to the alert summary when it appears", () => {
    const component = source("src/components/ui/form-error-summary.tsx")

    expect(component).toContain("useEffect(() => {")
    expect(component).toContain("summaryRef.current?.focus()")
    expect(component).toContain("tabIndex={-1}")
    expect(component).toContain("data-form-error-summary")
    expect(component).toContain('<Feedback tone="error" title={title}>')
    expect(component).toContain("focus-visible:ring-2")
  })

  it("is used by the authentication forms that return server errors", () => {
    for (const path of [
      "src/app/login/page.tsx",
      "src/app/signup/page.tsx",
      "src/app/forgot-password/page.tsx",
      "src/app/reset-password/page.tsx",
    ]) {
      expect(source(path), path).toContain("FormErrorSummary")
    }
  })
})
