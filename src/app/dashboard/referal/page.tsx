"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useUserMe } from "@/hooks/useUser";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Copy,
  Coins,
  CreditCard,
  HandCoins,
  Hourglass,
  Link2,
  MousePointerClick,
  Network,
  Plus,
  Send,
  UserPlus,
  Users,
  Wallet,
  X,
} from "lucide-react";
import GlobalLoader from "@/app/components/ui/GlobalLoader";
import { Toast } from "@/app/components/ui/Toast";
import {
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

const SCOPES: { key: ReferralScope; label: string }[] = [
  { key: "total", label: "Total" },
  { key: "network", label: "Network" },
  { key: "direct", label: "Direct" },
];

const PERIODS: { key: ReferralPeriod; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7D" },
  { key: "30d", label: "30D" },
  { key: "mtd", label: "MTD" },
  { key: "all", label: "All" },
];

/** IB dashboard is only reachable when the admin has enabled it for this client (menu or direct URL). */
export default function ReferralPage() {
  const router = useRouter();
  // Always re-check on open so a fresh admin change applies without a full reload.
  const { data: me, isLoading, isFetching, isError } = useUserMe({ staleTime: 0 });
  const allowed = me?.ibDashboardAccess === true;
  const blocked = !isLoading && !isFetching && (isError || !allowed);

  useEffect(() => {
    if (blocked) router.replace("/dashboard");
  }, [blocked, router]);

  if (!allowed) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <GlobalLoader />
      </div>
    );
  }
  return <ReferralDashboardContent />;
}

function ReferralDashboardContent() {
  const [scope, setScope] = useState<ReferralScope>("total");
  const [period, setPeriod] = useState<ReferralPeriod>("7d");
  const [toast, setToast] = useState<ToastState>(null);
  const [payoutOpen, setPayoutOpen] = useState(false);
  const [selectedRewardId, setSelectedRewardId] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [payoutDestination, setPayoutDestination] = useState<"account" | "wallet">("account");
  const [activityModal, setActivityModal] = useState<{
    title: string;
    subtitle: string;
    total: number;
    items: {
      id: string;
      title: string;
      email?: string;
      meta?: string;
      badge?: string;
      time?: string;
    }[];
  } | null>(null);

  const { data, isLoading, error, refetch, isFetching } = useReferralDashboard(
    scope,
    period,
  );
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

  const periodLabel =
    period === "today"
      ? "today"
      : period === "7d"
        ? "7 days"
        : period === "30d"
          ? "30 days"
          : period === "mtd"
            ? "this month"
            : "all time";

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
        {/* Header */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-main)]">
              Dashboard
            </h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Your IB performance overview
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <PillGroup>
              {SCOPES.map((s) => (
                <Pill
                  key={s.key}
                  active={scope === s.key}
                  onClick={() => setScope(s.key)}
                >
                  {s.label}
                </Pill>
              ))}
            </PillGroup>
            <PillGroup>
              {PERIODS.map((p) => (
                <Pill
                  key={p.key}
                  active={period === p.key}
                  onClick={() => setPeriod(p.key)}
                >
                  {p.label}
                </Pill>
              ))}
            </PillGroup>
          </div>
        </div>

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

        {/* Referral link */}
        <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-4 shadow-sm md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-[var(--text-main)]">
              My referral link
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              share this to bring in clients
            </p>
          </div>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
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

          <div className="mt-3 flex items-center justify-end gap-1.5 text-xs text-[var(--text-muted)]">
            <Users size={12} />
            {data?.linkUsedCount ?? 0} used
            {isFetching ? <span className="ml-2 opacity-60">Updating…</span> : null}
          </div>
        </section>

        {/* Stats grid */}
        <section className="grid grid-cols-2 gap-2 min-[321px]:gap-3 xl:grid-cols-4">
          <MetricCard
            icon={<Users size={18} />}
            title="Total Clients"
            value={String(d?.totalClients ?? 0)}
            subtitle={`${d?.newClients ?? 0} new in ${periodLabel}`}
          />
          <MetricCard
            icon={<CheckCircle2 size={18} />}
            title="Active Traders"
            value={String(d?.activeTraders ?? 0)}
            subtitle={`traded in ${periodLabel}`}
          />
          <MetricCard
            icon={<Network size={18} />}
            title="Sub-IBs"
            value={String(d?.subIbs ?? 0)}
            subtitle={`${d?.directSubIbs ?? 0} direct Sub-IBs`}
          />
          <MetricCard
            icon={<ArrowDownLeft size={18} />}
            title="Total Deposits"
            value={money(d?.totalDeposits ?? 0)}
            subtitle={`${money(d?.netDeposits ?? 0)} net`}
            tone="success"
          />
          <MetricCard
            icon={<Wallet size={18} />}
            title="Client Equity"
            value={money(d?.clientEquity ?? 0)}
            subtitle="Current client equity"
          />
          <MetricCard
            icon={<BarChart3 size={18} />}
            title="Total Lots"
            value={String(d?.totalLots ?? 0)}
            subtitle={`${d?.tradeCount ?? 0} trades`}
          />
          <MetricCard
            icon={<Coins size={18} />}
            title={`Earnings in ${periodLabel}`}
            value={money(d?.periodEarnings ?? 0)}
            subtitle="Commission accrued"
          />
          <MetricCard
            icon={<ArrowUpRight size={18} />}
            title="Total Withdrawals"
            value={money(d?.totalWithdrawals ?? 0)}
            subtitle={`in ${periodLabel}`}
            tone="danger"
          />
        </section>

        {/* Commission summary */}
        <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-4 shadow-sm md:p-5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-main)]">
                Commission Summary
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                USD · lifetime unless stated
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 min-[321px]:gap-3 xl:grid-cols-4">
            <CommissionCard
              label="Total Earned"
              value={money(d?.commission?.totalEarned ?? 0)}
              icon={<Wallet size={16} />}
              color="var(--secondary)"
            />
            <CommissionCard
              label="Paid Out"
              value={money(d?.commission?.paidOut ?? 0)}
              icon={<Send size={16} />}
              color="var(--success)"
            />
            <CommissionCard
              label="Pending"
              value={money(d?.commission?.pending ?? 0)}
              icon={<Hourglass size={16} />}
              color="var(--orange)"
            />
            <CommissionCard
              label="Available"
              value={money(d?.commission?.available ?? 0)}
              icon={<HandCoins size={16} />}
              color="#0d9488"
              action={
                <button
                  type="button"
                  onClick={openPayout}
                  className="mt-3 inline-flex text-sm font-semibold text-[var(--primary)] hover:underline"
                >
                  Request Payout →
                </button>
              }
            />
          </div>
        </section>

        {/* Client funnel */}
        <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-4 shadow-sm md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-[var(--text-main)]">
              Client Funnel
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              from your referral links
            </p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
            <FunnelItem
              icon={<MousePointerClick size={16} />}
              label="Link Clicks"
              value={d?.funnel?.linkClicks ?? 0}
            />
            <FunnelItem
              icon={<Users size={16} />}
              label="Unique Visitors"
              value={d?.funnel?.uniqueVisitors ?? 0}
            />
            <FunnelItem
              icon={<UserPlus size={16} />}
              label="Signed Up"
              value={d?.funnel?.signedUp ?? 0}
            />
            <FunnelItem
              icon={<CreditCard size={16} />}
              label="Opened Account"
              value={d?.funnel?.openedAccount ?? 0}
            />
            <FunnelItem
              icon={<HandCoins size={16} />}
              label="Funded Accounts"
              value={d?.funnel?.fundedAccounts ?? 0}
            />
          </div>
        </section>

        {/* Activity columns — preview 2 each; View more opens full list */}
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
            onViewMore={(payload) => setActivityModal(payload)}
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
            onViewMore={(payload) => setActivityModal(payload)}
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
            onViewMore={(payload) => setActivityModal(payload)}
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
            onViewMore={(payload) => setActivityModal(payload)}
          />
        </section>
      </div>

      {activityModal && (
        <div
          className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setActivityModal(null)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-card)] shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-[var(--border-soft)] px-5 py-4">
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-main)]">
                  {activityModal.title}
                </h3>
                <p className="mt-0.5 text-sm text-[var(--text-muted)]">
                  {activityModal.subtitle}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-lg border border-[var(--border-soft)] bg-[var(--bg-main)] px-2.5 py-1 text-xs font-semibold text-[var(--text-main)]">
                  Total {activityModal.total}
                </span>
                <button
                  type="button"
                  onClick={() => setActivityModal(null)}
                  className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--bg-glass)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto px-5 py-4">
              {!activityModal.items.length ? (
                <p className="py-8 text-center text-sm text-[var(--text-muted)]">
                  No records found.
                </p>
              ) : (
                <div className="space-y-2">
                  {activityModal.items.map((item) => (
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
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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

function PillGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-1">
      {children}
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
        active
          ? "bg-[var(--primary)] text-white"
          : "text-[var(--text-secondary)] hover:bg-[var(--bg-glass)]"
      }`}
    >
      {children}
    </button>
  );
}

function MetricCard({
  icon,
  title,
  value,
  subtitle,
  tone = "primary",
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle: string;
  tone?: "primary" | "success" | "danger";
}) {
  const iconClass =
    tone === "success"
      ? "bg-[var(--deposit-bg)] text-[var(--deposit-text)]"
      : tone === "danger"
        ? "bg-[var(--withdraw-bg)] text-[var(--withdraw-text)]"
        : "bg-[var(--primary-soft)] text-[var(--primary)]";

  return (
    <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-2.5 shadow-sm sm:p-4">
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl sm:h-10 sm:w-10 ${iconClass}`}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1 text-right">
          <p className="truncate text-[10px] text-[var(--text-muted)] sm:text-xs">
            {title}
          </p>
          <p className="mt-0.5 text-base font-bold text-[var(--text-main)] sm:text-xl">
            {value}
          </p>
          <p className="mt-0.5 truncate text-[10px] text-[var(--text-muted)] sm:text-[11px]">
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  );
}

function CommissionCard({
  label,
  value,
  icon,
  color,
  action,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--bg-main)] p-4">
      <div className="flex items-center gap-2">
        <span
          className="grid h-8 w-8 place-items-center rounded-lg text-white"
          style={{ background: color }}
        >
          {icon}
        </span>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          {label}
        </p>
      </div>
      <p className="mt-3 text-2xl font-bold text-[var(--text-main)]">{value}</p>
      {action}
    </div>
  );
}

function FunnelItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--bg-main)] p-3 text-center">
      <div className="mx-auto grid h-9 w-9 place-items-center rounded-lg bg-[var(--primary-soft)] text-[var(--primary)]">
        {icon}
      </div>
      <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold text-[var(--text-main)]">{value}</p>
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
  onViewMore?: (payload: {
    title: string;
    subtitle: string;
    total: number;
    items: ActivityRow[];
  }) => void;
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

            {hasMore ? (
              <button
                type="button"
                onClick={() =>
                  onViewMore?.({
                    title,
                    subtitle,
                    total: totalCount,
                    items,
                  })
                }
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
