import type { Metadata } from "next"
import Link from "next/link"
import { MailCheck } from "lucide-react"
import AuthLayout from "@/components/auth/auth-layout"

export const metadata: Metadata = {
  title: "Check your email",
  description:
    "Confirm your email address to finish setting up your WorshipFlow account.",
  alternates: { canonical: "/check-email" },
}

export default function CheckEmailPage() {
  return (
    <AuthLayout>
          <div className="rounded-3xl border border-[var(--border)] bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]">
              <MailCheck className="size-6" />
            </div>
            <h1 className="mt-6 text-2xl font-semibold tracking-[-0.035em]">
              Check your email
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              If your address can be registered, you&apos;ll receive an email with a
              confirmation link. Check your inbox and spam folder. If you already
              have an account, return to sign in or reset your password.
            </p>
            <Link
              href="/login"
              className="mt-7 inline-flex h-11 w-full items-center justify-center rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)]"
            >
              Return to sign in
            </Link>
          </div>
    </AuthLayout>
  )
}
