"use client";

import { useMemo, useState } from "react";
import {
  HandCoins,
  Search,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Receipt,
} from "lucide-react";
import { useMyIbCommissions } from "@/hooks/useReferral";
import GlobalLoader from "@/app/components/ui/GlobalLoader";
import {
  PageHeader,
  Card,
  StatCard,
  EmptyState,
  Badge,
  inputCls,
  IbPageShell,
} from "../components/ui";

function money(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value)))
    return "—";
  return `$${Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

const PAGE_SIZE = 20;

export default function MyCommissionPage() {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [level, setLevel] = useState("");
  const [page, setPage] = useState(1);

  const onSearchChange = (value: string) => {
    setQ(value);
    setPage(1);
    window.clearTimeout((onSearchChange as any)._t);
    (onSearchChange as any)._t = window.setTimeout(
      () => setDebouncedQ(value),
      400,
    );
  };

  const params = useMemo(
    () => ({
      q: debouncedQ || undefined,
      from: from || undefined,
      to: to || undefined,
      level: level || undefined,
      page,
      limit: PAGE_SIZE,
    }),
    [debouncedQ, from, to, level, page],
  );

  const { data, isLoading, isFetching } = useMyIbCommissions(params);
  const items = data?.items ?? [];
  const totals = data?.totals;
  const pagination = data?.pagination;

  const resetFilters = () => {
    setQ("");
    setDebouncedQ("");
    setFrom("");
    setTo("");
    setLevel("");
    setPage(1);
  };

  const hasFilters = Boolean(q || from || to || level);

  return (
    <IbPageShell
      tips={[
        "Commission is earned on every trade your referrals open.",
        "Level 1 clients pay you directly; deeper levels share the IB budget.",
        "Use filters to find a specific client, account or date range.",
      ]}
    >
      <PageHeader
        icon={HandCoins}
        title="Commission"
        subtitle="Per-trade IB commission earned from your referral network."
      />

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard
          icon={HandCoins}
          label="Total Commission"
          value={money(totals?.commission ?? 0)}
          tone="primary"
        />
        <StatCard
          icon={TrendingUp}
          label="Client Profit"
          value={money(totals?.profit ?? 0)}
          tone="blue"
        />
        <StatCard
          icon={Receipt}
          label="Trades"
          value={String(totals?.count ?? 0)}
          tone="green"
        />
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative lg:col-span-2">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
            />
            <input
              value={q}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search account no, client, symbol..."
              className={`${inputCls} pl-9`}
            />
          </div>
          <input
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
            className={inputCls}
            aria-label="Start date"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
            className={inputCls}
            aria-label="End date"
          />
          <div className="flex gap-2">
            <select
              value={level}
              onChange={(e) => {
                setLevel(e.target.value);
                setPage(1);
              }}
              className={inputCls}
              aria-label="Level"
            >
              <option value="">All levels</option>
              <option value="1">Level 1</option>
              <option value="2">Level 2</option>
              <option value="3">Level 3</option>
            </select>
            <button
              type="button"
              onClick={resetFilters}
              disabled={!hasFilters}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-glass)] px-3 py-2 text-xs font-semibold text-[var(--text-main)] transition hover:border-[var(--primary)]/40 disabled:opacity-40"
            >
              <RotateCcw size={13} />
              Reset
            </button>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <GlobalLoader />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No commission yet"
            subtitle="Commission from your referrals' trades will appear here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-sm">
              <thead>
                <tr className="border-b border-[var(--border-soft)] text-left text-[11px] uppercase tracking-wide text-[var(--text-secondary)]">
                  <th className="px-4 py-3">No.</th>
                  <th className="px-4 py-3">Client Name</th>
                  <th className="px-4 py-3">Parent Name</th>
                  <th className="px-4 py-3">Level</th>
                  <th className="px-4 py-3">Account Type</th>
                  <th className="px-4 py-3">Symbol</th>
                  <th className="px-4 py-3 text-right">Lots</th>
                  <th className="px-4 py-3 text-right">Commission</th>
                  <th className="px-4 py-3 text-right">Profit</th>
                  <th className="px-4 py-3">Position Id</th>
                  <th className="px-4 py-3">Close Time</th>
                  <th className="px-4 py-3">Trade Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {items.map((row, idx) => (
                  <tr
                    key={row.id}
                    className="text-[var(--text-main)] hover:bg-[var(--bg-glass)]/50"
                  >
                    <td className="px-4 py-3 text-[var(--text-secondary)]">
                      {((pagination?.page ?? 1) - 1) * PAGE_SIZE + idx + 1}
                    </td>
                    <td className="px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {row.clientName}
                        </p>
                        {row.clientEmail ? (
                          <p className="truncate text-[11px] text-[var(--text-secondary)]">
                            {row.clientEmail}
                          </p>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">
                      {row.parentName || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone="blue">L{row.level}</Badge>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">
                      {row.accountType}
                    </td>
                    <td className="px-4 py-3 font-semibold">{row.symbol}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {Number(row.lots).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-500">
                      {money(row.commission)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right tabular-nums font-semibold ${
                        row.profit == null
                          ? "text-[var(--text-secondary)]"
                          : row.profit >= 0
                            ? "text-emerald-500"
                            : "text-red-500"
                      }`}
                    >
                      {money(row.profit)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--text-secondary)]">
                      {row.ticket ?? row.positionId ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">
                      {formatDateTime(row.closeTime)}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">
                      {row.duration || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-[var(--border-soft)] px-4 py-3">
            <p className="text-xs text-[var(--text-secondary)]">
              Page {pagination.page} of {pagination.totalPages} ·{" "}
              {pagination.total} records
              {isFetching ? " · updating…" : ""}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-soft)] px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
              >
                <ChevronLeft size={14} /> Prev
              </button>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-soft)] px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        ) : null}
      </Card>
    </IbPageShell>
  );
}
