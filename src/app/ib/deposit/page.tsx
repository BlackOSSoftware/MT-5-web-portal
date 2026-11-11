"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownToLine,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eye,
  Landmark,
  Search,
  X,
} from "lucide-react";
import GlobalLoader from "@/app/components/ui/GlobalLoader";
import { useNetworkDeposits } from "@/hooks/useReferral";
import {
  PageHeader,
  Card,
  StatCard,
  EmptyState,
  Badge,
  statusTone,
  inputCls,
  IbPageShell,
} from "../components/ui";

function money(value: number) {
  return `$${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const METHODS = ["", "UPI", "BANK", "CRYPTO", "MANUAL", "INTERNATIONAL"];
const STATUSES = ["", "PENDING", "APPROVED", "REJECTED"];

export default function IbDepositPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [method, setMethod] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<any | null>(null);

  const params = useMemo(
    () => ({
      from: from || undefined,
      to: to || undefined,
      method: method || undefined,
      status: status || undefined,
      page,
      limit: 20,
    }),
    [from, to, method, status, page],
  );

  const { data, isLoading } = useNetworkDeposits(params);
  const items = data?.items ?? [];
  const pagination = data?.pagination;

  const resetFilters = () => {
    setFrom("");
    setTo("");
    setMethod("");
    setStatus("");
    setPage(1);
  };

  const hasFilters = Boolean(from || to || method || status);

  return (
    <IbPageShell
      tips={[
        "This table shows deposits made by your entire referral network.",
        "Use date range and payment type filters to narrow results.",
        "Click the eye icon to view full deposit details and proof.",
        "Commission column shows the bonus credited on that deposit.",
      ]}
    >
      <PageHeader
        icon={ArrowDownToLine}
        title="Deposits"
        subtitle="Track every deposit made by your referral network."
      />

      <StatCard
        icon={Landmark}
        label="Total Deposit (Filtered)"
        value={money(data?.totalAmount ?? 0)}
        hint={`${pagination?.total ?? 0} transactions`}
        tone="green"
      />

      {/* Filters */}
      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--text-secondary)]">
              From Date
            </label>
            <input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(1);
              }}
              className={inputCls}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--text-secondary)]">
              To Date
            </label>
            <input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(1);
              }}
              className={inputCls}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--text-secondary)]">
              Deposit Type
            </label>
            <select
              value={method}
              onChange={(e) => {
                setMethod(e.target.value);
                setPage(1);
              }}
              className={inputCls}
            >
              {METHODS.map((m) => (
                <option key={m} value={m}>
                  {m || "All Types"}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--text-secondary)]">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className={inputCls}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s || "All Status"}
                </option>
              ))}
            </select>
          </div>
        </div>
        {hasFilters ? (
          <button
            type="button"
            onClick={resetFilters}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[var(--bg-glass)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--bg-main)]"
          >
            <X size={13} />
            Clear Filters
          </button>
        ) : null}
      </Card>

      {/* Table */}
      <Card>
        {isLoading ? (
          <div className="flex min-h-[200px] items-center justify-center">
            <GlobalLoader />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No deposits found"
            subtitle="Try adjusting your filters or date range."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border-soft)] text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                  <th className="px-4 py-3 font-semibold">No.</th>
                  <th className="px-4 py-3 font-semibold">User</th>
                  <th className="px-4 py-3 font-semibold">Payment From</th>
                  <th className="px-4 py-3 font-semibold">Payment To</th>
                  <th className="px-4 py-3 text-right font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold">Deposit Type</th>
                  <th className="px-4 py-3 text-right font-semibold">Commission</th>
                  <th className="px-4 py-3 font-semibold">Transaction Date</th>
                  <th className="px-4 py-3 font-semibold">Reference ID</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {items.map((d, idx) => (
                  <tr
                    key={d.id}
                    className="transition hover:bg-[var(--bg-glass)]/60"
                  >
                    <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                      {(pagination?.page ?? 1 - 1) * (pagination?.limit ?? 20) + idx + 1}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-[var(--text-main)]">
                        {d.user?.name || "User"}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        {d.user?.email}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">
                      {d.method || "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">
                      {d.accountNumber || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-bold text-[var(--text-main)]">
                      {money(d.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone="blue">{d.method || "—"}</Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold text-emerald-500">
                      {d.bonusAmount > 0 ? money(d.bonusAmount) : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-[var(--text-secondary)]">
                      {d.createdAt
                        ? new Date(d.createdAt).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })
                        : "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-[var(--text-muted)]">
                      {d.id ? d.id.slice(-8).toUpperCase() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={statusTone(d.status)}>{d.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelected(d)}
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
              Page {pagination.page} of {pagination.totalPages} · {pagination.total} records
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
              <h3 className="text-base font-bold text-[var(--text-main)]">Deposit Details</h3>
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
                ["User", selected.user?.name],
                ["Email", selected.user?.email],
                ["Account", selected.accountNumber || "—"],
                ["Amount", money(selected.amount)],
                ["Deposit Type", selected.method],
                ["Commission", selected.bonusAmount > 0 ? money(selected.bonusAmount) : "—"],
                [
                  "Date",
                  selected.createdAt
                    ? new Date(selected.createdAt).toLocaleString()
                    : "—",
                ],
                ["Reference ID", selected.id],
                ["Status", selected.status],
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

              {selected.rejectionReason ? (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-500">
                  Rejection: {selected.rejectionReason}
                </div>
              ) : null}

              {selected.proofImage ? (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-[var(--text-secondary)]">Payment Proof</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selected.proofImage}
                    alt="Deposit proof"
                    className="max-h-48 w-full rounded-xl border border-[var(--border-soft)] object-cover"
                  />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </IbPageShell>
  );
}
