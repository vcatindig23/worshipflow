export type InstallPromptOutcome = {
  outcome: "accepted" | "dismissed"
  platform: string
}

export type DeferredInstallPrompt = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<InstallPromptOutcome>
}

let deferredInstallPrompt: DeferredInstallPrompt | null = null
const subscribers = new Set<() => void>()

function notifySubscribers() {
  subscribers.forEach((subscriber) => subscriber())
}

export function captureInstallPrompt(event: Event) {
  event.preventDefault()
  deferredInstallPrompt = event as DeferredInstallPrompt
  notifySubscribers()
}

export function getInstallPrompt() {
  return deferredInstallPrompt
}

export function clearInstallPrompt() {
  if (!deferredInstallPrompt) return
  deferredInstallPrompt = null
  notifySubscribers()
}

export function subscribeInstallPrompt(subscriber: () => void) {
  subscribers.add(subscriber)
  return () => {
    subscribers.delete(subscriber)
  }
}

export function isIOSDevice(
  userAgent: string,
  platform: string,
  maxTouchPoints: number,
) {
  return /iPad|iPhone|iPod/i.test(userAgent) ||
    (platform === "MacIntel" && maxTouchPoints > 1)
}

export function isStandaloneDisplay(
  displayModeStandalone: boolean,
  iosStandalone: boolean,
) {
  return displayModeStandalone || iosStandalone
}
