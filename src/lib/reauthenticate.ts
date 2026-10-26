import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { getPublicEnv } from "@/lib/supabase/env"

/** Verify the password without replacing or downgrading the current MFA session. */
export async function verifyCurrentPassword(user: { id: string; email?: string }, password: FormDataEntryValue | null) {
  if (!user.email || typeof password !== "string" || !password || password.length > 200) return false
  const env = getPublicEnv()
  const isolated = createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  const { data, error } = await isolated.auth.signInWithPassword({ email: user.email, password })
  const valid = !error && data.user?.id === user.id && !!data.session
  if (data.session) {
    const { error: signOutError } = await isolated.auth.signOut({ scope: "local" })
    if (signOutError) return false
  }
  return valid
}
