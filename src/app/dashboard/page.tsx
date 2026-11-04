"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CandlestickChart,
  CreditCard,
  LineChart,
  Plus,
  RefreshCw,
  Wallet,
  X,
} from "lucide-react";
import GlobalLoader from "@/app/components/ui/GlobalLoader";
import AccountRow from "./components/account/AccountRow";
import { useMyAccounts } from "@/hooks/useMyAccounts";
import { useTodayLots } from "@/hooks/useTodayLots";
import { useTransactions } from "@/hooks/useTransactions";
import { useUserMe } from "@/hooks/useUser";

type AccountItem = {
  _id: string;
  account_type: "live" | "demo" | string;
  account_number: string;
  plan_name?: string;
  balance?: number;
  equity?: number;
  leverage?: number;
  bonus_balance?: number;
  credit?: number;
  free_margin?: number;
  currency?: string;
};

function money(value: number) {
  return `$${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value?: string) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-GB");
}

function txLabel(type?: string) {
  const t = String(type || "").toUpperCase();
  if (t === "DEPOSIT") return "Deposit";
  if (t === "WITHDRAWAL") return "Withdrawal";
  if (t === "INTERNAL_TRANSFER_IN") return "Transfer In";
  if (t === "INTERNAL_TRANSFER_OUT") return "Transfer Out";
  if (t === "TRADABLE_FUND") return "Tradable Fund";
  return t || "Transaction";
}

function isPositiveTx(type?: string) {
  const t = String(type || "").toUpperCase();
  return (
    t === "DEPOSIT" ||
    t === "INTERNAL_TRANSFER_IN" ||
    t === "TRADE_PROFIT" ||
    t === "BONUS_MANUAL" ||
    t === "TRADABLE_FUND"
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { data: user, isLoading: userLoading } = useUserMe();
  const { data: accountsData, isLoading: accountsLoading } = useMyAccounts();
  const { data: todayLotsData } = useTodayLots();
  const { data: txData, isLoading: txLoading, refetch: refetchTx } =
    useTransactions({ page: 1, limit: 8 });
  const { data: depositTxData } = useTransactions({
    page: 1,
    limit: 50,
    type: "DEPOSIT",
  });

  const todayLots = Number(todayLotsData?.todayLots || 0);

  // Show on every fresh load / login; dismiss only hides until remount.
  const [bannerVisible, setBannerVisible] = useState(true);

  const accounts = useMemo(
    () => (Array.isArray(accountsData) ? (accountsData as AccountItem[]) : []),
    [accountsData],
  );

  const liveAccounts = useMemo(
    () => accounts.filter((a) => a.account_type === "live"),
    [accounts],
  );

  const totalBalance = useMemo(
    () =>
      liveAccounts.reduce((sum, a) => {
        const equity = Number(a.equity);
        const balance = Number(a.balance);
        const value = Number.isFinite(equity) && equity > 0 ? equity : balance;
        return sum + (Number.isFinite(value) ? value : 0);
      }, 0),
    [liveAccounts],
  );

  const monthDeposits = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    return (depositTxData?.data ?? [])
      .filter((tx) => {
        const status = String(tx.status || "").toUpperCase();
        if (status && !["APPROVED", "COMPLETED", "SUCCESS"].includes(status)) {
          return false;
        }
        const d = new Date(tx.createdAt);
        return d.getFullYear() === y && d.getMonth() === m;
      })
      .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  }, [depositTxData?.data]);

  const recentTx = useMemo(
    () =>
      (txData?.data ?? [])
        .filter((tx) => String(tx.type).toUpperCase() !== "SWAP")
        .slice(0, 5),
    [txData?.data],
  );

  const dismissBanner = () => {
    setBannerVisible(false);
  };

  if (userLoading || accountsLoading) {
    return (
      <div className="p-6">
        <GlobalLoader />
      </div>
    );
  }

  const firstName =
    String(user?.name || "Trader").trim().split(/\s+/)[0] || "Trader";

  return (
    <div className="min-h-screen bg-[var(--bg-main)] pb-20 md:pb-6">
      <div className="mx-auto w-full max-w-[1400px] space-y-3 px-2 py-2 md:space-y-3.5 md:px-3 md:py-3">
        {bannerVisible ? (
          <section className="relative overflow-hidden rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] px-3 py-2.5 shadow-sm md:px-4">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,var(--primary-glow),transparent_55%)] opacity-60" />
            <button
              type="button"
              onClick={dismissBanner}
              className="absolute right-2 top-2 z-20 rounded-md p-1 text-[var(--text-muted)] transition hover:bg-[var(--bg-glass)] hover:text-[var(--text-main)]"
              aria-label="Dismiss fund banner"
            >
              <X size={14} />
            </button>

            <div className="relative z-10 flex flex-col gap-2.5 pr-7 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)] text-white">
                  <Wallet size={15} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-[var(--primary)]">
                    Fund Your Account
                  </h2>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Add funds to your account and start trading today.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => router.push("/dashboard/payments/deposit")}
                className="inline-flex h-8 items-center justify-center rounded-lg bg-[var(--primary)] px-3 text-xs font-semibold text-white transition hover:bg-[var(--primary-hover)]"
              >
                Deposit Now
              </button>
            </div>
          </section>
        ) : null}

        <section>
          <h1 className="text-base font-semibold text-[var(--text-main)] md:text-lg">
            Welcome back, {firstName}!
          </h1>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            Here&apos;s your trading account overview
          </p>
        </section>

        <section className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-2.5">
          <StatCard
            title="Total Balance"
            value={money(totalBalance)}
            subtitle="Total Equity"
            icon={<LineChart size={15} />}
          />
          <StatCard
            title="Live Accounts"
            value={String(liveAccounts.length)}
            subtitle="Active Trading"
            icon={<CandlestickChart size={15} />}
          />
          <StatCard
            title="Today's Lots"
            value={todayLots.toFixed(2)}
            subtitle="Lots Today"
            icon={<CreditCard size={15} />}
          />
          <StatCard
            title="This Month"
            value={money(monthDeposits)}
            subtitle="Monthly Deposits"
            icon={<Wallet size={15} />}
          />
        </section>

        <section className="rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-2.5 shadow-sm md:p-3.5">
          <div className="mb-2.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-semibold text-[var(--text-main)] md:text-[15px]">
              Trading Accounts
            </h2>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => router.push("/dashboard/accounts/open")}
                className="inline-flex h-8 items-center gap-1 rounded-lg bg-[var(--primary)] px-2.5 text-xs font-semibold text-white hover:bg-[var(--primary-hover)]"
              >
                <Plus size={13} />
                Create Live Account
              </button>
              <button
                type="button"
                onClick={() => router.push("/dashboard/accounts")}
                className="inline-flex h-8 items-center rounded-lg border border-[var(--border-soft)] bg-[var(--bg-glass)] px-2.5 text-xs font-medium text-[var(--text-main)]"
              >
                View All
              </button>
            </div>
          </div>

          {accounts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[var(--border-soft)] p-4 text-center text-xs text-[var(--text-muted)]">
              No trading accounts yet. Create a live account to get started.
            </div>
          ) : (
            <div className="space-y-2.5">
              {accounts.slice(0, 4).map((acc) => {
                const balance = Number(acc.balance || 0);
                const equity = Number(acc.equity ?? balance);
                return (
                  <AccountRow
                    key={acc._id}
                    account={{
                      _id: acc._id,
                      account_number: acc.account_number,
                      plan_name: acc.plan_name || "Standard",
                      balance,
                      equity,
                      leverage: Number(acc.leverage || 0),
                      credit: Number(acc.credit ?? acc.bonus_balance ?? 0),
                      bonus_balance: Number(acc.bonus_balance || 0),
                      free_margin: Number(acc.free_margin ?? equity),
                      currency: acc.currency || "USD",
                      account_type: acc.account_type,
                    }}
                  />
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-2.5 shadow-sm md:p-3.5">
          <div className="mb-2.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-semibold text-[var(--text-main)] md:text-[15px]">
              Recent Transactions
            </h2>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => refetchTx()}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-[var(--border-soft)] bg-[var(--bg-glass)] px-2.5 text-xs font-medium"
              >
                <RefreshCw size={12} />
                Refresh
              </button>
              <button
                type="button"
                onClick={() => router.push("/dashboard/payments/transactions")}
                className="inline-flex h-8 items-center rounded-lg bg-[var(--primary)] px-2.5 text-xs font-semibold text-white hover:bg-[var(--primary-hover)]"
              >
                View All
              </button>
            </div>
          </div>

          {txLoading ? (
            <p className="py-4 text-center text-xs text-[var(--text-muted)]">
              Loading transactions…
            </p>
          ) : recentTx.length === 0 ? (
            <p className="rounded-lg border border-dashed border-[var(--border-soft)] py-5 text-center text-xs text-[var(--text-muted)]">
              No recent transactions found.
            </p>
          ) : (
            <div className="space-y-1.5">
              {recentTx.map((tx) => {
                const positive = isPositiveTx(tx.type);
                return (
                  <div
                    key={tx._id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border-soft)] bg-[var(--bg-glass)]/60 px-2.5 py-2"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                          positive
                            ? "bg-emerald-500/15 text-emerald-600"
                            : "bg-rose-500/15 text-rose-600"
                        }`}
                      >
                        {positive ? (
                          <ArrowDownLeft size={14} />
                        ) : (
                          <ArrowUpRight size={14} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-[var(--text-main)] md:text-[13px]">
                          {txLabel(tx.type)}
                        </p>
                        <p className="truncate text-[10px] text-[var(--text-muted)] md:text-[11px]">
                          {tx.remark ||
                            `${txLabel(tx.type)} to account ${tx.accountNumber || "-"}`}{" "}
                          · {formatDate(tx.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p
                        className={`text-xs font-semibold md:text-[13px] ${
                          positive ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {positive ? "+" : "-"}
                        {money(Math.abs(Number(tx.amount || 0)))}
                      </p>
                      <span className="mt-0.5 inline-flex rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-700">
                        {tx.status || "—"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-[var(--text-main)] md:text-[15px]">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <QuickAction
              title="Deposit Funds"
              subtitle="Add money to your trading account"
              icon={<ArrowDownLeft size={15} />}
              onClick={() => router.push("/dashboard/payments/deposit")}
            />
            <QuickAction
              title="Withdraw Funds"
              subtitle="Withdraw money from your account"
              icon={<ArrowUpRight size={15} />}
              onClick={() => router.push("/dashboard/payments/withdraw")}
            />
            <QuickAction
              title="Create Live Account"
              subtitle="Open a new trading account"
              icon={<CandlestickChart size={15} />}
              onClick={() => router.push("/dashboard/accounts/open")}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-2.5 shadow-sm md:p-3">
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium text-[var(--text-muted)] md:text-xs">
          {title}
        </p>
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--primary)]/10 text-[var(--primary)]">
          {icon}
        </div>
      </div>
      <p className="text-base font-semibold text-[var(--text-main)] md:text-lg">
        {value}
      </p>
      <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">
        {subtitle}
      </p>
    </div>
  );
}

function QuickAction({
  title,
  subtitle,
  icon,
  onClick,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--primary)]/40 hover:shadow-md"
    >
      <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)] text-white">
        {icon}
      </div>
      <p className="text-[13px] font-semibold text-[var(--text-main)]">{title}</p>
      <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{subtitle}</p>
    </button>
  );
}
