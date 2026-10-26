import type { Metadata } from "next"
import { KeyRound, ShieldCheck, Smartphone, Trash2 } from "lucide-react"
import { PageContainer, PageHeader } from "@/components/ui/page"
import { Input } from "@/components/ui/form-controls"
import { Feedback } from "@/components/ui/feedback"
import FormSubmitButton from "@/components/ui/form-submit-button"
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button"
import PasswordInput from "@/components/auth/password-input"
import MfaSetup from "@/components/auth/mfa-setup"
import { requireAccountSession } from "@/lib/account-session"
import { changePassword, deleteAccount, disableMfa, sendPasswordNonce, signOutOtherSessions } from "./actions"

export const metadata: Metadata = { title: "Account security" }
const errors: Record<string, string> = {
  rate_limited: "Too many attempts. Wait 15 minutes and try again.",
  reauthentication: "Your current password could not be verified. Please try again.",
  password: "Passwords must match and contain at least 12 characters, up to 72 UTF-8 bytes.",
  password_update: "Your password could not be changed. Request an email security code below, enter it with your current password, and try again.",
  nonce: "Your security code could not be sent or verified. Wait a moment and try again.",
  revocation: "Session revocation could not be confirmed. Please try signing out again.",
  mfa_code: "Your authenticator code could not be verified. Use the latest code and try again. If you were setting up MFA, start setup again.",
  mfa_setup: "This setup is no longer available. Start authenticator setup again.",
  mfa_update: "Your authenticator could not be removed. Please try again.",
  confirmation: "Type DELETE to confirm account deletion.",
  last_admin: "You are the only administrator of a workspace. Assign another administrator before deleting your account.",
  deletion: "Account deletion is unavailable. Please try again later.",
  deletion_uploads: "Some uploads could not be removed. Your account is still active. Retry deletion to finish cleanup.",
}
const successes: Record<string, string> = {
  nonce_sent: "A security code was sent to your account email. Enter it below if required for the password change.",
  sessions_revoked: "Your other sessions have been signed out. This device remains signed in.",
  mfa_enabled: "Your authenticator is enabled. Your other sessions have been signed out.",
}

function CurrentPassword({ id }: { id: string }) {
  return <div className="space-y-2"><label htmlFor={id} className="block text-sm font-medium">Current password</label><PasswordInput id={id} name="currentPassword" required autoComplete="current-password" maxLength={200} className="wf-input w-full pr-12" /></div>
}

export default async function SecurityPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const { supabase, user } = await requireAccountSession()
  const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors()
  const enabled = !!factors?.totp.length
  const params = await searchParams
  return <PageContainer className="max-w-5xl">
    <PageHeader title="Account security" description="Manage your password, sign-in verification, and active sessions." eyebrow={<><ShieldCheck className="size-4" /> Your account</>} />
    {params.error && <Feedback tone="error" title={errors[params.error] ?? "The request could not be completed. Please try again."} />}
    {params.success && successes[params.success] && <Feedback tone="success" title={successes[params.success]} />}
    <p className="text-sm text-[var(--muted)]">Signed in as <span className="font-medium text-[var(--foreground)]">{user.email}</span>. Email verified.</p>

    <section className="wf-card space-y-5 p-5 sm:p-7" aria-labelledby="password-title">
      <div><h2 id="password-title" className="flex items-center gap-2 text-lg font-semibold"><KeyRound className="size-5 text-[var(--brand)]" aria-hidden="true" /> Change password</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Use a unique password or passphrase with at least 12 characters. Changing it signs you out on every device.</p></div>
      <form action={changePassword} className="max-w-lg space-y-4">
        <CurrentPassword id="change-current-password" />
        <div className="space-y-2"><label htmlFor="new-password" className="block text-sm font-medium">New password</label><PasswordInput id="new-password" name="password" required autoComplete="new-password" minLength={12} maxLength={72} className="wf-input w-full pr-12" /></div>
        <div className="space-y-2"><label htmlFor="confirm-password" className="block text-sm font-medium">Confirm new password</label><PasswordInput id="confirm-password" name="confirmPassword" required autoComplete="new-password" minLength={12} maxLength={72} className="wf-input w-full pr-12" /></div>
        <div className="space-y-2"><label htmlFor="security-nonce" className="block text-sm font-medium">Email security code <span className="font-normal text-[var(--muted)]">(if requested)</span></label><Input id="security-nonce" name="nonce" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} /></div>
        <FormSubmitButton pendingText="Updating password…">Update password</FormSubmitButton>
      </form>
      <form action={sendPasswordNonce}><FormSubmitButton pendingText="Sending code…" className="bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--brand-soft)]">Send email security code</FormSubmitButton></form>
    </section>

    <section className="wf-card space-y-5 p-5 sm:p-7" aria-labelledby="mfa-title">
      <div><h2 id="mfa-title" className="flex items-center gap-2 text-lg font-semibold"><Smartphone className="size-5 text-[var(--brand)]" aria-hidden="true" /> Authenticator app</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Add a second verification step at sign-in. Keep your authenticator backed up or available on a trusted second device. Password recovery does not remove this protection.</p></div>
      {factorsError ? <Feedback tone="error" title="Authenticator settings could not be loaded. Refresh this page to retry." /> : enabled ? <>
        <Feedback tone="success" title="Authenticator enabled" />
        <form action={disableMfa} className="max-w-lg space-y-4">
          <CurrentPassword id="remove-mfa-password" />
          <label htmlFor="remove-mfa-code" className="block text-sm font-medium">Current authenticator code</label>
          <Input id="remove-mfa-code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required />
          <ConfirmSubmitButton title="Remove authenticator?" description="Your account will use password-only sign-in. You will be signed out on every device." confirmLabel="Remove authenticator">Remove authenticator</ConfirmSubmitButton>
        </form>
      </> : <MfaSetup />}
    </section>

    <section className="wf-card space-y-5 p-5 sm:p-7" aria-labelledby="sessions-title">
      <div><h2 id="sessions-title" className="text-lg font-semibold">Other sessions</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Sign out other devices if you no longer use them or suspect someone has access. Sessions expire after 30 days. The standard sign-out action signs out every device.</p></div>
      <form action={signOutOtherSessions} className="max-w-lg space-y-4"><CurrentPassword id="sessions-password" /><FormSubmitButton pendingText="Signing out other devices…">Sign out other devices</FormSubmitButton></form>
    </section>

    <section className="wf-card space-y-5 border-red-200 p-5 sm:p-7" aria-labelledby="delete-title">
      <div><h2 id="delete-title" className="flex items-center gap-2 text-lg font-semibold"><Trash2 className="size-5 text-red-600" aria-hidden="true" /> Delete account</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Permanently remove your sign-in, profile, memberships, messages, preferences, notifications, and uploads, including files you shared with the team. Shared church songs, services, and historical activity remain with account references cleared. Past names or mentions in shared content may remain. Permission history is retained for security. Backups expire under the provider&apos;s retention policy.</p><p className="mt-2 text-sm leading-6 text-[var(--muted)]">If you are the only workspace administrator, assign another administrator first. File cleanup happens before deletion; interrupted cleanup can be retried.</p></div>
      <form action={deleteAccount} className="max-w-lg space-y-4">
        <CurrentPassword id="delete-password" />
        <label htmlFor="delete-confirmation" className="block text-sm font-medium">Type DELETE to confirm</label>
        <Input id="delete-confirmation" name="confirmation" required pattern="DELETE" autoComplete="off" />
        <ConfirmSubmitButton variant="destructive" title="Permanently delete your account?" description="Your personal data and uploads will be removed. Shared church content will remain. This cannot be undone." confirmLabel="Delete my account">Delete my account</ConfirmSubmitButton>
      </form>
    </section>
  </PageContainer>
}
