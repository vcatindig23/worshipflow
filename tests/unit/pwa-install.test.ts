import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  captureInstallPrompt,
  clearInstallPrompt,
  getInstallPrompt,
  isIOSDevice,
  isStandaloneDisplay,
  subscribeInstallPrompt,
} from "../../src/lib/pwa-install"

describe("PWA installation helpers", () => {
  beforeEach(() => {
    clearInstallPrompt()
  })

  it("captures and exposes the browser's deferred install prompt", () => {
    const event = Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
      prompt: vi.fn(async () => {}),
      userChoice: Promise.resolve({ outcome: "accepted" as const, platform: "web" }),
    })
    const subscriber = vi.fn()
    const unsubscribe = subscribeInstallPrompt(subscriber)

    captureInstallPrompt(event)

    expect(event.defaultPrevented).toBe(true)
    expect(getInstallPrompt()).toBe(event)
    expect(subscriber).toHaveBeenCalledTimes(1)

    clearInstallPrompt()
    expect(getInstallPrompt()).toBeNull()
    expect(subscriber).toHaveBeenCalledTimes(2)
    unsubscribe()
  })

  it("supports iPhone and iPad browsers, including iPad desktop user agents", () => {
    expect(isIOSDevice("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)", "iPhone", 5)).toBe(true)
    expect(isIOSDevice("Mozilla/5.0 (iPad; CPU OS 18_0)", "iPad", 5)).toBe(true)
    expect(isIOSDevice("Mozilla/5.0 (Macintosh; Intel Mac OS X)", "MacIntel", 5)).toBe(true)
    expect(isIOSDevice("Mozilla/5.0 (Windows NT 10.0; Win64; x64)", "Win32", 0)).toBe(false)
  })

  it("recognizes standalone display mode on supported browsers", () => {
    expect(isStandaloneDisplay(true, false)).toBe(true)
    expect(isStandaloneDisplay(false, true)).toBe(true)
    expect(isStandaloneDisplay(false, false)).toBe(false)
  })
})
