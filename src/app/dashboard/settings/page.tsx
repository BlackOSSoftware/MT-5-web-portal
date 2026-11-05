"use client";

import { Suspense, type ComponentType } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, KeyRound, ShieldCheck, SlidersHorizontal, UserRound } from "lucide-react";
import { useUserMe } from "@/hooks/useUser";
import ProfilePage from "../profile/page";
import KycPage from "../kyc/page";
import ChangePasswordPanel from "../components/settings/ChangePasswordPanel";
import PreferencesPanel from "../components/settings/PreferencesPanel";

type TabKey = "profile" | "verification" | "security" | "preferences";

const TABS: {
  key: TabKey;
  label: string;
  description: string;
  icon: ComponentType<{ size?: number; className?: string }>;
}[] = [
  { key: "profile", label: "Profile", description: "Personal details & address", icon: UserRound },
  { key: "verification", label: "Verification", description: "KYC documents & status", icon: ShieldCheck },
  { key: "security", label: "Security", description: "Change your password", icon: KeyRound },
  { key: "preferences", label: "Preferences", description: "Theme & one-click trading", icon: SlidersHorizontal },
];

function kycBadge(status?: string) {
  switch (String(status || "").toUpperCase()) {
    case "VERIFIED":
      return { text: "KYC verified", cls: "bg-emerald-500/12 text-emerald-500 border-emerald-500/25" };
    case "PENDING":
      return { text: "KYC pending", cls: "bg-amber-500/12 text-amber-500 border-amber-500/25" };
    case "REJECTED":
      return { text: "KYC rejected", cls: "bg-red-500/12 text-red-500 border-red-500/25" };
    default:
      return { text: "KYC not submitted", cls: "bg-slate-500/12 text-[var(--text-muted)] border-[var(--border-soft)]" };
  }
}

function SettingsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { data: user } = useUserMe();

  const requested = params.get("tab") as TabKey | null;
  const tab: TabKey = TABS.some((t) => t.key === requested) ? (requested as TabKey) : "profile";
  const active = TABS.find((t) => t.key === tab)!;
  const badge = kycBadge(user?.kycStatus);
  const initials =
    String(user?.name || "U")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase() || "U";

  const select = (key: TabKey) => router.replace(`${pathname}?tab=${key}`, { scroll: false });

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl space-y-3 overflow-x-hidden p-2 sm:space-y-4 sm:p-3 md:space-y-5 md:p-6">
      {/* HEADER */}
      <section className="relative overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-3 sm:p-4 md:p-6">
        <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-[var(--primary)]/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="relative flex min-w-0 flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--primary)] sm:text-[11px]">Account</p>
            <h1 className="mt-1 text-lg font-semibold text-[var(--text-main)] sm:text-xl md:text-2xl">Settings</h1>
            <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-muted)] sm:text-xs md:text-sm">
              Manage your profile, verification, security and preferences.
            </p>
          </div>
          <div className="flex w-full min-w-0 items-center gap-2.5 rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-glass)] px-2.5 py-2 sm:gap-3 sm:px-3 sm:py-2.5 md:w-auto md:max-w-xs">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,#4f6eff,#22b8f0)] text-xs font-bold text-white sm:h-11 sm:w-11 sm:text-sm">
              {initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-[var(--text-main)] sm:text-sm">{user?.name || "Trader"}</p>
              <p className="truncate text-[11px] text-[var(--text-muted)] sm:text-xs">{user?.email || ""}</p>
              <span className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[9px] font-semibold sm:text-[10px] ${badge.cls}`}>
                {badge.text}
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="grid min-w-0 grid-cols-1 gap-3 sm:gap-4 md:grid-cols-[240px_minmax(0,1fr)] md:gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        {/* TABS — 2×2 grid on phones, 4 across on tablets, vertical list on desktop */}
        <nav aria-label="Settings sections" className="min-w-0 md:sticky md:top-20 md:self-start">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-1 md:gap-1 md:rounded-2xl md:border md:border-[var(--border-soft)] md:bg-[var(--bg-card)] md:p-2">
            {TABS.map(({ key, label, description, icon: Icon }) => {
              const isActive = key === tab;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => select(key)}
                  aria-current={isActive ? "page" : undefined}
                  className={`group flex min-w-0 items-center gap-2 rounded-xl border px-2 py-2 text-left transition sm:gap-2.5 sm:px-2.5 md:w-full md:gap-3 md:border-transparent md:px-3 md:py-2.5 ${
                    isActive
                      ? "border-[var(--primary)]/30 bg-[var(--primary)]/10 md:shadow-[inset_3px_0_0_var(--primary)]"
                      : "border-[var(--border-soft)] bg-[var(--bg-card)] hover:bg-[var(--bg-glass)] md:bg-transparent"
                  }`}
                >
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg transition md:h-9 md:w-9 ${
                      isActive
                        ? "bg-[linear-gradient(135deg,#4f6eff,#22b8f0)] text-white shadow-[0_6px_16px_-6px_rgba(79,110,255,0.8)]"
                        : "bg-[var(--bg-glass)] text-[var(--text-secondary)]"
                    }`}
                  >
                    <Icon size={16} />
                  </span>
                  <span className="min-w-0">
                    <span
                      className={`block truncate text-[12px] font-semibold sm:text-[13px] md:text-sm ${
                        isActive ? "text-[var(--primary)]" : "text-[var(--text-main)]"
                      }`}
                    >
                      {label}
                    </span>
                    <span className="hidden truncate text-[11px] text-[var(--text-muted)] md:block">{description}</span>
                  </span>
                  <ChevronRight
                    size={16}
                    className={`ml-auto hidden shrink-0 transition md:block ${
                      isActive ? "text-[var(--primary)]" : "text-[var(--text-muted)] group-hover:translate-x-0.5"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </nav>

        {/* CONTENT */}
        <div className="min-w-0">
          <div className="mb-2 flex min-w-0 items-baseline gap-1.5 md:hidden">
            <p className="shrink-0 text-[13px] font-semibold text-[var(--text-main)]">{active.label}</p>
            <span className="truncate text-[11px] text-[var(--text-muted)]">· {active.description}</span>
          </div>
          <div
            key={tab}
            className="min-w-0 animate-fadeUp [&>div]:!max-w-none [&>div]:!p-0 [&_.kyc-shell]:!h-auto [&_.kyc-shell]:!min-h-0"
          >
            {tab === "profile" ? <ProfilePage /> : null}
            {tab === "verification" ? <KycPage /> : null}
            {tab === "security" ? <ChangePasswordPanel embedded /> : null}
            {tab === "preferences" ? <PreferencesPanel /> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsContent />
    </Suspense>
  );
}
