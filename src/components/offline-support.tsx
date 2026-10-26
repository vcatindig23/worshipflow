"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { shouldSyncOfflineAccount } from "@/lib/offline-support-routes"
import { captureInstallPrompt, clearInstallPrompt } from "@/lib/pwa-install"

export default function OfflineSupport() {
  const pathname = usePathname()
  const shouldSyncAccount = shouldSyncOfflineAccount(pathname)

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      captureInstallPrompt(event)
    }
    const handleAppInstalled = () => {
      clearInstallPrompt()
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleAppInstalled)

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((error: unknown) => {
        console.error("Service worker registration failed:", error)
      })
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [])

  useEffect(() => {
    if (pathname !== "/login") return
    try { localStorage.removeItem("worshipflow-offline-user") } catch {}
    void import("@/lib/offline-stage").then(({ clearOfflineStageSnapshots }) => clearOfflineStageSnapshots()).catch(() => {})
  }, [pathname])

  useEffect(() => {
    if (!shouldSyncAccount) {
      return
    }

    let cancelled = false
    async function syncAccount() {
      if (!navigator.onLine || document.visibilityState === "hidden") return
      try {
        const { getBrowserSession } = await import("@/lib/supabase/client")
        const session = await getBrowserSession(true)
        if (cancelled) return
        const userId = session?.user.id ?? null
        const previousUserId = localStorage.getItem("worshipflow-offline-user")
        if (userId) localStorage.setItem("worshipflow-offline-user", userId)
        else localStorage.removeItem("worshipflow-offline-user")
        if (!userId || (previousUserId && previousUserId !== userId)) {
          const { clearOfflineStageSnapshots } = await import("@/lib/offline-stage")
          await clearOfflineStageSnapshots(userId ?? undefined)
        }
      } catch {
        // Preserve saved stage charts during a network outage.
      }
    }
    void syncAccount()
    window.addEventListener("focus", syncAccount)
    window.addEventListener("online", syncAccount)
    document.addEventListener("visibilitychange", syncAccount)
    const timer = window.setInterval(syncAccount, 60_000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
      window.removeEventListener("focus", syncAccount)
      window.removeEventListener("online", syncAccount)
      document.removeEventListener("visibilitychange", syncAccount)
    }
  }, [shouldSyncAccount])

  return null
}
