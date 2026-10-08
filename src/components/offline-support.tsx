"use client"

import { useEffect } from "react"
import type { AuthChangeEvent, Session } from "@supabase/supabase-js"
import { clearOfflineStageSnapshots } from "@/lib/offline-stage"
import { createClient } from "@/lib/supabase/client"

export default function OfflineSupport() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((error: unknown) => {
        console.error("Service worker registration failed:", error)
      })
    }

    const supabase = createClient()
    function syncOfflineUser(userId: string | null) {
      try {
        if (!userId) {
          localStorage.removeItem("worshipflow-offline-user")
          void clearOfflineStageSnapshots().catch((error: unknown) => {
            console.error("Offline stage cleanup after sign-out failed:", error)
          })
          return
        }

        const previousUserId = localStorage.getItem(
          "worshipflow-offline-user"
        )
        localStorage.setItem("worshipflow-offline-user", userId)

        if (previousUserId && previousUserId !== userId) {
          void clearOfflineStageSnapshots(userId).catch((error: unknown) => {
            console.error(
              "Offline stage cleanup after account change failed:",
              error
            )
          })
        }
      } catch (error) {
        console.error("Unable to update offline account scope:", error)
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        if (session?.user.id) {
          syncOfflineUser(session.user.id)
        } else if (event === "SIGNED_OUT" || event === "INITIAL_SESSION") {
          syncOfflineUser(null)
        }
      }
    )

    void supabase.auth.getSession().then(
      ({
        data,
        error,
      }: {
        data: { session: Session | null }
        error: Error | null
      }) => {
        if (error) {
          console.error("Unable to verify offline storage account:", error)
          return
        }
        syncOfflineUser(data.session?.user.id ?? null)
      },
      (error: unknown) => {
        console.error("Unable to verify offline storage account:", error)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return null
}
