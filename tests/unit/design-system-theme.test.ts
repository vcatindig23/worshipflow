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
const feedbackSource = readFileSync(
  join(process.cwd(), "src/components/ui/feedback.tsx"),
  "utf8"
)
const teamInvitation = readFileSync(
  join(process.cwd(), "src/components/ui/team-invitation.tsx"),
  "utf8"
)
const profilePage = readFileSync(
  join(process.cwd(), "src/app/profile/page.tsx"),
  "utf8"
)
const settingsPage = readFileSync(
  join(process.cwd(), "src/app/settings/page.tsx"),
  "utf8"
)
const teamPage = readFileSync(
  join(process.cwd(), "src/app/settings/team/page.tsx"),
  "utf8"
)
const profileSettingsPage = readFileSync(
  join(process.cwd(), "src/app/settings/profile/page.tsx"),
  "utf8"
)
const churchSettingsPage = readFileSync(
  join(process.cwd(), "src/app/settings/church/page.tsx"),
  "utf8"
)
const filesPage = readFileSync(
  join(process.cwd(), "src/app/files/page.tsx"),
  "utf8"
)
const uploadFileForm = readFileSync(
  join(process.cwd(), "src/app/files/upload-file-form.tsx"),
  "utf8"
)
const serviceTemplatesPage = readFileSync(
  join(process.cwd(), "src/app/services/templates/page.tsx"),
  "utf8"
)
const serviceInsightsPage = readFileSync(
  join(process.cwd(), "src/app/services/insights/page.tsx"),
  "utf8"
)
const mySchedulePage = readFileSync(
  join(process.cwd(), "src/app/my-schedule/page.tsx"),
  "utf8"
)
const assignmentConfirmation = readFileSync(
  join(process.cwd(), "src/app/my-schedule/assignment-confirmation.tsx"),
  "utf8"
)
const scheduleViewToggle = readFileSync(
  join(process.cwd(), "src/app/my-schedule/schedule-view-toggle.tsx"),
  "utf8"
)
const chatPage = readFileSync(
  join(process.cwd(), "src/app/chat/page.tsx"),
  "utf8"
)
const teamChatClient = readFileSync(
  join(process.cwd(), "src/app/chat/team-chat-client.tsx"),
  "utf8"
)
const setlistDetailPage = readFileSync(
  join(process.cwd(), "src/app/setlists/[id]/page.tsx"),
  "utf8"
)
const setlistEditPage = readFileSync(
  join(process.cwd(), "src/app/setlists/[id]/edit/page.tsx"),
  "utf8"
)
const setlistCompletePage = readFileSync(
  join(process.cwd(), "src/app/setlists/[id]/complete/page.tsx"),
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
    expect(designSystem).toMatch(/\.wf-icon-tile-success/)
    expect(designSystem).toMatch(/\.wf-icon-tile-danger/)
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
    expect(servicesPage).not.toMatch(/bg-white/)
    expect(servicesPage).not.toMatch(/bg-emerald-100|bg-amber-100|bg-rose-50|text-rose-700/)

    expect(setlistsPage).toMatch(/wf-card-interactive/)
    expect(setlistsPage).toMatch(/wf-status-success/)
    expect(setlistsPage).toMatch(/wf-status-warning/)
    expect(setlistsPage).toMatch(/wf-status-neutral/)
    expect(setlistsPage).not.toMatch(/bg-white|bg-emerald-100|bg-amber-100/)

    expect(songsPage).toMatch(/wf-card wf-card-interactive/)
    expect(songsPage).toMatch(/wf-status-warning/)
    expect(songsPage).toMatch(/var\(--warning-soft\)/)
    expect(songsPage).not.toMatch(/bg-white|bg-amber-100|text-amber-800/)

    expect(dashboardView).toMatch(/wf-card wf-card-interactive/)
    expect(dashboardView).toMatch(/wf-feedback-warning/)
    expect(dashboardView).toMatch(/wf-icon-tile-info/)
    expect(dashboardView).toMatch(/wf-status-success/)
    expect(dashboardView).toMatch(/wf-status-warning/)
    expect(dashboardView).not.toMatch(/bg-emerald-50|bg-amber-50|bg-rose-50|text-emerald-800|text-amber-800|text-rose-800/)
    expect(dashboardView).not.toMatch(/bg-white/)
  })

  it("supports semantic warning feedback and neutral invitation status", () => {
    expect(feedbackSource).toContain('tone?: "success" | "error" | "info" | "warning"')
    expect(feedbackSource).toContain('className={`wf-feedback wf-feedback-${tone}`}')
    expect(teamInvitation).toMatch(/wf-status wf-status-neutral/)
  })

  it("uses shared semantic styling across profile and settings views", () => {
    expect(profilePage).toMatch(/wf-page max-w-6xl/)
    expect(profilePage).toMatch(/wf-card p-5 sm:p-6/)
    expect(profilePage).toMatch(/buttonVariants/)
    expect(profilePage).not.toContain('bg-white"')
    expect(profilePage).not.toContain("bg-white ")

    expect(settingsPage).toMatch(/wf-feedback wf-feedback-warning/)
    expect(settingsPage).toMatch(/wf-card/)
    expect(settingsPage).not.toMatch(/bg-amber-50|text-amber-950|text-amber-800/)

    expect(teamPage).toMatch(/<Feedback tone="error"/)
    expect(teamPage).toMatch(/<Feedback tone="warning"/)
    expect(teamPage).toMatch(/wf-card/)
    expect(teamPage).toMatch(/buttonVariants/)
    expect(teamPage).not.toMatch(/bg-white|bg-red-50|bg-amber-50|text-red-700|text-amber-800/)

    expect(profileSettingsPage).toMatch(/wf-card/)
    expect(profileSettingsPage).toMatch(/wf-status-success/)
    expect(profileSettingsPage).toMatch(/wf-status-warning/)
    expect(profileSettingsPage).toMatch(/<Feedback tone="warning"/)
    expect(profileSettingsPage).not.toMatch(/bg-white|bg-amber-50|text-emerald-700|text-amber-700/)

    expect(churchSettingsPage).toMatch(/<PageContainer className="max-w-4xl">/)
    expect(churchSettingsPage).toMatch(/<Feedback tone="warning"/)
    expect(churchSettingsPage).toMatch(/wf-card p-5 sm:p-7/)
    expect(churchSettingsPage).not.toMatch(/bg-white|bg-amber-50|text-amber-800/)
  })

  it("uses semantic cards and feedback in Files and service reporting", () => {
    expect(filesPage).toMatch(/<Feedback tone="warning"/)
    expect(filesPage).toMatch(/<Feedback tone="info"/)
    expect(filesPage).toMatch(/wf-card mb-4/)
    expect(filesPage).toMatch(/wf-card overflow-hidden/)
    expect(filesPage).not.toMatch(/bg-white|bg-amber-50|text-amber-800/)

    expect(uploadFileForm).toMatch(/wf-card overflow-hidden/)
    expect(uploadFileForm).toMatch(/wf-icon-tile-success/)
    expect(uploadFileForm).toMatch(/wf-icon-tile-danger/)
    expect(uploadFileForm).toMatch(/var\(--success\)/)
    expect(uploadFileForm).toMatch(/var\(--danger\)/)
    expect(uploadFileForm).toMatch(/wf-status wf-status-success/)
    expect(uploadFileForm).not.toMatch(/bg-emerald-50|bg-red-50|text-red-700|text-emerald-700/)

    expect(serviceTemplatesPage).toMatch(/<Feedback tone="success"/)
    expect(serviceTemplatesPage).toMatch(/params.error === "migration_missing" \? "warning" : "error"/)
    expect(serviceTemplatesPage).toMatch(/wf-card wf-card-interactive/)
    expect(serviceTemplatesPage).not.toMatch(/bg-white|bg-amber-50|bg-emerald-50|text-amber-800/)

    expect(serviceInsightsPage).toMatch(/wf-card/)
    expect(serviceInsightsPage).toMatch(/<Feedback tone="success"/)
    expect(serviceInsightsPage).not.toMatch(/bg-white|bg-emerald-50|text-emerald-800/)
  })

  it("uses semantic availability and assignment states in My Schedule", () => {
    expect(mySchedulePage).toMatch(/<Feedback tone="success"/)
    expect(mySchedulePage).toMatch(/<Feedback tone="error"/)
    expect(mySchedulePage).toMatch(/<Feedback tone="warning"/)
    expect(mySchedulePage).toMatch(/<Input/)
    expect(mySchedulePage).toMatch(/<Textarea/)
    expect(mySchedulePage).toMatch(/wf-card/)
    expect(mySchedulePage).toMatch(/wf-status/)
    expect(mySchedulePage).not.toMatch(/bg-white|bg-emerald-50|bg-rose-50|bg-amber-50|text-rose-700/)

    expect(assignmentConfirmation).toMatch(/wf-feedback-success/)
    expect(assignmentConfirmation).toMatch(/wf-feedback-error/)
    expect(assignmentConfirmation).toMatch(/wf-feedback-warning/)
    expect(assignmentConfirmation).toMatch(/var\(--danger-action\)/)
    expect(assignmentConfirmation).not.toMatch(/bg-emerald-50|bg-rose-50|bg-amber-50|text-rose-700|text-amber-800/)

    expect(scheduleViewToggle).toMatch(/<Feedback tone="warning"/)
    expect(scheduleViewToggle).toMatch(/<Input/)
    expect(scheduleViewToggle).toMatch(/<Textarea/)
    expect(scheduleViewToggle).toMatch(/bg-\[var\(--success\)\]/)
    expect(scheduleViewToggle).toMatch(/bg-\[var\(--danger\)\]/)
    expect(scheduleViewToggle).toMatch(/wf-card/)
    expect(scheduleViewToggle).not.toMatch(/bg-white|bg-emerald-50|bg-rose-50|bg-amber-50|text-rose-700|text-emerald-700/)
  })

  it("uses semantic setup, connection, and error states in Team Chat", () => {
    expect(chatPage).toMatch(/<Feedback tone="warning"/)
    expect(chatPage).not.toMatch(/bg-amber-50|text-amber-950|text-amber-900/)

    expect(teamChatClient).toMatch(/<Feedback tone="error"/)
    expect(teamChatClient).toMatch(/wf-status-success/)
    expect(teamChatClient).toMatch(/wf-status-warning/)
    expect(teamChatClient).toMatch(/bg-\[var\(--success\)\]/)
    expect(teamChatClient).toMatch(/bg-\[var\(--warning\)\]/)
    expect(teamChatClient).toMatch(/text-\[var\(--danger\)\]/)
    expect(teamChatClient).not.toMatch(/bg-emerald-500|bg-amber-500|text-red-700|hover:bg-red-50|hover:text-red-700/)
  })

  it("uses semantic surfaces, statuses, and shared controls on Setlist Detail", () => {
    expect(setlistDetailPage).toMatch(/wf-page setlist-print-layout/)
    expect(setlistDetailPage).toMatch(/<Feedback tone="error"/)
    expect(setlistDetailPage).toMatch(/<Feedback tone="warning"/)
    expect(setlistDetailPage).toMatch(/<Input/)
    expect(setlistDetailPage).toMatch(/<Select/)
    expect(setlistDetailPage).toMatch(/<Textarea/)
    expect(setlistDetailPage).toMatch(/wf-status-success/)
    expect(setlistDetailPage).toMatch(/wf-status-warning/)
    expect(setlistDetailPage).toMatch(/wf-status-danger/)
    expect(setlistDetailPage).not.toMatch(/(?<!print:)bg-white/)
    expect(setlistDetailPage).not.toMatch(/bg-emerald-100|bg-amber-100|bg-rose-50|text-emerald-800|text-amber-800|text-rose-700/)
  })

  it("uses shared feedback, cards, and forms on Setlist Edit and Complete", () => {
    expect(setlistEditPage).toMatch(/<Feedback tone="error"/)
    expect(setlistEditPage).toMatch(/<Feedback tone="warning"/)
    expect(setlistEditPage).toMatch(/<Input/)
    expect(setlistEditPage).toMatch(/<Textarea/)
    expect(setlistEditPage).toMatch(/wf-card/)
    expect(setlistEditPage).not.toMatch(/bg-white|bg-red-50|bg-amber-50|text-red-700|text-amber-950/)

    expect(setlistCompletePage).toMatch(/<Feedback tone="error"/)
    expect(setlistCompletePage).toMatch(/<Feedback tone="success"/)
    expect(setlistCompletePage).toMatch(/<Input/)
    expect(setlistCompletePage).toMatch(/<Textarea/)
    expect(setlistCompletePage).toMatch(/wf-card/)
    expect(setlistCompletePage).not.toMatch(/bg-white|bg-red-50|bg-emerald-50|text-red-700|text-emerald-800/)
  })

})
