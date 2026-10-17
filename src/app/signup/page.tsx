  return (
    <AuthSplitLayout>
      <div className="w-full">
          <header className="mb-6 text-left">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--brand)]">
              Get started
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl">
              Create your account
            </h1>
            <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--muted)]">
              Bring your songs, service plans, and worship team together in one workspace.
            </p>
          </header>

          <section className="rounded-[28px] border border-[var(--border)] bg-white/95 p-6 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.24)] ring-1 ring-black/[0.02] backdrop-blur sm:p-8">
            {errorMessage ? (
              <div
                role="alert"
                className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
              >
                {errorMessage}
              </div>
            ) : null}

            <form action={signup} className="space-y-4">
              <div>
                <label
                  htmlFor="fullName"
                  className="mb-2 block text-sm font-semibold text-[var(--foreground)]"
                >
                  Full name
                </label>
                <div className="relative">
                  <UserRound
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]"
                  />
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    autoComplete="name"
                    required
                    minLength={2}
                    maxLength={120}
                    placeholder="Your full name"
                    className={iconInputClassName}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-semibold text-[var(--foreground)]"
                >
                  Email address
                </label>
                <div className="relative">
                  <Mail
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]"
                  />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={320}
                    placeholder="you@example.com"
                    className={iconInputClassName}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-semibold text-[var(--foreground)]"
                >
                  Password
                </label>
                <PasswordInput
                  id="password"
                  name="password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                  required
                  placeholder="At least 8 characters"
                  className={passwordInputClassName}
                />
                <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                  Use at least 8 characters.
                </p>
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-2 block text-sm font-semibold text-[var(--foreground)]"
                >
                  Confirm password
                </label>
                <PasswordInput
                  id="confirmPassword"
                  name="confirmPassword"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                  required
                  placeholder="Enter your password again"
                  className={passwordInputClassName}
                />
              </div>

              <button
                type="submit"
                className="group mt-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-[var(--brand-dark)] hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--brand-soft)]"
              >
                Create account
              </button>
            </form>

            <div className="mt-6 border-t border-[var(--border)] pt-5 text-center">
              <p className="text-sm text-[var(--muted)]">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="rounded-sm font-semibold text-[var(--brand)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </section>

          <p className="mx-auto mt-5 max-w-sm text-center text-xs leading-5 text-[var(--muted)]">
            Your account helps you prepare and coordinate with your church worship team.
          </p>
        </div>
    </AuthSplitLayout>
  )
}
