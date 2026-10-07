import Link from "next/link"
import { ArrowRight, KeyRound } from "lucide-react"
import WorshipFlowLogo from "@/components/songs/worshipflow-logo"
import { createClient } from "@/lib/supabase/server"
import { updatePassword } from "./actions"

type ResetPasswordPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const errorMessages: Record<string, string> = {
  invalid_password: "Use a password between 8 and 72 characters.",
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
  const hasSession = Boolean(claimsData?.claims?.sub)

  if (claimsError) {
    console.error("Failed to validate password reset session:", {
      message: claimsError.message,
    })
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-8 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center">
        <div className="w-full">
          <div className="mb-8 flex justify-center">
            <Link href="/login" className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-[var(--brand)] text-white">
                <WorshipFlowLogo className="size-7" />
              </div>
              <span className="text-lg font-semibold tracking-[-0.025em]">
                WorshipFlow
              </span>
            </Link>
          </div>

          <section className="rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm sm:p-8">
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
                  Your new password is ready to use the next time you sign in.
                </p>
                <Link
                  href="/"
                  className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)]"
                >
                  Continue to WorshipFlow
                  <ArrowRight className="size-4" />
                </Link>
              </>
            ) : hasSession ? (
              <>
                <h1 className="text-2xl font-semibold tracking-[-0.035em] text-[var(--foreground)]">
                  Choose a new password
                </h1>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  Use at least 8 characters. You&apos;ll use this password the
                  next time you sign in.
                </p>

                {errorMessage ? (
                  <div
                    role="alert"
                    className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
                  >
                    {errorMessage}
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
                    <input
                      id="password"
                      name="password"
                      type="password"
                      required
                      minLength={8}
                      maxLength={72}
                      autoComplete="new-password"
                      className="h-12 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-sm outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/10"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="confirmPassword"
                      className="mb-2 block text-sm font-medium text-[var(--foreground)]"
                    >
                      Confirm new password
                    </label>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      required
                      minLength={8}
                      maxLength={72}
                      autoComplete="new-password"
                      className="h-12 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-sm outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/10"
                    />
                  </div>
                  <button
                    type="submit"
                    className="h-12 w-full rounded-xl bg-[var(--brand)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)]"
                  >
                    Update password
                  </button>
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
        </div>
      </div>
    </main>
  )
}
