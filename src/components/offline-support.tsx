"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import type { AuthChangeEvent, Session } from "@supabase/supabase-js"
import { shouldSyncOfflineAccount } from "@/lib/offline-support-routes"

export default function OfflineSupport() {
  const pathname = usePathname()
  const shouldSyncAccount = shouldSyncOfflineAccount(pathname)

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((error: unknown) => {
        console.error("Service worker registration failed:", error)
      })
    }
  }, [])

  useEffect(() => {
    if (!shouldSyncAccount) {
      return
    }

    let cancelled = false
    let unsubscribe: (() => void) | null = null

    void import("@/lib/supabase/client")
      .then(({ createClient }) => {
        if (cancelled) {
          return
        }

        const supabase = createClient()

        function syncOfflineUser(userId: string | null) {
          try {
            if (!userId) {
              localStorage.removeItem("worshipflow-offline-user")
              void import("@/lib/offline-stage")
                .then(({ clearOfflineStageSnapshots }) => clearOfflineStageSnapshots())
                .catch((error: unknown) => {
                  console.error("Offline stage cleanup after sign-out failed:", error)
                })
              return
            }

            const previousUserId = localStorage.getItem(
              "worshipflow-offline-user"
            )
            localStorage.setItem("worshipflow-offline-user", userId)

            if (previousUserId && previousUserId !== userId) {
              void import("@/lib/offline-stage")
                .then(({ clearOfflineStageSnapshots }) => clearOfflineStageSnapshots(userId))
                .catch((error: unknown) => {
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
        unsubscribe = () => subscription.unsubscribe()

        void supabase.auth.getSession().then(
          ({ data, error }: { data: { session: Session | null }; error: Error | null }) => {
            if (cancelled || error) {
              if (error && !cancelled) {
                console.error("Unable to verify offline storage account:", error)
              }
              return
            }

            syncOfflineUser(data.session?.user.id ?? null)
          },
          (error: unknown) => {
            if (!cancelled) {
              console.error("Unable to verify offline storage account:", error)
            }
          }
        )
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          console.error("Unable to initialize offline account sync:", error)
        }
      })

    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [shouldSyncAccount])

  return null
}
