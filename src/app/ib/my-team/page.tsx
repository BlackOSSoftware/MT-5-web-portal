"use client";

import { useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Search,
  Users,
  X,
} from "lucide-react";
import GlobalLoader from "@/app/components/ui/GlobalLoader";
import { useNetworkMembers } from "@/hooks/useReferral";
import {
  PageHeader,
  Card,
  EmptyState,
  Badge,
  inputCls,
  IbPageShell,
} from "../components/ui";

function money(value: number) {
  return `$${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function lots(value: number) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function IbMyTeamPage() {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [level, setLevel] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<any | null>(null);

  const params = useMemo(
    () => ({
      q: debouncedQ || undefined,
      level: level === "" ? undefined : Number(level),
      page,
      limit: 20,
    }),
    [debouncedQ, level, page],
  );

  const { data, isLoading } = useNetworkMembers(params);
  const items = data?.items ?? [];
  const pagination = data?.pagination;
  const levels = data?.levels ?? [];

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSearchChange = (value: string) => {
    setQ(value);
    setPage(1);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedQ(value.trim()), 400);
  };

  const resetFilters = () => {
    setQ("");
    setDebouncedQ("");
    setLevel("");
    setPage(1);
  };

  const hasFilters = Boolean(q || level);

  return (
    <IbPageShell>
      <PageHeader
        icon={Users}
        title="My Team"
        subtitle="Your entire referral network with level-wise breakdown and performance stats."
      />

      {/* Filters */}
      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--text-secondary)]">
              Search
            </label>
            <div className="relative">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-placeholder)]"
              />
              <input
                type="text"
                value={q}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Name, email or referral code"
                className={`${inputCls} pl-9`}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--text-secondary)]">
              Level
            </label>
            <select
              value={level}
              onChange={(e) => {
                setLevel(e.target.value);
                setPage(1);
              }}
              className={inputCls}
            >
              <option value="">All Levels</option>
              {levels.map((l) => (
                <option key={l} value={l}>
                  Level {l}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            {hasFilters ? (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--bg-glass)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--bg-main)]"
              >
                <X size={13} />
                Clear Filters
              </button>
            ) : (
              <p className="text-xs text-[var(--text-muted)]">
                {pagination?.total ?? 0} members in your network
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card>
        {isLoading ? (
          <div className="flex min-h-[200px] items-center justify-center">
            <GlobalLoader />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No team members found"
            subtitle="Share your referral link to grow your network."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border-soft)] text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                  <th className="px-4 py-3 font-semibold">No.</th>
                  <th className="px-4 py-3 font-semibold">User</th>
                  <th className="px-4 py-3 font-semibold">Level</th>
                  <th className="px-4 py-3 font-semibold">Referral Code</th>
                  <th className="px-4 py-3 font-semibold">User Type</th>
                  <th className="px-4 py-3 text-right font-semibold">Lots</th>
                  <th className="px-4 py-3 text-right font-semibold">Commission</th>
                  <th className="px-4 py-3 text-right font-semibold">Total Deposit</th>
                  <th className="px-4 py-3 text-right font-semibold">Total Withdrawal</th>
                  <th className="px-4 py-3 font-semibold">Registered Date</th>
                  <th className="px-4 py-3 font-semibold">Remark</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {items.map((m, idx) => (
                  <tr
                    key={m.id}
                    className="transition hover:bg-[var(--bg-glass)]/60"
                  >
                    <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                      {(pagination?.page ?? 1 - 1) * (pagination?.limit ?? 20) + idx + 1}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-[var(--text-main)]">
                        {m.name}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)]">{m.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone="blue">L{m.level}</Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--text-secondary)]">
                      {m.referralCode}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={m.userType === "IB" ? "amber" : "neutral"}>
                        {m.userType}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold text-[var(--text-main)]">
                      {lots(m.lots)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold text-emerald-500">
                      {money(m.commission)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold text-[var(--text-main)]">
                      {money(m.totalDeposit)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold text-[var(--text-main)]">
                      {money(m.totalWithdrawal)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-[var(--text-secondary)]">
                      {m.registeredAt
                        ? new Date(m.registeredAt).toLocaleDateString(undefined, {
                            dateStyle: "medium",
                          })
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        tone={
                          String(m.remark).toUpperCase() === "CONFIRMED"
                            ? "green"
                            : "amber"
                        }
                      >
                        {m.remark}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelected(m)}
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

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-[var(--border-soft)] px-4 py-3">
            <p className="text-xs text-[var(--text-muted)]">
              Page {pagination.page} of {pagination.totalPages} · {pagination.total} members
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
              <h3 className="text-base font-bold text-[var(--text-main)]">Member Details</h3>
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
                ["Level", `Level ${selected.level}`],
                ["Referral Code", selected.referralCode],
                ["User Type", selected.userType],
                ["KYC Status", selected.kycStatus],
                ["Lots", lots(selected.lots)],
                ["Commission", money(selected.commission)],
                ["Total Deposit", money(selected.totalDeposit)],
                ["Total Withdrawal", money(selected.totalWithdrawal)],
                [
                  "Registered",
                  selected.registeredAt
                    ? new Date(selected.registeredAt).toLocaleString()
                    : "—",
                ],
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
