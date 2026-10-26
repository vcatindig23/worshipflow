import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { ShieldCheck } from "lucide-react"
import AuthLayout from "@/components/auth/auth-layout"
import FormSubmitButton from "@/components/ui/form-submit-button"
import { Feedback } from "@/components/ui/feedback"
import { Input } from "@/components/ui/form-controls"
import { requireAccountSession } from "@/lib/account-session"
import { getSafeAuthNextPath } from "@/lib/auth-redirect"
import { verifyMfa } from "./actions"

export const metadata: Metadata = { title: "Verify your sign-in" }
export default async function MfaPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const { state } = await requireAccountSession(true)
  const params = await searchParams
  const next = getSafeAuthNextPath(params.next ?? null)
  if (!state.mfaRequired) redirect(next)
  const errors: Record<string, string> = {
    invalid_code: "That code could not be verified. Enter the latest code from your authenticator.",
    rate_limited: "Too many attempts. Wait 15 minutes and try again.",
    unavailable: "Verification is unavailable. Please try again later.",
  }
  return <AuthLayout><section className="wf-card space-y-6 p-6 sm:p-8">
    <ShieldCheck className="size-8 text-[var(--brand)]" aria-hidden="true" />
    <div><h1 className="text-2xl font-semibold">Verify your sign-in</h1><p className="mt-2 text-sm text-[var(--muted)]">Enter the six-digit code from your authenticator app.</p></div>
    {params.error && <Feedback tone="error" title={errors[params.error] ?? errors.invalid_code} />}
    <form action={verifyMfa} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <label htmlFor="mfa-code" className="block text-sm font-medium">Authenticator code</label>
      <Input id="mfa-code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required autoFocus />
      <FormSubmitButton pendingText="Verifying…" className="w-full">Verify sign-in</FormSubmitButton>
    </form>
    <p className="text-sm leading-6 text-[var(--muted)]">Lost your authenticator? Use another signed-in device to manage it, or contact the project maintainer for help with verified account recovery. A password reset does not remove MFA.</p>
    <form action="/auth/signout" method="post"><FormSubmitButton pendingText="Signing out…">Sign out</FormSubmitButton></form>
  </section></AuthLayout>
}
