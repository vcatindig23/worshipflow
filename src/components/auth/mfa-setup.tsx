"use client"

import { useActionState } from "react"
import PasswordInput from "./password-input"
import { Input } from "@/components/ui/form-controls"
import FormSubmitButton from "@/components/ui/form-submit-button"
import { Feedback } from "@/components/ui/feedback"
import { enrollMfa, verifyMfaEnrollment, type MfaSetupState } from "@/app/settings/security/actions"

export default function MfaSetup() {
  const [state, action] = useActionState(enrollMfa, {} as MfaSetupState)
  if (state.factorId && state.qrCode && state.secret) return <div className="space-y-4">
    <p className="text-sm leading-6 text-[var(--muted)]">Scan this QR code in your authenticator app, then enter its code to finish setup. Keep the setup key private.</p>
    {/* The QR image comes from Supabase, never from submitted HTML. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={state.qrCode} width={192} height={192} alt="Authenticator setup QR code" className="rounded-xl border border-[var(--border)] bg-white p-2" />
    <details className="text-sm"><summary className="cursor-pointer font-medium">Enter the key manually</summary><code className="mt-2 block break-all rounded-lg bg-[var(--surface)] p-3 select-all">{state.secret}</code></details>
    <form action={verifyMfaEnrollment} className="max-w-md space-y-3">
      <input type="hidden" name="factorId" value={state.factorId} />
      <label htmlFor="setup-code" className="block text-sm font-medium">Authenticator code</label>
      <Input id="setup-code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required />
      <FormSubmitButton pendingText="Verifying…">Enable authenticator</FormSubmitButton>
    </form>
    <p className="text-xs text-[var(--muted)]">If setup fails, refresh the page and start again. Unfinished setup does not enable MFA.</p>
  </div>
  return <form action={action} className="max-w-md space-y-3">
    {state.error && <Feedback tone="error" title={state.error} />}
    <label htmlFor="setup-password" className="block text-sm font-medium">Confirm your current password</label>
    <PasswordInput id="setup-password" name="currentPassword" required autoComplete="current-password" maxLength={200} className="wf-input w-full pr-12" />
    <FormSubmitButton pendingText="Preparing setup…">Set up authenticator</FormSubmitButton>
  </form>
}
