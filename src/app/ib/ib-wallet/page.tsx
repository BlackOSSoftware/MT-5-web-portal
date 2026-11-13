"use client";

import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  BadgeCheck,
  Banknote,
  CalendarClock,
  Coins,
  Eye,
  EyeOff,
  HandCoins,
  History,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";
import GlobalLoader from "@/app/components/ui/GlobalLoader";
import { Toast } from "@/app/components/ui/Toast";
import { useIbCommissionWithdraw, useMyIbCommissionSummary } from "@/hooks/useReferral";
import { useWallet, useWalletWithdrawals } from "@/hooks/useWallet";
import { useWithdrawMethods } from "@/hooks/useWithdrawMethods";
import { useUserMe } from "@/hooks/useUser";
import {
  PageHeader,
  Card,
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

const MIN_WITHDRAW = 1;
const MAX_WITHDRAW = 50000;

type StatusFilter = "ALL" | "PENDING" | "APPROVED" | "REJECTED";

function statusGroup(status?: string): Exclude<StatusFilter, "ALL"> {
  const s = String(status || "").toUpperCase();
  if (["APPROVED", "COMPLETED"].includes(s)) return "APPROVED";
  if (["REJECTED", "FAILED"].includes(s)) return "REJECTED";
  return "PENDING";
}

export default function IbWalletPage() {
  const { data: ibComm, isLoading: commLoading } = useMyIbCommissionSummary();
  const { data: wallet, isLoading: walletLoading } = useWallet();
  const { data: withdrawalsData } = useWalletWithdrawals(1, 50);
  const { data: methodsData, isLoading: methodsLoading } = useWithdrawMethods();
  const { data: user } = useUserMe();
  const withdraw = useIbCommissionWithdraw();

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("");
  const [payout, setPayout] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const [showBalance, setShowBalance] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const methods = useMemo(() => methodsData?.enabledMethods ?? [], [methodsData]);
  const selectedMethod = useMemo(
    () => methods.find((m: any) => m.code === method) || null,
    [methods, method],
  );

  const withdrawals = useMemo(() => {
    const list = Array.isArray(withdrawalsData?.data) ? withdrawalsData.data : [];
    return list as any[];
  }, [withdrawalsData]);

  const filteredWithdrawals = useMemo(
    () =>
      filter === "ALL"
        ? withdrawals
        : withdrawals.filter((w) => statusGroup(w.status) === filter),
    [withdrawals, filter],
  );

  const availableBalance = Number(ibComm?.available ?? 0);
  const kycVerified = String(user?.kycStatus || "").toUpperCase() === "VERIFIED";
  const hasPending = Number(wallet?.pendingWithdrawals ?? 0) > 0;

  const methodLabel = (code?: string) =>
    methods.find((m: any) => m.code === code)?.label || code || "—";

  const payoutSummary = (p: any) => {
    if (!p || typeof p !== "object") return "—";
    const vals = Object.values(p).filter(
      (v) => typeof v === "string" && v.trim().length > 0,
    ) as string[];
    return vals.length ? vals.join(" · ") : "—";
  };

  const handleWithdraw = async () => {
    const amt = Number(amount);
    if (!amt || amt < MIN_WITHDRAW) {
      setToast({ message: `Minimum withdrawal is $${MIN_WITHDRAW}`, type: "error" });
      return;
    }
    if (amt > availableBalance) {
      setToast({ message: "Amount exceeds available balance", type: "error" });
      return;
    }
    if (!method) {
      setToast({ message: "Select a withdrawal method", type: "error" });
      return;
    }
    const missing = (selectedMethod?.fields || []).filter(
      (f: any) => f.required && !String(payout[f.key] || "").trim(),
    );
    if (missing.length) {
      setToast({ message: `Fill required field: ${missing[0].label}`, type: "error" });
      return;
    }
    try {
      await withdraw.mutateAsync({ amount: amt, method, payout });
      setAmount("");
      setPayout({});
      setToast({ message: "Withdrawal request submitted successfully", type: "success" });
    } catch (err: any) {
      setToast({
        message: err?.response?.data?.message || "Withdrawal request failed",
        type: "error",
      });
    }
  };

  if (commLoading || walletLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <GlobalLoader />
      </div>
    );
  }

  const totalCommission = Number(ibComm?.totalEarned ?? 0);
  const generated = Number(ibComm?.totalEarned ?? 0);
  const available = Number(ibComm?.available ?? 0);
  const paidOut = Number(ibComm?.paidOut ?? 0);

  const stats = [
    { icon: Zap, label: "Generated Commission", value: money(generated), hint: "All time generated", tone: "text-amber-500", bg: "bg-amber-500/10" },
    { icon: HandCoins, label: "Available Commission", value: money(available), hint: "Ready to withdraw", tone: "text-emerald-500", bg: "bg-emerald-500/10" },
    { icon: ArrowUpRight, label: "Withdrawn Commission", value: money(paidOut), hint: "Already paid out", tone: "text-sky-500", bg: "bg-sky-500/10" },
    { icon: Banknote, label: "Min Transfer", value: money(MIN_WITHDRAW), hint: "Per transaction", tone: "text-violet-500", bg: "bg-violet-500/10" },
  ];

  return (
    <IbPageShell>
      <PageHeader
        icon={Wallet}
        title="IB Wallet"
        subtitle="Track your commission earnings and withdraw your balance securely."
      />

      {/* Premium balance hero */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-gradient-to-br from-[#0b1220] via-[#101a30] to-[#0d1b2e] p-6 text-white shadow-[0_20px_60px_-20px_rgba(0,0,0,0.55)] sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[var(--primary)]/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.06),transparent_55%)]" />

        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15 backdrop-blur">
                <Wallet size={17} className="text-white" />
              </span>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/60">
                Available Balance
              </p>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <p className="text-4xl font-extrabold tracking-tight sm:text-5xl">
                {showBalance ? money(availableBalance) : "••••••"}
              </p>
              <button
                type="button"
                onClick={() => setShowBalance((v) => !v)}
                className="rounded-lg bg-white/10 p-2 text-white/70 transition hover:bg-white/20 hover:text-white"
                title={showBalance ? "Hide balance" : "Show balance"}
              >
                {showBalance ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="mt-2 text-xs text-white/55">
              Instant withdrawals · KYC verified partners only
            </p>
          </div>

          <div className="flex flex-col items-end gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3 text-right backdrop-blur">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/50">
                Total Commission
              </p>
              <p className="mt-0.5 text-xl font-extrabold">{money(totalCommission)}</p>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-[11px] font-bold text-emerald-300">
              <TrendingUp size={12} />
              Lifetime earnings
            </div>
          </div>
        </div>

        <div className="relative mt-6 grid grid-cols-2 gap-3 border-t border-white/10 pt-5 sm:grid-cols-4">
          {[
            { label: "Generated", value: money(generated), icon: Zap },
            { label: "Available", value: money(available), icon: HandCoins },
            { label: "Withdrawn", value: money(paidOut), icon: ArrowUpRight },
            { label: "Pending", value: String(wallet?.pendingWithdrawals ?? 0), icon: CalendarClock },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white/80">
                <s.icon size={14} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-white/45">
                  {s.label}
                </p>
                <p className="truncate text-sm font-bold">{s.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Commission breakdown cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <div
            key={s.label}
            className="group rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-4 transition hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-12px_rgba(0,0,0,0.25)]"
          >
            <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${s.bg}`}>
              <s.icon size={16} className={s.tone} />
            </span>
            <p className="mt-3 text-lg font-extrabold text-[var(--text-main)]">{s.value}</p>
            <p className="mt-0.5 text-[11px] font-semibold text-[var(--text-secondary)]">{s.label}</p>
            <p className="text-[10px] text-[var(--text-muted)]">{s.hint}</p>
          </div>
        ))}
      </div>

      {/* Withdraw form */}
      <Card className="space-y-5 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]">
              <Coins size={17} />
            </span>
            <div>
              <h2 className="text-sm font-bold text-[var(--text-main)]">Withdraw Funds</h2>
              <p className="text-[11px] text-[var(--text-muted)]">
                Min {money(MIN_WITHDRAW)} · Max {money(MAX_WITHDRAW)} per request
              </p>
            </div>
          </div>
          {hasPending ? <Badge tone="blue">Withdrawal pending</Badge> : null}
        </div>

        {!kycVerified ? (
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-600 dark:text-amber-400">
            <ShieldAlert size={15} className="mt-0.5 shrink-0" />
            <p>
              KYC verification is required before you can withdraw. Please complete
              your KYC from the client dashboard.
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.07] px-3.5 py-2.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <ShieldCheck size={14} />
            KYC verified — withdrawals enabled
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wide text-[var(--text-secondary)]">
              Amount (USD)
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--text-muted)]">
                $
              </span>
              <input
                type="number"
                min={MIN_WITHDRAW}
                max={MAX_WITHDRAW}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className={`${inputCls} pl-8 text-base font-bold`}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setAmount(String(availableBalance))}
                className="rounded-lg bg-[var(--primary)]/10 px-3 py-1.5 text-[11px] font-bold text-[var(--primary)] transition hover:bg-[var(--primary)]/20"
              >
                Max: {money(availableBalance)}
              </button>
              {[25, 50, 100].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() =>
                    setAmount(String(Math.min(availableBalance, (availableBalance * pct) / 100)))
                  }
                  className="rounded-lg border border-[var(--border-soft)] bg-[var(--bg-glass)] px-2.5 py-1.5 text-[11px] font-bold text-[var(--text-secondary)] transition hover:bg-[var(--bg-main)]"
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wide text-[var(--text-secondary)]">
              Withdrawal Method
            </label>
            {methodsLoading ? (
              <p className="text-xs text-[var(--text-muted)]">Loading methods…</p>
            ) : methods.length === 0 ? (
              <p className="rounded-xl border border-[var(--border-soft)] bg-[var(--bg-glass)] p-3 text-xs text-[var(--text-muted)]">
                No withdrawal methods enabled yet. Please contact support.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {methods.map((m: any) => (
                  <button
                    key={m.code}
                    type="button"
                    onClick={() => {
                      setMethod(m.code);
                      setPayout({});
                    }}
                    className={`rounded-xl border px-3.5 py-2.5 text-xs font-bold transition ${
                      method === m.code
                        ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)] shadow-[0_0_0_1px_var(--primary)]"
                        : "border-[var(--border-soft)] bg-[var(--bg-main)] text-[var(--text-secondary)] hover:border-[var(--primary)]/40 hover:bg-[var(--bg-glass)]"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {selectedMethod?.fields?.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {selectedMethod.fields.map((field: any) => (
              <div key={field.key} className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">
                  {field.label}
                  {field.required ? " *" : " (optional)"}
                </label>
                <input
                  type="text"
                  value={payout[field.key] || ""}
                  onChange={(e) =>
                    setPayout((prev) => ({ ...prev, [field.key]: e.target.value }))
                  }
                  className={inputCls}
                />
              </div>
            ))}
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleWithdraw}
          disabled={
            withdraw.isPending ||
            !kycVerified ||
            hasPending ||
            !method ||
            methods.length === 0
          }
          className={`${btnPrimary} w-full py-3.5 text-base font-bold`}
        >
          {withdraw.isPending
            ? "Submitting..."
            : hasPending
              ? "Withdrawal Already Pending"
              : !kycVerified
                ? "KYC Required"
                : "Request Withdrawal"}
        </button>
      </Card>

      {/* Withdrawal history */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-soft)] px-4 py-3.5">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]">
              <History size={15} />
            </span>
            <h2 className="text-sm font-bold text-[var(--text-main)]">Withdrawal History</h2>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                { key: "ALL", label: "All" },
                { key: "PENDING", label: "Pending" },
                { key: "APPROVED", label: "Approved" },
                { key: "REJECTED", label: "Rejected" },
              ] as { key: StatusFilter; label: string }[]
            ).map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition ${
                  filter === f.key
                    ? "bg-[var(--primary)] text-white"
                    : "bg-[var(--bg-glass)] text-[var(--text-secondary)] hover:bg-[var(--bg-main)]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {filteredWithdrawals.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="No withdrawals found"
            subtitle="Your wallet withdrawal requests will appear here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border-soft)] text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Method</th>
                  <th className="px-4 py-3 font-semibold">Payout Details</th>
                  <th className="px-4 py-3 text-right font-semibold">Amount</th>
                  <th className="px-4 py-3 text-right font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {filteredWithdrawals.map((w) => (
                  <tr key={w._id} className="transition hover:bg-[var(--bg-glass)]/60">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-[var(--text-secondary)]">
                      {w.createdAt
                        ? new Date(w.createdAt).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--text-main)]">
                        <BadgeCheck size={14} className="text-[var(--primary)]" />
                        {methodLabel(w.method)}
                      </span>
                    </td>
                    <td className="max-w-[220px] truncate px-4 py-3 text-xs text-[var(--text-secondary)]">
                      {payoutSummary(w.payout)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-bold text-[var(--text-main)]">
                      {money(Number(w.amount))}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Badge tone={statusTone(w.status)}>{w.status || "PENDING"}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </IbPageShell>
  );
}
