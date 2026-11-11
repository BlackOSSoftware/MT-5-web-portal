"use client";

import { useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Landmark,
  Search,
  Wallet,
  X,
} from "lucide-react";
import GlobalLoader from "@/app/components/ui/GlobalLoader";
import { useNetworkAccounts } from "@/hooks/useReferral";
import type { NetworkAccountItem } from "@/services/referral.service";
import {
  PageHeader,
  Card,
  StatCard,
  EmptyState,
  Badge,
  inputCls,
  IbPageShell,
} from "../components/ui";

function money(value: number, currency = "USD") {
  return `${currency} ${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default function IbLiveAccountPage() {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<NetworkAccountItem | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const params = useMemo(
    () => ({ q: debouncedQ || undefined, page, limit: 20 }),
    [debouncedQ, page],
  );

  const { data, isLoading } = useNetworkAccounts(params);
  const items = data?.items ?? [];
  const totalBalance = data?.totalBalance ?? 0;
  const pagination = data?.pagination;

  const onSearchChange = (value: string) => {
    setQ(value);
    setPage(1);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedQ(value.trim()), 400);
  };

  return (
    <IbPageShell>
      <PageHeader
        icon={Landmark}
        title="Live Account"
        subtitle="Live trading accounts of all users in your referral network."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StatCard
          icon={Wallet}
          label="Total Account Balance"
          value={money(totalBalance)}
          hint="Combined live account balances"
          tone="primary"
        />
        <StatCard
          icon={Landmark}
          label="Live Accounts"
          value={String(pagination?.total ?? 0)}
          hint="Accounts in your network"
          tone="blue"
        />
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-soft)] px-4 py-3">
          <h2 className="text-sm font-bold text-[var(--text-main)]">Live Accounts</h2>
          <div className="relative w-full sm:w-64">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-placeholder)]"
            />
            <input
              type="text"
              value={q}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Account number or plan name"
              className={`${inputCls} pl-9`}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex min-h-[200px] items-center justify-center">
            <GlobalLoader />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Landmark}
            title="No live accounts found"
            subtitle="Live accounts created by your network will appear here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border-soft)] text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                  <th className="px-4 py-3 font-semibold">No.</th>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Account Number</th>
                  <th className="px-4 py-3 font-semibold">Account Type</th>
                  <th className="px-4 py-3 font-semibold">Leverage</th>
                  <th className="px-4 py-3 text-right font-semibold">Balance</th>
                  <th className="px-4 py-3 font-semibold">Currency</th>
                  <th className="px-4 py-3 font-semibold">Request Time</th>
                  <th className="px-4 py-3 font-semibold">Action By</th>
                  <th className="px-4 py-3 font-semibold">Remark</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {items.map((a, idx) => (
                  <tr key={a.id} className="transition hover:bg-[var(--bg-glass)]/60">
                    <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                      {(pagination?.page ?? 1 - 1) * (pagination?.limit ?? 20) + idx + 1}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-[var(--text-main)]">{a.name}</p>
                      <p className="text-[11px] text-[var(--text-muted)]">{a.email}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--text-secondary)]">
                      {a.accountNumber}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone="green">{a.accountType.toUpperCase()}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-[var(--text-secondary)]">
                      {a.leverage}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold text-[var(--text-main)]">
                      {money(a.balance, a.currency)}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">{a.currency}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-[var(--text-secondary)]">
                      {fmtDate(a.requestTime)}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">{a.actionBy}</td>
                    <td className="max-w-[140px] truncate px-4 py-3 text-xs text-[var(--text-secondary)]">
                      {a.remark}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelected(a)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] transition hover:bg-[var(--primary)]/20"
                        title="View details"
                      >
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination && pagination.totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-[var(--border-soft)] px-4 py-3">
            <p className="text-xs text-[var(--text-muted)]">
              Page {pagination.page} of {pagination.totalPages} · {pagination.total} accounts
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-soft)] text-[var(--text-secondary)] transition hover:bg-[var(--bg-glass)] disabled:opacity-40"
              >
                <ChevronLeft size={15} />
              </button>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-soft)] text-[var(--text-secondary)] transition hover:bg-[var(--bg-glass)] disabled:opacity-40"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        ) : null}
      </Card>

      {/* Detail modal */}
      {selected ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[var(--text-main)]">Account Details</h3>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-lg p-1.5 text-[var(--text-muted)] transition hover:bg-[var(--bg-glass)]"
              >
                <X size={16} />
              </button>
            </div>
            <div className="mt-4 space-y-3 text-sm">
              {[
                ["Name", selected.name],
                ["Email", selected.email],
                ["Mobile", selected.phone || "--"],
                ["Account Number", selected.accountNumber],
                ["Account Type", selected.accountType.toUpperCase()],
                ["Plan", selected.planName || "—"],
                ["Leverage", selected.leverage],
                ["Balance", money(selected.balance, selected.currency)],
                ["Equity", money(selected.equity, selected.currency)],
                ["Bonus Balance", money(selected.bonusBalance, selected.currency)],
                ["Currency", selected.currency],
                ["Request Time", fmtDate(selected.requestTime)],
                ["Action By", selected.actionBy],
                ["User Type", selected.userType],
                ["Status", selected.status],
                ["Remark", selected.remark],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-3 border-b border-[var(--border-soft)] pb-2 last:border-0"
                >
                  <span className="text-xs text-[var(--text-muted)]">{label}</span>
                  <span className="text-right text-xs font-semibold text-[var(--text-main)]">
                    {String(value ?? "—")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </IbPageShell>
  );
}
