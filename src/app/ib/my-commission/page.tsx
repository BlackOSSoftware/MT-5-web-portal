"use client";

import { useMemo, useState } from "react";
import {
  HandCoins,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Wallet,
  Landmark,
  Receipt,
} from "lucide-react";
import {
  useReferralDashboard,
  useReferralRewards,
  useRequestReferralReward,
} from "@/hooks/useReferral";
import { useMyAccounts } from "@/hooks/useMyAccounts";
import { Toast } from "@/app/components/ui/Toast";
import GlobalLoader from "@/app/components/ui/GlobalLoader";
import {
  PageHeader,
  Card,
  StatCard,
  EmptyState,
  Badge,
  statusTone,
  inputCls,
  btnPrimary,
  IbPageShell,
} from "../components/ui";

function money(value: number) {
  return `$${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

type Tab = "earnings" | "payout";

export default function MyCommissionPage() {
  const [tab, setTab] = useState<Tab>("earnings");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const { data: dash, isLoading: dashLoading } = useReferralDashboard("total", "30d");
  const { data: rewardsData, isLoading: rewardsLoading } = useReferralRewards();
  const { data: accountsData } = useMyAccounts();
  const requestPayout = useRequestReferralReward();

  const [payoutRewardId, setPayoutRewardId] = useState("");
  const [payoutAccountId, setPayoutAccountId] = useState("");
  const [payoutDestination, setPayoutDestination] = useState<"account" | "wallet">("wallet");

  const earnings = dash?.commission;
  const rewards = useMemo(() => {
    const list = Array.isArray(rewardsData) ? rewardsData : [];
    return list as any[];
  }, [rewardsData]);

  const accounts = useMemo(() => {
    const list = Array.isArray(accountsData) ? accountsData : [];
    return list.map((a: any) => ({
      id: String(a._id || ""),
      label: `${a.account_number || "Account"} · ${a.currency || "USD"}`,
    }));
  }, [accountsData]);

  // Backend payout requires status ELIGIBLE; APPROVED = already paid out.
  const payoutable = rewards.filter((r) =>
    ["ELIGIBLE", "eligible"].includes(String(r.status || "")),
  );
  const payoutHistory = rewards.filter((r) =>
    ["REQUESTED", "APPROVED", "REJECTED", "requested", "approved", "rejected"].includes(
      String(r.status || ""),
    ),
  );

  const handlePayout = async () => {
    if (!payoutRewardId) {
      setToast({ message: "Select a reward to pay out", type: "error" });
      return;
    }
    try {
      await requestPayout.mutateAsync({
        rewardId: payoutRewardId,
        accountId: payoutDestination === "account" ? payoutAccountId || undefined : undefined,
        destination: payoutDestination,
      });
      setPayoutRewardId("");
      setPayoutAccountId("");
      setToast({ message: "Payout request submitted", type: "success" });
    } catch (err: any) {
      setToast({
        message: err?.response?.data?.message || "Payout request failed",
        type: "error",
      });
    }
  };

  if (dashLoading && rewardsLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <GlobalLoader />
      </div>
    );
  }

  return (
    <IbPageShell
      tips={[
        "Eligible rewards can be paid out anytime.",
        "Payouts can go to your wallet or a trading account.",
        "Check payout history to track your payments.",
        "Your commission grows with your clients' trading volume.",
      ]}
    >
      <PageHeader
        icon={HandCoins}
        title="My Commission"
        subtitle="Commission analysis, earnings history and payout requests."
      />

      {/* Analysis cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={HandCoins}
          label="Total Earned"
          value={money(earnings?.totalEarned ?? 0)}
          tone="primary"
        />
        <StatCard
          icon={Clock}
          label="Pending"
          value={money(earnings?.pending ?? 0)}
          tone="amber"
        />
        <StatCard
          icon={CheckCircle2}
          label="Paid Out"
          value={money(earnings?.paidOut ?? 0)}
          tone="green"
        />
        <StatCard
          icon={TrendingUp}
          label="Available"
          value={money(earnings?.available ?? 0)}
          hint="Ready to request"
          tone="blue"
        />
      </div>

      {/* Tabs */}
      <Card className="p-1.5">
        <div className="grid grid-cols-2 gap-1.5">
          {(
            [
              { key: "earnings", label: "Earnings", icon: Receipt },
              { key: "payout", label: "Payout", icon: Wallet },
            ] as { key: Tab; label: string; icon: any }[]
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition ${
                tab === t.key
                  ? "bg-[var(--primary)] text-white shadow-[0_8px_20px_-8px_var(--primary)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-glass)]"
              }`}
            >
              <t.icon size={15} />
              {t.label}
            </button>
          ))}
        </div>
      </Card>

      {tab === "earnings" ? (
        <Card className="overflow-hidden">
          {rewardsLoading ? (
            <div className="flex min-h-[30vh] items-center justify-center">
              <GlobalLoader />
            </div>
          ) : rewards.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No commission earnings yet"
              subtitle="Commission from your clients' trading activity will appear here."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-soft)] text-left text-[11px] uppercase tracking-wide text-[var(--text-secondary)]">
                    <th className="px-4 py-3">Client</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-soft)]">
                  {rewards.map((r: any) => (
                    <tr key={r.rewardId} className="text-[var(--text-main)]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/12 text-xs font-bold text-[var(--primary)]">
                            {String(r.referredUser || "C").trim().charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium">{r.referredUser || "—"}</p>
                            {r.referredUserEmail ? (
                              <p className="truncate text-[11px] text-[var(--text-secondary)]">
                                {r.referredUserEmail}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">
                        {r.raw?.rewardType || r.raw?.reward_type || "Commission"}
                      </td>
                      <td className="px-4 py-3 font-bold">{money(Number(r.amount))}</td>
                      <td className="px-4 py-3">
                        <Badge tone={statusTone(r.status)}>{r.status || "EARNED"}</Badge>
                      </td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">
                        {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-5">
          {/* Payout request form */}
          <Card className="space-y-4 p-4 sm:p-5 lg:col-span-2">
            <div className="flex items-center gap-2">
              <Wallet size={16} className="text-[var(--primary)]" />
              <h2 className="text-sm font-bold text-[var(--text-main)]">Request Payout</h2>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-secondary)]">
                Reward
              </label>
              <select
                value={payoutRewardId}
                onChange={(e) => setPayoutRewardId(e.target.value)}
                className={inputCls}
              >
                <option value="">Select reward</option>
                {payoutable.map((r: any) => (
                  <option key={r.rewardId} value={r.rewardId}>
                    {money(Number(r.amount))} · {r.referredUser || "Client"}
                  </option>
                ))}
              </select>
              {payoutable.length === 0 && (
                <p className="text-[11px] text-[var(--text-placeholder)]">
                  No eligible rewards available for payout yet.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-secondary)]">
                Destination
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { key: "wallet", label: "Wallet", icon: Wallet },
                    { key: "account", label: "Trading Account", icon: Landmark },
                  ] as const
                ).map((d) => (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => setPayoutDestination(d.key)}
                    className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition ${
                      payoutDestination === d.key
                        ? "bg-[var(--primary)] text-white"
                        : "bg-[var(--bg-glass)] text-[var(--text-secondary)] hover:text-[var(--text-main)]"
                    }`}
                  >
                    <d.icon size={13} />
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {payoutDestination === "account" && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">
                  Trading Account
                </label>
                <select
                  value={payoutAccountId}
                  onChange={(e) => setPayoutAccountId(e.target.value)}
                  className={inputCls}
                >
                  <option value="">Select account</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="button"
              disabled={requestPayout.isPending || payoutable.length === 0}
              onClick={handlePayout}
              className={`${btnPrimary} w-full py-3`}
            >
              {requestPayout.isPending ? "Submitting..." : "Submit Payout Request"}
            </button>
          </Card>

          {/* Payout history */}
          <Card className="overflow-hidden lg:col-span-3">
            <div className="border-b border-[var(--border-soft)] px-4 py-3">
              <h2 className="text-sm font-bold text-[var(--text-main)]">Payout History</h2>
            </div>
            {payoutHistory.length === 0 ? (
              <EmptyState
                icon={Wallet}
                title="No payout requests yet"
                subtitle="Your payout requests and their status will appear here."
              />
            ) : (
              <ul className="divide-y divide-[var(--border-soft)]">
                {payoutHistory.map((r: any) => (
                  <li key={r.rewardId} className="flex items-center gap-3 px-4 py-3">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                        String(r.status).toUpperCase() === "REJECTED"
                          ? "bg-red-500/12 text-red-500"
                          : "bg-emerald-500/12 text-emerald-500"
                      }`}
                    >
                      {String(r.status).toUpperCase() === "REJECTED" ? (
                        <XCircle size={16} />
                      ) : (
                        <CheckCircle2 size={16} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[var(--text-main)]">
                        {money(Number(r.amount))}
                      </p>
                      <p className="truncate text-xs text-[var(--text-secondary)]">
                        {r.referredUser || r.referredUserEmail || "Client"} ·{" "}
                        {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ""}
                      </p>
                    </div>
                    <Badge tone={statusTone(r.status)}>{r.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </IbPageShell>
  );
}
