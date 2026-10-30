import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowRight, KeyRound } from "lucide-react"
import AuthLayout from "@/components/auth/auth-layout"
import { Feedback } from "@/components/ui/feedback"
import AuthSubmitButton from "@/components/auth/auth-submit-button"
import PasswordInput from "@/components/auth/password-input"
import { createClient } from "@/lib/supabase/server"
import { hasRecoverySession } from "@/lib/auth-recovery"
import { updatePassword } from "./actions"

type ResetPasswordPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const errorMessages: Record<string, string> = {
  invalid_password: "Use at least 12 characters, up to 72 UTF-8 bytes.",
  rate_limited: "Too many attempts. Wait 15 minutes and try again.",
  signout_failed: "Your password changed, but session revocation could not be confirmed. Sign out and contact support.",
  password_mismatch: "The passwords do not match.",
  update_failed: "Your password could not be updated. Please try again.",
  expired: "This reset link has expired. Request a new one to continue.",
}

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const params = await searchParams
  const saved = getParam(params.saved) === "true"
  const errorMessage = errorMessages[getParam(params.error) ?? ""]
  const supabase = await createClient()
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims()
  const hasSession = Boolean(claimsData?.claims?.sub) && await hasRecoverySession(supabase)
  if (hasSession && !saved) {
    const { data: state, error } = await supabase.rpc("get_account_session_state")
    if (error || !state?.active) redirect("/forgot-password")
    if (state.mfaRequired) redirect("/auth/mfa?next=/reset-password")
  }

  if (claimsError) {
    console.error("Failed to validate password reset session:", {
      message: claimsError.message,
    })
  }

  return (
    <AuthLayout>
          <section className="wf-card rounded-3xl p-6 sm:p-8">
            <div className="mb-7 flex size-12 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]">
              <KeyRound className="size-5" />
            </div>

            {saved ? (
              <>
                <h1 className="text-2xl font-semibold tracking-[-0.035em] text-[var(--foreground)]">
                  Password updated
                </h1>
                <p
                  role="status"
                  className="mt-2 text-sm leading-6 text-[var(--muted)]"
                >
                  Your password has changed and your sessions have been signed out. Sign in with your new password.
                </p>
                <Link
                  href="/login"
                  className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)]"
                >
                  Sign in
                  <ArrowRight className="size-4" />
                </Link>
              </>
            ) : hasSession ? (
              <>
                <h1 className="text-2xl font-semibold tracking-[-0.035em] text-[var(--foreground)]">
                  Choose a new password
                </h1>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  Use at least 12 characters. You&apos;ll use this password the
                  next time you sign in.
                </p>

                {errorMessage ? (
                  <div className="mt-6">
                    <Feedback tone="error" title="Password could not be updated">
                      {errorMessage}
                    </Feedback>
                  </div>
                ) : null}

                <form action={updatePassword} className="mt-6 space-y-5">
                  <div>
                    <label
                      htmlFor="password"
                      className="mb-2 block text-sm font-medium text-[var(--foreground)]"
                    >
                      New password
                    </label>
                    <PasswordInput
                      id="password"
                      name="password"
                      required
                      minLength={12}
                      maxLength={72}
                      autoComplete="new-password"
                      className="wf-input h-12 px-4 pr-12"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="confirmPassword"
                      className="mb-2 block text-sm font-medium text-[var(--foreground)]"
                    >
                      Confirm new password
                    </label>
                    <PasswordInput
                      id="confirmPassword"
                      name="confirmPassword"
                      required
                      minLength={12}
                      maxLength={72}
                      autoComplete="new-password"
                      className="h-12 w-full rounded-xl border border-[var(--border)] bg-white px-4 pr-12 text-sm outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/10"
                    />
                  </div>
                  <AuthSubmitButton
                    label="Update password"
                    pendingLabel="Updating password…"
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--brand-dark)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--brand-soft)] disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </form>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-semibold tracking-[-0.035em] text-[var(--foreground)]">
                  Reset link expired
                </h1>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  {errorMessage ??
                    "Open the latest password reset email to choose a new password."}
                </p>
                <Link
                  href="/forgot-password"
                  className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-xl bg-[var(--brand)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)]"
                >
                  Request another reset link
                </Link>
              </>
            )}

            {!saved ? (
              <Link
                href="/login"
                className="mt-6 inline-flex text-sm font-semibold text-[var(--brand)] hover:text-[var(--brand-dark)]"
              >
                Back to sign in
              </Link>
            ) : null}
          </section>
    </AuthLayout>
  )
}
