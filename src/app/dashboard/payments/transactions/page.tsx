"use client";

import { useEffect, useMemo, useState } from "react";
import { useTransactions } from "@/hooks/useTransactions";
import { useMyAccounts } from "@/hooks/useMyAccounts";
import Select from "@/app/components/ui/Select";
import Pagination from "@/app/components/ui/pagination";
import { History, RotateCcw } from "lucide-react";

const typeOptions = [
  { label: "All", value: "" },
  { label: "Deposit", value: "DEPOSIT" },
  { label: "Withdrawal", value: "WITHDRAWAL" },
  { label: "Tradable Fund", value: "TRADABLE_FUND" },
  { label: "Transfer In", value: "INTERNAL_TRANSFER_IN" },
  { label: "Transfer Out", value: "INTERNAL_TRANSFER_OUT" },
  { label: "Trade Profit", value: "TRADE_PROFIT" },
  { label: "Trade Loss", value: "TRADE_LOSS" },
  { label: "Manual Bonus", value: "BONUS_MANUAL" },
];

const typeLabels: Record<string, string> = {
  DEPOSIT: "Deposit",
  WITHDRAWAL: "Withdrawal",
  TRADABLE_FUND: "Tradable Fund",
  INTERNAL_TRANSFER_IN: "Transfer In",
  INTERNAL_TRANSFER_OUT: "Transfer Out",
  TRADE_PROFIT: "Trade Profit",
  TRADE_LOSS: "Trade Loss",
  BONUS_MANUAL: "Manual Bonus",
};

export default function TransactionsPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [type, setType] = useState("");
  const [accountId, setAccountId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const { data: myAccounts } = useMyAccounts();

  const accountOptions = useMemo(() => {
    const list = Array.isArray(myAccounts) ? (myAccounts as unknown as Record<string, unknown>[]) : [];
    const opts = list
      .filter((a) => String(a.status || "active").toLowerCase() === "active")
      .map((a) => ({
        label: `${String(a.account_number ?? "")} · ${String(a.plan_name ?? a.account_type ?? "Account")}`,
        value: String(a._id),
      }));
    return [{ label: "All accounts", value: "" }, ...opts];
  }, [myAccounts]);

  // Preselect account from ?account= query (e.g. opened from trading topbar).
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("account");
    if (q) setAccountId(q);
  }, []);

  const { data, isLoading } = useTransactions({
    page,
    limit,
    type: type || undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
    accountId: accountId || undefined,
  });

  const visibleTransactions = (data?.data ?? []).filter((tx) => String(tx.type).toUpperCase() !== "SWAP");

  const formatDateDDMMYYYY = (value: string) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "-";
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(parsed);
  };

  const handleResetFilters = () => {
    setPage(1);
    setType("");
    setAccountId("");
    setFromDate("");
    setToDate("");
  };

  const formatType = (value: string) => typeLabels[String(value).toUpperCase()] ?? value;

  const CREDIT_TYPES = new Set([
    "DEPOSIT",
    "TRADABLE_FUND",
    "INTERNAL_TRANSFER_IN",
    "TRADE_PROFIT",
    "BONUS_MANUAL",
  ]);
  const isCredit = (t: string) => CREDIT_TYPES.has(String(t).toUpperCase());
  const statusClass = (s: string) =>
    s === "SUCCESS"
      ? "bg-[var(--success)]/10 text-[var(--success)]"
      : s === "FAILED"
        ? "bg-[var(--error)]/10 text-[var(--error)]"
        : "bg-[var(--warning)]/10 text-[var(--warning)]";

  return (
    <div className="p-2 md:p-6 space-y-4 md:space-y-6">

      {/* PAGE HEADER */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]">
            <History size={20} />
          </span>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-main)] md:text-2xl">
              Transaction History
            </h1>
            <p className="text-xs text-[var(--text-muted)] md:text-sm">
              Filter and review all account transactions
            </p>
          </div>
        </div>
        {data ? (
          <span className="w-fit rounded-full border border-[var(--border-soft)] bg-[var(--bg-card)] px-3 py-1 text-[11px] font-semibold text-[var(--text-secondary)]">
            {data.pagination.total} transactions
          </span>
        ) : null}
      </div>

      {/* FILTERS */}
      <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-4 shadow-sm md:p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
              Account
            </span>
            <Select
              options={accountOptions}
              value={accountId}
              onChange={(v) => {
                setPage(1);
                setAccountId(v);
              }}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
              Type
            </span>
            <Select
              options={typeOptions}
              value={type}
              onChange={(v) => {
                setPage(1);
                setType(v);
              }}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
              From date
            </span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setPage(1);
                setFromDate(e.target.value);
              }}
              className="h-[46px] w-full rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] px-4 text-sm text-[var(--text-main)] transition focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
              To date
            </span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setPage(1);
                setToDate(e.target.value);
              }}
              className="h-[46px] w-full rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] px-4 text-sm text-[var(--text-main)] transition focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
          </label>
        </div>

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={handleResetFilters}
            disabled={!type && !accountId && !fromDate && !toDate}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-glass)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--primary)]/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCcw size={14} />
            Reset filters
          </button>
        </div>
      </div>

      {/* TABLE CARD */}
      <div className="
        rounded-2xl
        border border-[var(--border-soft)]
        bg-[var(--bg-card)]/95
        backdrop-blur-xl
        shadow-[0_16px_40px_rgba(0,0,0,0.08)]
        overflow-hidden
      ">
        <div className="hidden md:block overflow-x-auto">

          <table className="min-w-[700px] w-full text-xs md:text-sm">

            <thead>
              <tr className="border-b border-[var(--border-soft)] bg-[var(--bg-glass)]/60 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Account No</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Balance</th>
                <th className="px-4 py-3">Details</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>

            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[var(--text-muted)]">
                    Loading...
                  </td>
                </tr>
              )}

              {!isLoading && visibleTransactions.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[var(--text-muted)]">
                    No transactions found for selected filters.
                  </td>
                </tr>
              )}

              {visibleTransactions.map((tx) => {
                const credit = isCredit(tx.type);
                return (
                <tr
                  key={tx._id}
                  className="border-t border-[var(--border-soft)] transition hover:bg-[var(--bg-glass)]/60"
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        credit
                          ? "bg-[var(--profit)]/10 text-[var(--profit)]"
                          : "bg-[var(--loss)]/10 text-[var(--loss)]"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${credit ? "bg-[var(--profit)]" : "bg-[var(--loss)]"}`} />
                      {formatType(tx.type)}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-[12px] font-semibold text-[var(--text-main)] whitespace-nowrap">
                    {tx.accountNumber}
                  </td>

                  <td className={`px-4 py-3 text-right whitespace-nowrap font-mono font-bold tabular-nums ${credit ? "text-[var(--profit)]" : "text-[var(--loss)]"}`}>
                    {credit ? "+" : "−"}$ {Math.abs(tx.amount).toLocaleString()}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${statusClass(tx.status)}`}
                    >
                      {tx.status}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-right whitespace-nowrap font-mono font-medium tabular-nums text-[var(--text-secondary)]">
                    $ {tx.balanceAfter.toLocaleString()}
                  </td>

                  <td className="max-w-[220px] truncate px-4 py-3 text-[var(--text-muted)]" title={tx.remark || "-"}>
                    {tx.remark || "—"}
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap text-[var(--text-muted)]">
                    {formatDateDDMMYYYY(tx.createdAt)}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>

        </div>

        <div className="md:hidden space-y-2 p-2">
          {isLoading && (
            <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--bg-glass)] p-3 text-sm text-[var(--text-muted)] text-center">
              Loading...
            </div>
          )}

          {!isLoading && visibleTransactions.length === 0 && (
            <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--bg-glass)] p-3 text-sm text-[var(--text-muted)] text-center">
              No transactions found for selected filters.
            </div>
          )}

          {!isLoading && visibleTransactions.map((tx) => {
            const credit = isCredit(tx.type);
            return (
            <div
              key={tx._id}
              className="rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-3 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      credit
                        ? "bg-[var(--profit)]/10 text-[var(--profit)]"
                        : "bg-[var(--loss)]/10 text-[var(--loss)]"
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${credit ? "bg-[var(--profit)]" : "bg-[var(--loss)]"}`} />
                    {formatType(tx.type)}
                  </span>
                  <p className="mt-1.5 font-mono text-[11px] font-semibold text-[var(--text-muted)]">
                    {tx.accountNumber}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`font-mono text-[15px] font-bold tabular-nums ${credit ? "text-[var(--profit)]" : "text-[var(--loss)]"}`}>
                    {credit ? "+" : "−"}$ {Math.abs(tx.amount).toLocaleString()}
                  </p>
                  <span
                    className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${statusClass(tx.status)}`}
                  >
                    {tx.status}
                  </span>
                </div>
              </div>

              <div className="mt-2.5 grid grid-cols-2 gap-2 border-t border-[var(--border-soft)] pt-2.5 text-xs">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Balance</p>
                  <p className="font-mono font-semibold tabular-nums text-[var(--text-main)]">$ {tx.balanceAfter.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Date</p>
                  <p className="font-medium text-[var(--text-main)]">{formatDateDDMMYYYY(tx.createdAt)}</p>
                </div>
                {tx.remark ? (
                  <div className="col-span-2">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Details</p>
                    <p className="font-medium text-[var(--text-secondary)]">{tx.remark}</p>
                  </div>
                ) : null}
              </div>
            </div>
            );
          })}
        </div>

        {/* PAGINATION */}
        {data && (
          <div className="p-3 md:p-4 border-t border-[var(--border-soft)]">
            <Pagination
              page={page}
              totalPages={data.pagination.totalPages}
              limit={limit}
              onPageChange={setPage}
              onLimitChange={(val) => {
                setPage(1);
                setLimit(val);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
