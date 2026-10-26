import "server-only"
import { createClient } from "@supabase/supabase-js"
import { getPublicEnv } from "./env"

/** Only account lifecycle operations and the private rate limiter use this client. */
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error("Server authentication key is unavailable")
  return createClient(getPublicEnv().NEXT_PUBLIC_SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}
