import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export type AccountSessionState = { active: boolean; verified: boolean; mfaRequired: boolean }

export async function requireAccountSession(allowMfaChallenge = false) {
  const supabase = await createClient()
  const { data: userData, error } = await supabase.auth.getUser()
  if (error || !userData.user) redirect("/login")
  const { data, error: stateError } = await supabase.rpc("get_account_session_state")
  const state = data as AccountSessionState | null
  if (stateError || !state?.active) redirect("/login?expired=1")
  if (!state.verified) redirect("/check-email")
  if (state.mfaRequired && !allowMfaChallenge) redirect("/auth/mfa")
  return { supabase, user: userData.user, state }
}
