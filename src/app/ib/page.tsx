"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useUserMe } from "@/hooks/useUser";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BadgeCheck,
  Copy,
  CreditCard,
  HandCoins,
  Link2,
  Plus,
  UserPlus,
  Wallet,
} from "lucide-react";
import GlobalLoader from "@/app/components/ui/GlobalLoader";
import { Toast } from "@/app/components/ui/Toast";
import {
  useMyIbCommissionSummary,
  useReferralDashboard,
  useReferralRewards,
  useRequestReferralReward,
} from "@/hooks/useReferral";
import { useMyAccounts } from "@/hooks/useMyAccounts";
import type {
  ReferralPeriod,
  ReferralScope,
} from "@/services/referral.service";

type ToastState = { message: string; type: "success" | "error" } | null;

function money(value: number) {
  return `$${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function timeAgo(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(mins, 1)}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}


export default function IbDashboardPage() {
  return <ReferralDashboardContent />;
}

function ReferralDashboardContent() {
  const scope: ReferralScope = "total";
  const period: ReferralPeriod = "all";
  const router = useRouter();
  const { data: user } = useUserMe();
  const [toast, setToast] = useState<ToastState>(null);
  const [payoutOpen, setPayoutOpen] = useState(false);
  const [selectedRewardId, setSelectedRewardId] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [payoutDestination, setPayoutDestination] = useState<"account" | "wallet">("account");

  const { data, isLoading, error, refetch, isFetching } = useReferralDashboard(
    scope,
    period,
  );
  const { data: todayData } = useReferralDashboard("total", "today");
  const { data: ibComm } = useMyIbCommissionSummary();
  const { data: rewards = [] } = useReferralRewards();
  const { data: accountsData } = useMyAccounts();
  const requestReward = useRequestReferralReward();

  const liveAccounts = useMemo(() => {
    const list = Array.isArray(accountsData) ? accountsData : [];
    return list.filter(
      (a: { account_type?: string; status?: string }) =>
        a.account_type === "live" &&
        String(a.account_type).toLowerCase() !== "demo" &&
        String(a.status || "active").toLowerCase() === "active",
    );
  }, [accountsData]);

  const eligibleRewards = useMemo(
    () =>
      rewards.filter((r) =>
        ["ELIGIBLE", "eligible"].includes(String(r.status || "")),
      ),
    [rewards],
  );

  const referralLink = useMemo(() => {
    if (!data?.referralCode) return "";
    return `https://user.oceanaprofx.com/signup/?ref=${data.referralCode}`;
  }, [data?.referralCode]);

  const copyText = async (value: string, label: string) => {
    if (!value) {
      setToast({ message: `${label} not available`, type: "error" });
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      setToast({ message: `${label} copied`, type: "success" });
    } catch {
      setToast({ message: `Failed to copy ${label.toLowerCase()}`, type: "error" });
    }
  };

  const openPayout = () => {
    if (!eligibleRewards.length) {
      setToast({
        message: "No eligible commission available to request yet.",
        type: "error",
      });
      return;
    }
    setSelectedRewardId(eligibleRewards[0].rewardId);
    setSelectedAccountId(
      String((liveAccounts[0] as { _id?: string } | undefined)?._id || ""),
    );
    setPayoutDestination("account");
    setPayoutOpen(true);
  };

  const submitPayout = async () => {
    if (!selectedRewardId) {
      setToast({
        message: "Select a reward.",
        type: "error",
      });
      return;
    }
    if (payoutDestination === "account" && !selectedAccountId) {
      setToast({
        message: "Select a reward and live account.",
        type: "error",
      });
      return;
    }
    try {
      await requestReward.mutateAsync(
        payoutDestination === "wallet"
          ? { rewardId: selectedRewardId, destination: "wallet" }
          : { rewardId: selectedRewardId, accountId: selectedAccountId, destination: "account" },
      );
      setPayoutOpen(false);
      setToast({
        message:
          payoutDestination === "wallet"
            ? "Payout credited to your wallet"
            : "Payout credited as bonus credit on your live account",
        type: "success",
      });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setToast({
        message: e?.response?.data?.message || "Failed to request payout",
        type: "error",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] p-6">
        <GlobalLoader />
      </div>
    );
  }

  const d = data;

  return (
    <div className="min-h-screen bg-[var(--bg-main)] pb-24 md:pb-10">
      <div className="mx-auto w-full max-w-[1400px] space-y-4 px-3 py-4 md:space-y-5 md:px-6 md:py-6">
        {/* Welcome + IB Wallet */}
        <div className="grid gap-4 lg:grid-cols-[7fr_3fr]">
          {/* Welcome card */}
          <section className="relative overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-4 shadow-sm md:p-5">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[var(--primary)]/10 to-transparent" />
            <div className="relative">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Welcome back,
              </p>
              <h1 className="mt-0.5 text-xl font-bold text-[var(--text-main)] md:text-2xl">
                {user?.name || "IB Partner"}
              </h1>

              <div className="mt-4">
                <p className="text-xs font-semibold text-[var(--text-muted)]">
                  My Referral Link:
                </p>
                <div className="mt-1.5 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-main)] px-3 py-2.5">
                    <Link2 size={15} className="shrink-0 text-[var(--primary)]" />
                    <p className="truncate text-sm text-[var(--text-main)]">
                      {referralLink || "Generating link…"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                  type="button"
                  onClick={() => copyText(referralLink, "Referral link")}
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white hover:bg-[var(--primary-hover)]"
                >
                  <Copy size={14} />
                  Copy
                </button>
                <button
                  type="button"
                  onClick={() =>
                    copyText(data?.referralCode || "", "Referral code")
                  }
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] px-4 text-sm font-medium text-[var(--text-main)] hover:bg-[var(--bg-glass)]"
                >
                  <Link2 size={14} />
                  Code: {data?.referralCode || "—"}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 min-[360px]:grid-cols-3">
            <WelcomeStat
              label="Total Deposits"
              value={money(d?.totalDeposits ?? 0)}
              today={money(todayData?.totalDeposits ?? 0)}
            />
            <WelcomeStat
              label="Total Commission"
              value={money(ibComm?.totalEarned ?? 0)}
            />
            <WelcomeStat label="Total Lot" value={String(d?.totalLots ?? 0)} />
          </div>
        </div>
      </section>

          {/* IB Wallet card */}
          <section className="relative overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-4 shadow-sm md:p-5">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[var(--primary)]/10 to-transparent" />
            <div className="relative flex h-full flex-col">
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
                  <Wallet size={17} />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-[var(--text-main)]">IB Wallet</h2>
                  <p className="text-[11px] text-[var(--text-muted)]">Available IB Commission</p>
                </div>
              </div>

              <p className="mt-4 text-2xl font-bold text-[var(--text-main)] md:text-3xl">
                {money(ibComm?.available ?? 0)}
              </p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                ( {money(ibComm?.paidOut ?? 0)} withdrawn )
              </p>

              <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Available to withdraw
              </p>
              <p className="text-sm font-bold text-[var(--primary)]">
                {money(ibComm?.available ?? 0)}
              </p>

              <button
                type="button"
                onClick={() => router.push("/ib/withdraw")}
                className="mt-auto inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] text-sm font-bold text-white transition hover:bg-[var(--primary-hover)]"
              >
                <ArrowUpRight size={15} />
                Withdraw
              </button>
            </div>
          </section>
        </div>

        {/* Summary boxes */}
        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <SummaryBox
            title="Team Deposit/Withdraw"
            icon={<ArrowDownLeft size={16} />}
            value={money(
              (d?.totalDeposits ?? 0) + (d?.totalWithdrawals ?? 0),
            )}
            rows={[
              {
                label: "Deposit",
                value: String(d?.activityTotals?.deposits ?? 0),
              },
              {
                label: "Withdraw",
                value: String(d?.activityTotals?.withdrawals ?? 0),
              },
            ]}
          />
          <SummaryBox
            title="KYC Details"
            icon={<BadgeCheck size={16} />}
            value={String(d?.kycStats?.complete ?? 0)}
            valueLabel="Complete"
            rows={[
              {
                label: "Pending",
                value: String(d?.kycStats?.pending ?? 0),
                tone: "warning",
              },
              {
                label: "Complete",
                value: String(d?.kycStats?.complete ?? 0),
                tone: "success",
              },
            ]}
          />
          <SummaryBox
            title="Live Account"
            icon={<CreditCard size={16} />}
            value={String(d?.liveAccountStats?.complete ?? 0)}
            valueLabel="Complete"
            rows={[
              {
                label: "Complete",
                value: String(d?.liveAccountStats?.complete ?? 0),
                tone: "success",
              },
              {
                label: "Total",
                value: String(d?.liveAccountStats?.total ?? 0),
              },
            ]}
          />
          <SummaryBox
            title="IB Requests"
            icon={<UserPlus size={16} />}
            value={String(d?.ibRequestStats?.approved ?? 0)}
            valueLabel="Approved"
            rows={[
              {
                label: "Pending",
                value: String(d?.ibRequestStats?.pending ?? 0),
                tone: "warning",
              },
              {
                label: "Approved",
                value: String(d?.ibRequestStats?.approved ?? 0),
                tone: "success",
              },
            ]}
          />
        </section>

        {error ? (
          <div className="rounded-xl border border-[var(--error)]/30 bg-[var(--error)]/10 p-3 text-sm text-[var(--error)]">
            Failed to load IB dashboard.{" "}
            <button
              type="button"
              className="underline"
              onClick={() => refetch()}
            >
              Retry
            </button>
          </div>
        ) : null}


        {/* Activity columns — preview 2 each; View more opens full page */}
        <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <ActivityCard
            title="Recent Deposits"
            subtitle="Pending & Approved"
            icon={<ArrowDownLeft size={16} />}
            tone="success"
            empty="No deposits from your network yet."
            total={d?.activityTotals?.deposits ?? (d?.recentDeposits || []).length}
            items={(d?.recentDeposits || []).map((item) => ({
              id: item.id,
              title: item.name,
              email: item.email,
              meta: `${money(item.amount)} · ${item.status}`,
              time: timeAgo(item.createdAt),
            }))}
            onViewMore={() => router.push("/ib/deposit")}
          />
          <ActivityCard
            title="Recent Withdrawals"
            subtitle="Pending & Approved"
            icon={<ArrowUpRight size={16} />}
            tone="danger"
            empty="No withdrawals from your network yet."
            total={
              d?.activityTotals?.withdrawals ??
              (d?.recentWithdrawals || []).length
            }
            items={(d?.recentWithdrawals || []).map((item) => ({
              id: item.id,
              title: item.name,
              email: item.email,
              meta: `${money(item.amount)} · ${item.status}`,
              time: timeAgo(item.createdAt),
            }))}
            onViewMore={() => router.push("/ib/withdraw")}
          />
          <ActivityCard
            title="Commission Payouts"
            subtitle="You & Your Network"
            icon={<HandCoins size={16} />}
            tone="primary"
            empty="No payouts taken yet."
            total={d?.activityTotals?.payouts ?? (d?.recentPayouts || []).length}
            items={(d?.recentPayouts || []).map((item) => ({
              id: item.id,
              title: item.name,
              email: item.email,
              meta: `${money(item.amount)} · ${item.status}`,
              time: timeAgo(item.createdAt),
            }))}
            onViewMore={() => router.push("/ib/transfer-commission")}
          />
          <ActivityCard
            title="New Trading Accounts"
            subtitle="Entire Network"
            icon={<Plus size={16} />}
            tone="secondary"
            empty="No new accounts yet."
            total={
              d?.activityTotals?.accounts ?? (d?.recentAccounts || []).length
            }
            items={(d?.recentAccounts || []).map((item) => ({
              id: item.id,
              title: item.name,
              email: item.email,
              badge:
                item.status === "active" ? "Opened" : item.status || "Opened",
              meta: `TA#${item.accountNumber}`,
              time: timeAgo(item.createdAt),
            }))}
            onViewMore={() => router.push("/ib/live-account")}
          />
        </section>
      </div>

      {payoutOpen && (
        <div
          className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setPayoutOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold">Request Payout</h3>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Choose where the commission credit should go.
            </p>

            {/* destination toggle */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPayoutDestination("account")}
                className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                  payoutDestination === "account"
                    ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                    : "border-[var(--border-soft)] text-[var(--text-secondary)] hover:bg-[var(--bg-glass)]"
                }`}
              >
                Live Account (bonus credit)
              </button>
              <button
                type="button"
                onClick={() => setPayoutDestination("wallet")}
                className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                  payoutDestination === "wallet"
                    ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                    : "border-[var(--border-soft)] text-[var(--text-secondary)] hover:bg-[var(--bg-glass)]"
                }`}
              >
                Wallet
              </button>
            </div>

            <label className="mt-4 block text-xs font-medium text-[var(--text-muted)]">
              Eligible reward
            </label>
            <select
              value={selectedRewardId}
              onChange={(e) => setSelectedRewardId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--border-soft)] bg-[var(--bg-main)] px-3 py-2.5 text-sm outline-none focus:border-[var(--primary)]"
            >
              {eligibleRewards.map((r) => (
                <option key={r.rewardId} value={r.rewardId}>
                  {money(r.amount)} · {r.referredUser || r.referredUserEmail || r.rewardId}
                </option>
              ))}
            </select>

            {payoutDestination === "account" ? (
              <>
                <label className="mt-3 block text-xs font-medium text-[var(--text-muted)]">
                  Live account
                </label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[var(--border-soft)] bg-[var(--bg-main)] px-3 py-2.5 text-sm outline-none focus:border-[var(--primary)]"
                >
                  {liveAccounts.map((a: { _id: string; account_number?: string }) => (
                    <option key={a._id} value={a._id}>
                      {a.account_number || a._id}
                    </option>
                  ))}
                </select>

                {!liveAccounts.length ? (
                  <p className="mt-2 text-xs text-[var(--error)]">
                    You need an active live account to receive payout.
                  </p>
                ) : null}
              </>
            ) : (
              <p className="mt-3 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-glass)] p-3 text-xs text-[var(--text-muted)]">
                Credit will be added to your wallet as withdrawable balance.
                You can transfer it to a trading account anytime.
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPayoutOpen(false)}
                className="rounded-xl bg-[var(--bg-glass)] px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  requestReward.isPending ||
                  (payoutDestination === "account" && !liveAccounts.length)
                }
                onClick={submitPayout}
                className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {requestReward.isPending
                  ? "Crediting…"
                  : payoutDestination === "wallet"
                    ? "Credit to Wallet"
                    : "Credit as bonus"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}


function WelcomeStat({
  label,
  value,
  today,
}: {
  label: string;
  value: string;
  today?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--bg-main)] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-1 text-lg font-bold text-[var(--text-main)]">{value}</p>
      {today !== undefined ? (
        <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">( Today: {today} )</p>
      ) : null}
    </div>
  );
}

function SummaryBox({
  title,
  icon,
  value,
  valueLabel,
  rows,
}: {
  title: string;
  icon: React.ReactNode;
  value: string;
  valueLabel?: string;
  rows: { label: string; value: string; tone?: "success" | "warning" }[];
}) {
  return (
    <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-3.5 shadow-sm sm:p-4">
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--primary-soft)] text-[var(--primary)]">
          {icon}
        </span>
        <p className="truncate text-xs font-semibold text-[var(--text-main)]">{title}</p>
      </div>
      <p className="mt-3 text-xl font-bold text-[var(--text-main)] sm:text-2xl">{value}</p>
      {valueLabel ? (
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          {valueLabel}
        </p>
      ) : null}
      <div className="mt-2 space-y-1 border-t border-[var(--border-soft)] pt-2">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between text-xs">
            <span className="text-[var(--text-muted)]">{r.label}</span>
            <span
              className={
                r.tone === "success"
                  ? "font-bold text-[var(--success)]"
                  : r.tone === "warning"
                    ? "font-bold text-[var(--orange)]"
                    : "font-bold text-[var(--text-main)]"
              }
            >
              {r.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

type ActivityRow = {
  id: string;
  title: string;
  email?: string;
  meta?: string;
  badge?: string;
  time?: string;
};

function ActivityCard({
  title,
  subtitle,
  icon,
  tone,
  empty,
  items,
  total,
  onViewMore,
  previewLimit = 2,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  tone: "success" | "danger" | "primary" | "secondary";
  empty: string;
  items: ActivityRow[];
  total?: number;
  previewLimit?: number;
  onViewMore?: () => void;
}) {
  const toneClass =
    tone === "success"
      ? "bg-[var(--deposit-bg)] text-[var(--deposit-text)]"
      : tone === "danger"
        ? "bg-[var(--withdraw-bg)] text-[var(--withdraw-text)]"
        : tone === "secondary"
          ? "bg-[var(--transfer-bg)] text-[var(--secondary)]"
          : "bg-[var(--primary-soft)] text-[var(--primary)]";

  const preview = items.slice(0, previewLimit);
  const totalCount = Number(total ?? items.length) || 0;
  const hasMore = items.length > previewLimit || totalCount > previewLimit;

  return (
    <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2.5">
          <div
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${toneClass}`}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--text-main)]">
              {title}
            </p>
            <p className="text-[11px] text-[var(--text-muted)]">{subtitle}</p>
          </div>
        </div>
        <div className="shrink-0 rounded-lg border border-[var(--border-soft)] bg-[var(--bg-main)] px-2 py-1 text-center">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Total
          </p>
          <p className="text-sm font-bold text-[var(--text-main)]">
            {totalCount}
          </p>
        </div>
      </div>

      <div className="mt-3 min-h-[120px]">
        {!items.length ? (
          <div className="flex min-h-[120px] items-center justify-center rounded-xl border border-dashed border-[var(--border-soft)] bg-[var(--bg-main)] px-3 text-center text-xs text-[var(--text-muted)]">
            {empty}
          </div>
        ) : (
          <div className="space-y-2">
            {preview.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-[var(--border-soft)] bg-[var(--bg-main)] px-3 py-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--text-main)]">
                      {item.title}
                    </p>
                    {item.email ? (
                      <p className="truncate text-[11px] text-[var(--text-muted)]">
                        {item.email}
                      </p>
                    ) : null}
                  </div>
                  {item.badge ? (
                    <span className="rounded-full bg-[var(--transfer-bg)] px-2 py-0.5 text-[10px] font-semibold text-[var(--secondary)]">
                      {item.badge}
                    </span>
                  ) : null}
                </div>
                {item.meta ? (
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                    {item.meta}
                  </p>
                ) : null}
                {item.time ? (
                  <p className="mt-1 text-[10px] text-[var(--text-placeholder)]">
                    {item.time}
                  </p>
                ) : null}
              </div>
            ))}

            {hasMore && onViewMore ? (
              <button
                type="button"
                onClick={onViewMore}
                className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--bg-glass)] py-2 text-xs font-semibold text-[var(--primary)] transition hover:border-[var(--primary)]"
              >
                View more
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
