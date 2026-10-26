import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { MailCheck } from "lucide-react"
import AuthLayout from "@/components/auth/auth-layout"
import FormSubmitButton from "@/components/ui/form-submit-button"
import { getSafeAuthNextPath } from "@/lib/auth-redirect"
import { isEmailConfirmation } from "@/lib/email-confirmation"
import { confirmEmail } from "./actions"

export const metadata: Metadata = { title: "Confirm your email link" }
export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token_hash?: string; type?: string; next?: string }> }) {
  const params = await searchParams
  if (!isEmailConfirmation(params.token_hash, params.type)) redirect("/error?code=confirmation_failed")
  return <AuthLayout><section className="wf-card space-y-6 p-6 sm:p-8">
    <MailCheck className="size-8 text-[var(--brand)]" aria-hidden="true" />
    <h1 className="text-2xl font-semibold">Confirm your email link</h1>
    <p className="text-sm leading-6 text-[var(--muted)]">Continue if you requested this email. This link will verify your account or start the password recovery you requested. You can close this page if you did not request it.</p>
    <form action={confirmEmail}>
      <input type="hidden" name="token_hash" value={params.token_hash} />
      <input type="hidden" name="type" value={params.type} />
      <input type="hidden" name="next" value={getSafeAuthNextPath(params.next ?? null)} />
      <FormSubmitButton pendingText="Verifying…" className="w-full">Continue securely</FormSubmitButton>
    </form>
  </section></AuthLayout>
}
