  return (
    <AuthSplitLayout>
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
              <div
                role="status"
                className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800"
              >
                If an account exists for that email, a password reset link is
                on its way. Check your inbox and spam folder.
              </div>
            ) : (
              <>
                {errorMessage ? (
                  <div
                    role="alert"
                    className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
                  >
                    {errorMessage}
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
                      <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        maxLength={320}
                        autoComplete="email"
                        placeholder="you@example.com"
                        className="h-12 w-full rounded-xl border border-[var(--border)] bg-white pl-10 pr-4 text-sm outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/10"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="h-12 w-full rounded-xl bg-[var(--brand)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)]"
                  >
                    Send reset link
                  </button>
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
    </AuthSplitLayout>
  )
}
