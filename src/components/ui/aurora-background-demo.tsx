"use client"

import { motion } from "motion/react"
import Link from "next/link"
import { ArrowRight, Music2 } from "lucide-react"
import AuroraBackground from "@/components/ui/aurora-background"

export function AuroraBackgroundDemo() {
  return (
    <AuroraBackground className="px-6 py-16 sm:px-10">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.35 }}
        transition={{
          duration: 0.7,
          ease: "easeOut",
        }}
        className="mx-auto flex w-full max-w-3xl flex-col items-center justify-center gap-5 text-center"
      >
        <div className="flex size-14 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--card)]/80 text-[var(--brand)] shadow-sm backdrop-blur">
          <Music2 aria-hidden="true" className="size-6" />
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--brand)]">
          WorshipFlow
        </p>
        <h1 className="max-w-3xl text-4xl font-bold tracking-[-0.045em] text-[var(--foreground)] sm:text-6xl">
          One team. One rhythm. One calling.
        </h1>
        <p className="max-w-xl text-base leading-7 text-[var(--muted)] sm:text-lg">
          Keep your songs, service plans, schedules, and worship team connected
          in one place.
        </p>
        <Link
          href="/login"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[var(--brand-dark)]"
        >
          Explore WorshipFlow
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </motion.div>
    </AuroraBackground>
  )
}

export default AuroraBackgroundDemo
