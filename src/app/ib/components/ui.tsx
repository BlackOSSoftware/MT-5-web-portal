"use client";

import type { ComponentType, ReactNode } from "react";
import { Lightbulb } from "lucide-react";

/** Shared premium UI primitives for the IB portal pages. */

export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  action,
}: {
  icon: ComponentType<{ size?: number; className?: string }>;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary)]/12 text-[var(--primary)] ring-1 ring-[var(--primary)]/20">
          <Icon size={20} />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold leading-tight text-[var(--text-main)] sm:text-xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-secondary)] sm:text-sm">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-card)] shadow-[0_1px_0_rgba(255,255,255,0.03)_inset] ${className}`}
    >
      {children}
    </div>
  );
}

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "primary",
}: {
  icon: ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
  hint?: string;
  tone?: "primary" | "green" | "blue" | "amber";
}) {
  const tones: Record<string, string> = {
    primary: "bg-[var(--primary)]/12 text-[var(--primary)] ring-[var(--primary)]/20",
    green: "bg-emerald-500/12 text-emerald-500 ring-emerald-500/20",
    blue: "bg-blue-500/12 text-blue-500 ring-blue-500/20",
    amber: "bg-amber-500/12 text-amber-500 ring-amber-500/20",
  };
  return (
    <Card className="p-3.5 sm:p-4">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${tones[tone]}`}
        >
          <Icon size={18} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
            {label}
          </p>
          <p className="truncate text-base font-bold text-[var(--text-main)] sm:text-lg">
            {value}
          </p>
          {hint ? (
            <p className="truncate text-[11px] text-[var(--text-placeholder)]">{hint}</p>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: ComponentType<{ size?: number; className?: string }>;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--bg-glass)] text-[var(--text-placeholder)]">
        <Icon size={26} />
      </div>
      <p className="text-sm font-semibold text-[var(--text-main)]">{title}</p>
      {subtitle ? (
        <p className="max-w-xs text-xs leading-relaxed text-[var(--text-secondary)]">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "green" | "red" | "blue" | "amber";
}) {
  const tones: Record<string, string> = {
    neutral: "bg-[var(--bg-glass)] text-[var(--text-secondary)]",
    green: "bg-emerald-500/12 text-emerald-500",
    red: "bg-red-500/12 text-red-500",
    blue: "bg-blue-500/12 text-blue-500",
    amber: "bg-amber-500/12 text-amber-500",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function statusTone(status?: string): "green" | "red" | "blue" | "amber" | "neutral" {
  const s = String(status || "").toUpperCase();
  if (["APPROVED", "PAID", "ELIGIBLE", "CONFIRMED", "COMPLETED"].includes(s)) return "green";
  if (["REJECTED", "FAILED", "CANCELLED"].includes(s)) return "red";
  if (["REQUESTED", "PENDING", "PROCESSING"].includes(s)) return "blue";
  if (["EARNED"].includes(s)) return "amber";
  return "neutral";
}

export const inputCls =
  "w-full rounded-xl border border-[var(--border-soft)] bg-[var(--bg-main)] px-3 py-2.5 text-sm text-[var(--text-main)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15";

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50";

export const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-glass)] px-4 py-2.5 text-sm font-semibold text-[var(--text-main)] transition hover:border-[var(--primary)]/40 disabled:opacity-50";

/** Right-side tips panel shown on wide screens. */
export function TipsPanel({ tips, title = "Tips" }: { tips: string[]; title?: string }) {
  if (!tips.length) return null;
  return (
    <Card className="sticky top-4 p-4">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/12 text-amber-500">
          <Lightbulb size={15} />
        </div>
        <h3 className="text-sm font-bold text-[var(--text-main)]">{title}</h3>
      </div>
      <ul className="space-y-2.5">
        {tips.map((tip, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/12 text-[10px] font-bold text-[var(--primary)]">
              {i + 1}
            </span>
            <p className="text-xs leading-relaxed text-[var(--text-secondary)]">{tip}</p>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/**
 * Wide two-column shell for IB pages: main content + right tips sidebar (xl+).
 * Removes the narrow centered max-width so content uses the full dashboard width.
 */
export function IbPageShell({
  children,
}: {
  tips?: string[];
  tipsTitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto grid w-full max-w-[1440px] gap-4 p-3 sm:p-4">
      <div className="min-w-0 space-y-4">{children}</div>
    </div>
  );
}
