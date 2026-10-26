import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { getPublicEnv } from "./env"

type BrowserSession = { access_token: string; expires_at: number; user: { id: string } }
let session: BrowserSession | null = null
let fetchedAt = 0
let pending: Promise<BrowserSession | null> | null = null

/** Only a short-lived access token enters memory. Refresh tokens stay HttpOnly. */
export async function getBrowserSession(force = false): Promise<BrowserSession | null> {
  if (!force && session && Date.now() - fetchedAt < 30_000 && session.expires_at * 1000 > Date.now() + 60_000) return session
  if (pending) return pending
  pending = fetch("/api/auth/session", {
    method: "POST", credentials: "same-origin", cache: "no-store",
    headers: { "X-WorshipFlow-Client": "browser" },
  }).then(async (response) => {
    if (response.status === 401 || response.status === 403) {
      session = null
      return null
    }
    if (!response.ok) throw new Error("Unable to verify your session. Please try again.")
    session = await response.json() as BrowserSession
    fetchedAt = Date.now()
    return session
  }).finally(() => { pending = null })
  return pending
}

let browserClient: ReturnType<typeof createSupabaseClient> | undefined
export function createClient() {
  if (!browserClient) {
    const env = getPublicEnv()
    browserClient = createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
      accessToken: async () => (await getBrowserSession())?.access_token ?? null,
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
  }
  return browserClient
}
