"use server"

import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { z } from "zod"
import { requireAccountSession } from "@/lib/account-session"
import { allowAuthAttempt } from "@/lib/auth-rate-limit"
import { verifyCurrentPassword } from "@/lib/reauthenticate"
import { createAdminClient } from "@/lib/supabase/admin"
import { RECOVERY_COOKIE } from "@/lib/auth-security"

const fail = (code: string): never => redirect("/settings/security?error=" + code)
const success = (code: string): never => redirect("/settings/security?success=" + code)
const passwordSchema = z.string().min(12).max(72).refine(value => Buffer.byteLength(value, "utf8") <= 72)

async function sensitiveAccount(formData: FormData) {
  const account = await requireAccountSession()
  if (!(await allowAuthAttempt("sensitive", account.user.id))) fail("rate_limited")
  if (!(await verifyCurrentPassword(account.user, formData.get("currentPassword")))) fail("reauthentication")
  return account
}

export async function changePassword(formData: FormData) {
  const password = passwordSchema.safeParse(formData.get("password"))
  if (!password.success || password.data !== formData.get("confirmPassword")) fail("password")
  const { supabase } = await sensitiveAccount(formData)
  const nonce = String(formData.get("nonce") ?? "").trim()
  if (nonce && !/^\d{6}$/.test(nonce)) fail("nonce")
  const { error } = await supabase.auth.updateUser({
    password: password.data,
    current_password: String(formData.get("currentPassword")),
    ...(nonce ? { nonce } : {}),
  })
  if (error) fail("password_update")
  ;(await cookies()).delete(RECOVERY_COOKIE)
  const { error: signoutError } = await supabase.auth.signOut({ scope: "global" })
  if (signoutError) fail("revocation")
  redirect("/reset-password?saved=true")
}

export async function sendPasswordNonce() {
  const { supabase, user } = await requireAccountSession()
  if (!(await allowAuthAttempt("recovery", user.id))) fail("rate_limited")
  const { error } = await supabase.auth.reauthenticate()
  if (error) fail("nonce")
  success("nonce_sent")
}

export async function signOutOtherSessions(formData: FormData) {
  const { supabase } = await sensitiveAccount(formData)
  const { error } = await supabase.auth.signOut({ scope: "others" })
  if (error) fail("revocation")
  success("sessions_revoked")
}

export type MfaSetupState = { error?: string; factorId?: string; qrCode?: string; secret?: string }
export async function enrollMfa(_state: MfaSetupState, formData: FormData): Promise<MfaSetupState> {
  const { supabase, user } = await requireAccountSession()
  if (!(await allowAuthAttempt("sensitive", user.id))) return { error: "Too many attempts. Wait 15 minutes and try again." }
  if (!(await verifyCurrentPassword(user, formData.get("currentPassword")))) return { error: "Your password could not be verified. Try again." }
  const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors()
  if (factorsError) return { error: "Authenticator setup is unavailable. Please try again." }
  if (factors.totp.length) return { error: "An authenticator is already enabled. Refresh this page to manage it." }
  for (const factor of factors.all.filter(f => f.status === "unverified" && f.factor_type === "totp")) {
    const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id })
    if (error) return { error: "Previous setup could not be cleared. Please try again." }
  }
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "WorshipFlow", issuer: "WorshipFlow" })
  if (error) return { error: "Authenticator setup is unavailable. Please try again." }
  return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret }
}

export async function verifyMfaEnrollment(formData: FormData) {
  const { supabase, user } = await requireAccountSession()
  if (!(await allowAuthAttempt("mfa", user.id))) fail("rate_limited")
  const factorId = String(formData.get("factorId") ?? "")
  const code = String(formData.get("code") ?? "").trim()
  if (!/^\d{6}$/.test(code)) fail("mfa_code")
  const { data: factors, error: listError } = await supabase.auth.mfa.listFactors()
  if (listError || !factors.all.some(f => f.id === factorId && f.factor_type === "totp" && f.status === "unverified")) fail("mfa_setup")
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code })
  if (error) fail("mfa_code")
  const { error: signoutError } = await supabase.auth.signOut({ scope: "others" })
  if (signoutError) fail("revocation")
  success("mfa_enabled")
}

export async function disableMfa(formData: FormData) {
  const { supabase } = await sensitiveAccount(formData)
  const code = String(formData.get("code") ?? "").trim()
  const { data, error: listError } = await supabase.auth.mfa.listFactors()
  const factor = data?.totp[0]
  if (listError || !factor || !/^\d{6}$/.test(code)) return fail("mfa_code")
  const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code })
  if (verifyError) fail("mfa_code")
  const { error: otherSessionsError } = await supabase.auth.signOut({ scope: "others" })
  if (otherSessionsError) fail("revocation")
  const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id })
  if (error) fail("mfa_update")
  const { error: signoutError } = await supabase.auth.signOut({ scope: "global" })
  if (signoutError) fail("revocation")
  redirect("/login")
}

export async function deleteAccount(formData: FormData) {
  if (formData.get("confirmation") !== "DELETE") fail("confirmation")
  const { supabase, user } = await sensitiveAccount(formData)
  const admin = createAdminClient()
  const { data: allowed, error: preflightError } = await admin.rpc("account_deletion_preflight", { p_user_id: user.id })
  if (preflightError) fail("deletion")
  if (!allowed) fail("last_admin")

  // Use the Storage API so both object metadata and underlying files are removed.
  // Shared church records stay; personal uploads and message attachments are removed.
  for (let batch = 0; batch < 100; batch++) {
    const { data: uploads, error } = await admin.rpc("list_account_uploads", { p_user_id: user.id })
    if (error) fail("deletion_uploads")
    if (!uploads?.length) break
    const buckets = new Set<string>(uploads.map((upload: { bucket_id: string }) => upload.bucket_id))
    for (const bucket of buckets) {
      const paths = uploads.filter((upload: { bucket_id: string }) => upload.bucket_id === bucket).map((upload: { name: string }) => upload.name)
      const { error: referencesError } = await admin.rpc("clear_account_upload_references", { p_bucket_id: bucket, p_paths: paths })
      if (referencesError) fail("deletion_uploads")
      const { error: removalError } = await admin.storage.from(bucket).remove(paths)
      if (removalError) fail("deletion_uploads")
    }
    if (batch === 99) fail("deletion_uploads")
  }
  const { error: revokeError } = await supabase.auth.signOut({ scope: "global" })
  if (revokeError) fail("revocation")
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id)
  ;(await cookies()).delete(RECOVERY_COOKIE)
  if (deleteError) redirect("/login?deletion_failed=1")
  redirect("/login?account_deleted=1")
}
