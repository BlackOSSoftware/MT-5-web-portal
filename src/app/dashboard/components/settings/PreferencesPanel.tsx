"use client";

import { AlertTriangle, Check, Moon, Sun, Zap } from "lucide-react";
import type { ReactNode } from "react";
import { useTheme } from "@/app/providers";
import { useOneClickTrading } from "@/lib/oneClickTrading";

function Card({ icon, title, subtitle, children }: { icon: ReactNode; title: string; subtitle: string; children: ReactNode }) {
  return (
    <section className="min-w-0 rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-3 sm:p-4 md:p-5">
      <div className="flex items-start gap-2.5 sm:gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] sm:h-10 sm:w-10">
          {icon}
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-[var(--text-main)] sm:text-[15px]">{title}</h3>
          <p className="text-[11px] leading-relaxed text-[var(--text-muted)] sm:text-xs">{subtitle}</p>
        </div>
      </div>
      <div className="mt-3 sm:mt-4">{children}</div>
    </section>
  );
}

function ThemeOption({
  mode,
  active,
  onSelect,
}: {
  mode: "light" | "dark";
  active: boolean;
  onSelect: () => void;
}) {
  const light = mode === "light";
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={`group relative min-w-0 overflow-hidden rounded-2xl border p-2.5 text-left transition sm:p-3 ${
        active
          ? "border-[var(--primary)] ring-2 ring-[var(--primary)]/25"
          : "border-[var(--border-soft)] hover:border-[var(--primary)]/40"
      }`}
    >
      {/* Mini preview of the dashboard in this theme */}
      <div className={`overflow-hidden rounded-xl border ${light ? "border-slate-200 bg-slate-50" : "border-white/10 bg-[#121218]"}`}>
        <div className="flex h-20 sm:h-24">
          <div className={`w-10 ${light ? "bg-[#0c1433]" : "bg-[#1c1c26]"} p-1.5`}>
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={`mb-1 block h-2 rounded ${i === 0 ? (light ? "bg-[#4f6eff]" : "bg-[#8b91ff]") : "bg-white/15"}`}
              />
            ))}
          </div>
          <div className="flex-1 space-y-1.5 p-2">
            <span className={`block h-2.5 w-1/2 rounded ${light ? "bg-slate-300" : "bg-white/20"}`} />
            <div className="grid grid-cols-2 gap-1.5">
              <span className={`block h-8 rounded-md ${light ? "bg-white shadow-sm" : "bg-[#19191f]"}`} />
              <span className={`block h-8 rounded-md ${light ? "bg-white shadow-sm" : "bg-[#19191f]"}`} />
            </div>
            <span className={`block h-2 w-2/3 rounded ${light ? "bg-slate-200" : "bg-white/10"}`} />
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-semibold text-[var(--text-main)]">
          {light ? <Sun size={15} /> : <Moon size={15} />}
          {light ? "Light" : "Dark"}
        </span>
        <span
          className={`grid h-5 w-5 place-items-center rounded-full border transition ${
            active ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--border-strong)]"
          }`}
        >
          {active ? <Check size={12} strokeWidth={3} /> : null}
        </span>
      </div>
    </button>
  );
}

export default function PreferencesPanel() {
  const { theme, toggleTheme } = useTheme();
  const [oneClick, setOneClick] = useOneClickTrading();

  const choose = (mode: "light" | "dark") => {
    if (theme !== mode) toggleTheme();
  };

  return (
    <div className="space-y-4">
      <Card icon={<Sun size={18} />} title="Appearance" subtitle="Choose how the portal and trading terminal look.">
        <div className="grid grid-cols-1 gap-2.5 min-[380px]:grid-cols-2 sm:gap-3">
          <ThemeOption mode="light" active={theme === "light"} onSelect={() => choose("light")} />
          <ThemeOption mode="dark" active={theme === "dark"} onSelect={() => choose("dark")} />
        </div>
      </Card>

      <Card icon={<Zap size={18} />} title="Trading" subtitle="Order behaviour on the trading terminal.">
        <button
          type="button"
          role="switch"
          aria-checked={oneClick}
          onClick={() => setOneClick(!oneClick)}
          className="flex w-full items-center gap-3 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-glass)] px-3 py-3 text-left transition hover:border-[var(--primary)]/40 sm:gap-4 sm:px-4 sm:py-3.5"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-semibold text-[var(--text-main)] sm:text-sm">One-click trading</span>
            <span className="mt-0.5 block text-[11px] leading-relaxed text-[var(--text-muted)] sm:text-xs">
              {oneClick
                ? "Buy / Sell sends the order instantly, without a confirmation step."
                : "Every order shows a confirmation before it is sent."}
            </span>
          </span>
          <span
            className={`relative h-6 w-11 shrink-0 rounded-full transition ${
              oneClick ? "bg-[var(--primary)]" : "bg-[var(--border-strong)]"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                oneClick ? "left-[22px]" : "left-0.5"
              }`}
            />
          </span>
        </button>
        {oneClick ? (
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-500/10 px-3 py-2.5 text-xs text-amber-600">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            Orders will be placed immediately when you tap Buy or Sell. Double-check volume before trading.
          </p>
        ) : null}
        <p className="mt-3 text-[11px] text-[var(--text-muted)]">Saved on this device and browser.</p>
      </Card>
    </div>
  );
}
