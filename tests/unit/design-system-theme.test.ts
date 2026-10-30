import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const designSystem = readFileSync(
  join(process.cwd(), "src/app/design-system.css"),
  "utf8"
)
const globals = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8")
const buttonSource = readFileSync(
  join(process.cwd(), "src/components/ui/button.tsx"),
  "utf8"
)
const activityPage = readFileSync(
  join(process.cwd(), "src/app/activity/page.tsx"),
  "utf8"
)
const notificationsPage = readFileSync(
  join(process.cwd(), "src/app/notifications/page.tsx"),
  "utf8"
)
const searchPage = readFileSync(
  join(process.cwd(), "src/app/search/page.tsx"),
  "utf8"
)
const serviceHistoryPage = readFileSync(
  join(process.cwd(), "src/app/services/history/page.tsx"),
  "utf8"
)
const servicesPage = readFileSync(
  join(process.cwd(), "src/app/services/page.tsx"),
  "utf8"
)
const setlistsPage = readFileSync(
  join(process.cwd(), "src/app/setlists/page.tsx"),
  "utf8"
)
const songsPage = readFileSync(
  join(process.cwd(), "src/app/songs/page.tsx"),
  "utf8"
)
const dashboardView = readFileSync(
  join(process.cwd(), "src/components/dashboard-view.tsx"),
  "utf8"
)

describe("semantic theme foundations", () => {
  it("keeps light and dark theme tokens in the design system", () => {
    expect(designSystem).toMatch(/--background:\s*#f5f7f5/)
    expect(designSystem).toMatch(/--surface:\s*#f0f4f0/)
    expect(designSystem).toMatch(/--card:\s*#ffffff/)
    expect(designSystem).toMatch(/:root\[data-theme="dark"\]/)
    expect(designSystem).toMatch(/--background:\s*#101713/)
    expect(designSystem).toMatch(/--focus-ring:\s*#a5d6b3/)
  })

  it("keeps global styles free of broad dark-mode utility overrides", () => {
    expect(globals).not.toMatch(/:root\[data-theme="dark"\]\s+\.(?:bg-|text-|border-)/)
    expect(globals).toMatch(/outline:\s*2px solid var\(--focus-ring\)/)
    expect(globals).toMatch(/:root\[data-theme="dark"\] \.wf-aurora-layer/)
  })

  it("maps legacy neutral utilities to semantic surface and text roles", () => {
    expect(designSystem).toMatch(/\[class~="bg-white"\][\s\S]*?background-color:\s*var\(--card\)/)
    expect(designSystem).toMatch(/\[class~="bg-slate-50"\][\s\S]*?background-color:\s*var\(--surface\)/)
    expect(designSystem).toMatch(/\[class~="text-slate-900"\][\s\S]*?color:\s*var\(--foreground\)/)
    expect(designSystem).toMatch(/\[class~="text-slate-600"\][\s\S]*?color:\s*var\(--muted\)/)
    expect(designSystem).toMatch(/\[class~="border-slate-200"\][\s\S]*?border-color:\s*var\(--border\)/)
  })

  it("uses separate focus and destructive-action tokens in shared buttons", () => {
    expect(buttonSource).toMatch(/focus-visible:ring-\[var\(--focus-ring\)\]/)
    expect(buttonSource).toMatch(/bg-\[var\(--danger-action\)\]/)
    expect(buttonSource).toMatch(/hover:bg-\[var\(--danger-action-hover\)\]/)
  })
  it("provides theme-aware semantic warning and status styles", () => {
    expect(designSystem).toMatch(/--warning:\s*#8a5200/)
    expect(designSystem).toMatch(/--warning:\s*#f0c477/)
    expect(designSystem).toMatch(/\.wf-status-warning[\s\S]*?background:\s*var\(--warning-soft\)/)
    expect(designSystem).toMatch(/\.wf-status-success[\s\S]*?color:\s*var\(--success\)/)
  })

  it("uses shared page, card, form, and status foundations on workspace screens", () => {
    expect(activityPage).toMatch(/<PageContainer/)
    expect(activityPage).toMatch(/wf-card/)
    expect(activityPage).not.toMatch(/bg-white/)

    expect(notificationsPage).toMatch(/<PageContainer/)
    expect(notificationsPage).toMatch(/buttonVariants/)
    expect(notificationsPage).toMatch(/wf-card/)
    expect(notificationsPage).not.toMatch(/bg-white/)

    expect(searchPage).toMatch(/<Input/)
    expect(searchPage).toMatch(/buttonVariants/)
    expect(searchPage).toMatch(/wf-card/)
    expect(searchPage).toMatch(/wf-status-warning/)
    expect(searchPage).not.toMatch(/bg-white/)

    expect(serviceHistoryPage).toMatch(/<Input/)
    expect(serviceHistoryPage).toMatch(/<Select/)
    expect(serviceHistoryPage).toMatch(/wf-card/)
    expect(serviceHistoryPage).toMatch(/wf-status-success/)
    expect(serviceHistoryPage).not.toMatch(/bg-white/)
  })

  it("provides shared readiness panels and icon tile variants", () => {
    expect(designSystem).toMatch(/\.wf-readiness-panel\[data-state="ready"\]/)
    expect(designSystem).toMatch(/\.wf-readiness-panel\[data-state="attention"\]/)
    expect(designSystem).toMatch(/\.wf-readiness-panel\[data-state="incomplete"\]/)
    expect(designSystem).toMatch(/\.wf-icon-tile-info/)
    expect(designSystem).toMatch(/\.wf-icon-tile-warning/)
    expect(designSystem).toMatch(/\.wf-feedback-warning/)
    expect(designSystem).toMatch(/\.wf-status-neutral/)
    expect(designSystem).toMatch(/\.wf-readiness-supporting[\s\S]*?color:\s*var\(--success\)/)
  })

  it("uses semantic cards and status colors in the main workspace views", () => {
    expect(servicesPage).toMatch(/wf-readiness-panel/)
    expect(servicesPage).toMatch(/data-state={readiness.status}/)
    expect(servicesPage).toMatch(/wf-status-success/)
    expect(servicesPage).toMatch(/wf-status-warning/)
    expect(servicesPage).toMatch(/wf-card-interactive/)
    expect(servicesPage).not.toMatch(/getReadinessClasses|readinessClasses/)
    expect(servicesPage).not.toMatch(/bg-emerald-100|bg-amber-100|bg-rose-50|text-rose-700/)

    expect(setlistsPage).toMatch(/wf-card-interactive/)
    expect(setlistsPage).toMatch(/wf-status-success/)
    expect(setlistsPage).toMatch(/wf-status-warning/)
    expect(setlistsPage).toMatch(/wf-status-neutral/)

    expect(songsPage).toMatch(/wf-card wf-card-interactive/)
    expect(songsPage).toMatch(/wf-status-warning/)
    expect(songsPage).toMatch(/var\(--warning-soft\)/)

    expect(dashboardView).toMatch(/wf-card wf-card-interactive/)
    expect(dashboardView).toMatch(/wf-feedback-warning/)
    expect(dashboardView).toMatch(/wf-icon-tile-info/)
    expect(dashboardView).toMatch(/wf-status-success/)
    expect(dashboardView).toMatch(/wf-status-warning/)
    expect(dashboardView).not.toMatch(/bg-emerald-50|bg-amber-50|bg-rose-50|text-emerald-800|text-amber-800|text-rose-800/)
  })

})
