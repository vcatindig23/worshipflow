"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import {
  CheckCircle2,
  Download,
  Info,
  LoaderCircle,
  Share,
  Smartphone,
} from "lucide-react"
import {
  clearInstallPrompt,
  getInstallPrompt,
  isIOSDevice,
  isStandaloneDisplay,
  subscribeInstallPrompt,
} from "@/lib/pwa-install"

type InstallEnvironment = {
  isIOS: boolean
  isStandalone: boolean
}

type InstallStatus = "idle" | "installing" | "installed" | "dismissed" | "error"

export default function PwaInstallCard() {
  const installPrompt = useSyncExternalStore(
    subscribeInstallPrompt,
    getInstallPrompt,
    () => null,
  )
  const [environment, setEnvironment] = useState<InstallEnvironment | null>(null)
  const [status, setStatus] = useState<InstallStatus>("idle")

  useEffect(() => {
    const displayMode = window.matchMedia("(display-mode: standalone)")
    const updateEnvironment = () => {
      const isIOS = isIOSDevice(
        navigator.userAgent,
        navigator.platform,
        navigator.maxTouchPoints,
      )
      const isStandalone = isStandaloneDisplay(
        displayMode.matches,
        (navigator as Navigator & { standalone?: boolean }).standalone === true,
      )

      // Browser-only capabilities are read after hydration to avoid server/client markup mismatches.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEnvironment({ isIOS, isStandalone })
    }

    const handleAppInstalled = () => {
      setStatus("installed")
      clearInstallPrompt()
    }

    updateEnvironment()
    displayMode.addEventListener("change", updateEnvironment)
    window.addEventListener("appinstalled", handleAppInstalled)

    return () => {
      displayMode.removeEventListener("change", updateEnvironment)
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [])

  async function handleInstall() {
    if (!installPrompt) return

    setStatus("installing")
    try {
      await installPrompt.prompt()
      const choice = await installPrompt.userChoice
      clearInstallPrompt()
      setStatus(choice.outcome === "accepted" ? "installed" : "dismissed")
    } catch {
      clearInstallPrompt()
      setStatus("error")
    }
  }

  const isStandalone = environment?.isStandalone === true
  const isIOS = environment?.isIOS === true

  return (
    <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]">
            <Smartphone aria-hidden="true" className="size-5" />
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold text-[var(--foreground)]">Install WorshipFlow</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--muted)]">
              Add WorshipFlow to your device for quick access from your home screen and a focused, app-like experience.
            </p>
          </div>
        </div>

        {installPrompt && !isStandalone ? (
          <button
            type="button"
            onClick={handleInstall}
            disabled={status === "installing"}
            className="inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--brand-soft)] disabled:cursor-wait disabled:opacity-70 sm:w-auto"
          >
            {status === "installing" ? (
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            ) : (
              <Download aria-hidden="true" className="size-4" />
            )}
            {status === "installing" ? "Opening installer…" : "Install app"}
          </button>
        ) : null}
      </div>

      <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4" aria-live="polite">
        {environment === null ? (
          <p className="text-sm leading-6 text-[var(--muted)]">
            Checking the installation options available on this device…
          </p>
        ) : isStandalone ? (
          <div className="flex items-start gap-3">
            <CheckCircle2 aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[var(--brand)]" />
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)]">WorshipFlow is open in app mode</p>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                You’re using the installed experience. You can continue managing songs, services, and your schedule from here.
              </p>
            </div>
          </div>
        ) : status === "installed" ? (
          <div className="flex items-start gap-3">
            <CheckCircle2 aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[var(--brand)]" />
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)]">Installation accepted</p>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                Your browser accepted the install request. Check your home screen or app list for WorshipFlow.
              </p>
            </div>
          </div>
        ) : isIOS ? (
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
              <Share aria-hidden="true" className="size-4 text-[var(--brand)]" />
              Add WorshipFlow on iPhone or iPad
            </p>
            <ol className="mt-3 list-decimal space-y-2 ps-5 text-sm leading-6 text-[var(--muted)]">
              <li>Open this page in Safari.</li>
              <li>Tap the Share button in Safari’s toolbar.</li>
              <li>Choose “Add to Home Screen”, then tap “Add”.</li>
            </ol>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[var(--brand)]" />
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)]">
                {status === "dismissed"
                  ? "You can install it later"
                  : status === "error"
                    ? "The install prompt could not be opened"
                    : "Install from your browser menu"}
              </p>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                {status === "dismissed"
                  ? "The browser dismissed the installation prompt. Use your browser menu and choose “Install app” or “Add to Home Screen” when you’re ready."
                  : status === "error"
                    ? "Your browser did not open the installation prompt. Try the browser menu and look for “Install app” or “Add to Home Screen”."
                    : "If your browser supports installation but no install button appears above, open its menu and look for “Install app” or “Add to Home Screen”. The wording varies by browser."}
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
