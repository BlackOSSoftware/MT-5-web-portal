"use client";

import { motion } from "framer-motion";
import {
  Bell,
  BarChart3,
  Copy,
  Headphones,
  Rocket,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";

const features = [
  {
    icon: Copy,
    title: "Mirror Pro Traders",
    description:
      "Automatically replicate the trades of top-performing signal providers in real time — every entry, exit and lot size, synced to your account.",
  },
  {
    icon: ShieldCheck,
    title: "Risk Controls",
    description:
      "Set max allocation, daily loss limits and symbol filters so your capital stays protected while you copy.",
  },
  {
    icon: BarChart3,
    title: "Performance Analytics",
    description:
      "Track copied vs. master performance, equity curves and drawdowns with detailed reports for every strategy you follow.",
  },
  {
    icon: Zap,
    title: "Instant Execution",
    description:
      "Trades are copied within milliseconds through our low-latency execution engine — no manual intervention needed.",
  },
];

const steps = [
  { icon: Users, title: "Choose a Strategy", text: "Browse verified signal providers and compare their track records." },
  { icon: Copy, title: "Set Allocation", text: "Decide how much capital to allocate and configure your risk limits." },
  { icon: TrendingUp, title: "Start Earning", text: "We mirror every trade automatically while you monitor from one dashboard." },
];

export default function CopyTradingPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10">
      {/* HERO */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border-soft)] bg-[var(--bg-card)] p-6 md:p-10"
      >
        {/* decorative gradient blobs */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-25 blur-3xl"
          style={{ background: "radial-gradient(circle, var(--primary) 0%, transparent 70%)" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-28 left-1/4 h-64 w-64 rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, var(--secondary) 0%, transparent 70%)" }}
        />

        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--primary)]/25 bg-[var(--primary-soft)] px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--primary)]">
            <Sparkles size={12} />
            Coming Soon
          </span>

          <h1 className="mt-4 text-2xl font-bold tracking-tight text-[var(--text-main)] md:text-4xl">
            Copy Trading
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)] md:text-base">
            Trade smarter by automatically mirroring the strategies of proven
            traders. Our copy-trading engine is almost ready — be the first to
            know when it launches.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard/support"
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_-8px_var(--primary-glow)] transition hover:bg-[var(--primary-hover)]"
            >
              <Bell size={16} />
              Get Notified at Launch
            </Link>
            <Link
              href="/dashboard/trading-platform"
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-glass)] px-5 py-2.5 text-sm font-semibold text-[var(--text-main)] transition hover:bg-[var(--bg-secondary)]"
            >
              Explore Trading Platform
            </Link>
          </div>
        </div>
      </motion.section>

      {/* FEATURES */}
      <section>
        <h2 className="mb-4 text-lg font-bold text-[var(--text-main)]">
          What&apos;s Coming
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.08 * i }}
              className="group rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--bg-card)] p-5 transition-shadow hover:shadow-[0_12px_32px_-16px_rgba(0,0,0,0.25)]"
            >
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--primary)]/20 bg-[var(--primary-soft)] text-[var(--primary)] transition group-hover:scale-105">
                <f.icon size={20} />
              </span>
              <h3 className="mt-4 text-[15px] font-semibold text-[var(--text-main)]">
                {f.title}
              </h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--text-secondary)]">
                {f.description}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--bg-card)] p-6">
        <div className="mb-5 flex items-center gap-2">
          <Rocket size={18} className="text-[var(--primary)]" />
          <h2 className="text-lg font-bold text-[var(--text-main)]">
            How It Will Work
          </h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.title} className="relative">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-bold text-white">
                  {i + 1}
                </span>
                <h3 className="text-sm font-semibold text-[var(--text-main)]">
                  {s.title}
                </h3>
              </div>
              <p className="mt-2 pl-12 text-[13px] leading-relaxed text-[var(--text-secondary)]">
                {s.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER CTA */}
      <section className="flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-dashed border-[var(--border-strong)] bg-[var(--bg-glass)] p-8 text-center">
        <Headphones size={22} className="text-[var(--text-muted)]" />
        <p className="max-w-md text-sm text-[var(--text-secondary)]">
          Questions about copy trading? Our support team is happy to walk you
          through what&apos;s planned.
        </p>
        <Link
          href="/dashboard/support"
          className="text-sm font-semibold text-[var(--primary)] hover:underline"
        >
          Contact Support →
        </Link>
      </section>
    </div>
  );
}
