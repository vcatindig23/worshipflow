import Link from "next/link"
import { ArrowLeft, KeyRound, Mail } from "lucide-react"
import AuthLayout from "@/components/auth/auth-layout"
import { Feedback } from "@/components/ui/feedback"
import { Input } from "@/components/ui/form-controls"
import AuthSubmitButton from "@/components/auth/auth-submit-button"
import { requestPasswordReset } from "./actions"

type ForgotPasswordPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const errorMessages: Record<string, string> = {
  rate_limited: "Too many attempts. Wait 15 minutes and try again.",
  invalid_email: "Enter a valid email address.",
  send_failed:
    "We could not send a reset email right now. Please wait a moment and try again.",
  configuration:
    "Password reset is temporarily unavailable. Please contact your workspace administrator.",
}

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function ForgotPasswordPage({
  searchParams,
}: ForgotPasswordPageProps) {
  const params = await searchParams
  const sent = getParam(params.sent) === "true"
  const errorMessage = errorMessages[getParam(params.error) ?? ""]

  return (
    <AuthLayout>
          <section className="rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-7 flex size-12 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]">
              <KeyRound className="size-5" />
            </div>

            <h1 className="text-2xl font-semibold tracking-[-0.035em] text-[var(--foreground)]">
              Reset your password
            </h1>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Enter the email address for your account and we&apos;ll send you a
              secure link to choose a new password.
            </p>

            {sent ? (
              <div className="mt-6">
                <Feedback tone="success" title="Check your inbox">
                  If an account exists for that email, a password reset link is on its way. Check your inbox and spam folder.
                </Feedback>
              </div>
            ) : (
              <>
                {errorMessage ? (
                  <div className="mt-6">
                    <Feedback tone="error" title="Reset link could not be sent">
                      {errorMessage}
                    </Feedback>
                  </div>
                ) : null}

                <form
                  action={requestPasswordReset}
                  className="mt-6 space-y-5"
                >
                  <div>
                    <label
                      htmlFor="email"
                      className="mb-2 block text-sm font-medium text-[var(--foreground)]"
                    >
                      Email address
                    </label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        required
                        maxLength={320}
                        autoComplete="email"
                        placeholder="you@example.com"
                        className="h-12 pl-10 pr-4"
                      />
                    </div>
                  </div>

                  <AuthSubmitButton
                    label="Send reset link"
                    pendingLabel="Sending reset link…"
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--brand-dark)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--brand-soft)] disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </form>
              </>
            )}

            <Link
              href="/login"
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand)] hover:text-[var(--brand-dark)]"
            >
              <ArrowLeft className="size-4" />
              Back to sign in
            </Link>
          </section>
    </AuthLayout>
  )
}
