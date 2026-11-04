"use client";

import { useMemo, useState } from "react";
import {
  CandlestickChart,
  Layers,
  Plus,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useMyAccounts } from "@/hooks/useMyAccounts";
import AccountRow, {
  type AccountRowData,
} from "../components/account/AccountRow";
import TipBanner from "@/app/components/ui/TipBanner";
import GlobalLoader from "@/app/components/ui/GlobalLoader";

type AccountTab = "all" | "live" | "demo";

function money(value: number) {
  return `$${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function toRowAccount(acc: AccountRowData): AccountRowData {
  const balance = Number(acc.balance || 0);
  const equity = Number(acc.equity ?? balance);
  return {
    _id: acc._id,
    account_number: acc.account_number,
    plan_name: acc.plan_name,
    balance,
    equity,
    leverage: Number(acc.leverage || 0),
    credit: Number(acc.credit ?? acc.bonus_balance ?? 0),
    bonus_balance: Number(acc.bonus_balance || 0),
    free_margin: Number(acc.free_margin ?? equity),
    currency: acc.currency || "USD",
    account_type: acc.account_type,
  };
}

export default function MyAccountsPage() {
  const { data, isLoading, isFetching } = useMyAccounts();
  const [tab, setTab] = useState<AccountTab>("all");
  const router = useRouter();
  const queryClient = useQueryClient();

  const accounts = useMemo(() => {
    const list = Array.isArray(data) ? (data as AccountRowData[]) : [];
    return list;
  }, [data]);

  const liveCount = accounts.filter((a) => a.account_type === "live").length;
  const demoCount = accounts.filter((a) => a.account_type === "demo").length;

  const totalEquity = useMemo(
    () =>
      accounts
        .filter((a) => a.account_type === "live")
        .reduce((sum, a) => {
          const equity = Number(a.equity);
          const balance = Number(a.balance);
          const value =
            Number.isFinite(equity) && equity > 0 ? equity : balance;
          return sum + (Number.isFinite(value) ? value : 0);
        }, 0),
    [accounts],
  );

  const filtered = useMemo(() => {
    if (tab === "all") return accounts;
    return accounts.filter((a) => a.account_type === tab);
  }, [accounts, tab]);

  const tabs: { key: AccountTab; label: string; count: number }[] = [
    { key: "all", label: "All", count: accounts.length },
    { key: "live", label: "Live", count: liveCount },
    { key: "demo", label: "Demo", count: demoCount },
  ];

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["my-accounts"] });
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <GlobalLoader />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-main)] pb-28 md:pb-10">
      <div className="mx-auto w-full max-w-[1400px] space-y-4 px-3 py-4 md:space-y-5 md:px-6 md:py-6">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-4 shadow-sm md:p-5">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,var(--primary-glow),transparent_55%)]" />
          <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-[var(--primary)]/8 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--primary)]">
                Trading Desk
              </p>
              <h1 className="mt-1 text-xl font-bold tracking-tight text-[var(--text-main)] md:text-2xl">
                My Accounts
              </h1>
              <p className="mt-1 max-w-xl text-sm text-[var(--text-muted)]">
                Manage live and demo trading accounts, balances, and access.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isFetching}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)]/90 px-3.5 text-sm font-medium text-[var(--text-main)] shadow-sm backdrop-blur transition hover:bg-[var(--bg-glass)] disabled:opacity-60"
              >
                <RefreshCw
                  size={15}
                  className={isFetching ? "animate-spin" : ""}
                />
                Refresh
              </button>
              <button
                type="button"
                onClick={() => router.push("/dashboard/accounts/open")}
                className="hidden h-10 items-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(20,20,199,0.25)] transition hover:bg-[var(--primary-hover)] md:inline-flex"
              >
                <Plus size={16} />
                Create New Account
              </button>
            </div>
          </div>

          <div className="relative z-10 mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <SummaryChip
              icon={<Wallet size={15} />}
              label="Live Equity"
              value={money(totalEquity)}
            />
            <SummaryChip
              icon={<CandlestickChart size={15} />}
              label="Live Accounts"
              value={String(liveCount)}
            />
            <SummaryChip
              icon={<Layers size={15} />}
              label="Demo Accounts"
              value={String(demoCount)}
            />
          </div>
        </section>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex flex-wrap gap-1 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-1 shadow-sm">
            {tabs.map((t) => {
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
                    active
                      ? "bg-[var(--primary)] text-white shadow-sm"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-glass)] hover:text-[var(--text-main)]"
                  }`}
                >
                  {t.label}
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                      active
                        ? "bg-white/20 text-white"
                        : "bg-[var(--bg-glass)] text-[var(--text-muted)]"
                    }`}
                  >
                    {t.count}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="text-xs text-[var(--text-muted)]">
            Showing{" "}
            <span className="font-semibold text-[var(--text-main)]">
              {filtered.length}
            </span>{" "}
            account{filtered.length === 1 ? "" : "s"}
          </p>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border-soft)] bg-[var(--bg-card)] px-6 py-14 text-center shadow-sm">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]">
              <CandlestickChart size={22} />
            </div>
            <p className="mt-3 text-sm font-semibold text-[var(--text-main)]">
              No{" "}
              {tab === "all" ? "" : tab === "live" ? "live " : "demo "}
              accounts found
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Open a new trading account to start managing balances here.
            </p>
            <button
              type="button"
              onClick={() => router.push("/dashboard/accounts/open")}
              className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white hover:bg-[var(--primary-hover)]"
            >
              <Plus size={16} />
              Create Account
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((acc) => (
              <AccountRow key={acc._id} account={toRowAccount(acc)} />
            ))}
          </div>
        )}

        <TipBanner
          title="Account limit"
          message="You can create up to 7 trading accounts in total. If you reach the limit, please contact support to manage or upgrade your accounts."
        />
      </div>

      <div className="fixed bottom-[max(0.5rem,env(safe-area-inset-bottom))] left-2 right-2 z-20 rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-card)]/95 p-2 shadow-lg backdrop-blur md:hidden">
        <button
          type="button"
          onClick={() => router.push("/dashboard/accounts/open")}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] py-2.5 text-sm font-semibold text-white"
        >
          <Plus size={16} />
          Create New Account
        </button>
      </div>
    </div>
  );
}

function SummaryChip({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-main)]/80 px-3.5 py-3 backdrop-blur">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          {label}
        </p>
        <p className="truncate text-base font-bold text-[var(--text-main)]">
          {value}
        </p>
      </div>
    </div>
  );
}
