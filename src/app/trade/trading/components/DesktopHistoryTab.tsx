"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, Clock3, Columns3, Download, Filter, Loader2, RefreshCw } from "lucide-react";
import {
  PERIODS,
  rangeFor,
  useClosedHistory,
  type ClosedTrade,
  type Period,
} from "../../components/trade/mobile/historyData";
import { pnlClass } from "../../components/trade/mobile/types";

type ColumnKey =
  | "ticket"
  | "symbol"
  | "side"
  | "volume"
  | "openPrice"
  | "openTime"
  | "closePrice"
  | "closeTime"
  | "sl"
  | "tp"
  | "profit"
  | "swap"
  | "commission"
  | "slippage";

const COLUMNS: { key: ColumnKey; label: string; align?: "right" }[] = [
  { key: "ticket", label: "Position ID" },
  { key: "symbol", label: "Symbol" },
  { key: "side", label: "Side" },
  { key: "volume", label: "Volume", align: "right" },
  { key: "openPrice", label: "Open price", align: "right" },
  { key: "openTime", label: "Open time" },
  { key: "closePrice", label: "Close price", align: "right" },
  { key: "closeTime", label: "Close time" },
  { key: "sl", label: "SL", align: "right" },
  { key: "tp", label: "TP", align: "right" },
  { key: "profit", label: "Profit", align: "right" },
  { key: "swap", label: "Swap", align: "right" },
  { key: "commission", label: "Commission", align: "right" },
  { key: "slippage", label: "Slippage", align: "right" },
];

function money(value: number) {
  const n = Number.isFinite(value) ? value : 0;
  return `${n < 0 ? "-" : ""}$${Math.abs(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatTime(value: string | null, utc: boolean) {
  if (!value) return "--";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "--";
  const p = (n: number) => String(n).padStart(2, "0");
  const [mo, da, h, mi, s] = utc
    ? [d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()]
    : [d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds()];
  return `${p(mo)}/${p(da)} ${p(h)}:${p(mi)}:${p(s)}`;
}

function cellValue(row: ClosedTrade, key: ColumnKey, utc: boolean): string {
  switch (key) {
    case "ticket":
      return row.ticket;
    case "symbol":
      return row.symbol;
    case "side":
      return row.side.toUpperCase();
    case "volume":
      return row.volume.toFixed(2);
    case "openPrice":
      return row.openPrice;
    case "openTime":
      return formatTime(row.openTime, utc);
    case "closePrice":
      return row.closePrice;
    case "closeTime":
      return formatTime(row.closeTime, utc);
    case "sl":
      return row.stopLoss === null ? "--" : String(row.stopLoss);
    case "tp":
      return row.takeProfit === null ? "--" : String(row.takeProfit);
    case "profit":
      return row.pnl.toFixed(2);
    case "swap":
      return money(row.swap);
    case "commission":
      return money(row.commission);
    case "slippage":
      if (!row.slippageApplied) return "--";
      return `${row.slippagePoints ?? 0} pts`;
  }
}

function useOutside(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, close]);
  return ref;
}

export default function DesktopHistoryTab() {
  const [period, setPeriod] = useState<Period>("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [utc, setUtc] = useState(false);
  const [hidden, setHidden] = useState<Set<ColumnKey>>(new Set());
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const columnsRef = useOutside(columnsOpen, () => setColumnsOpen(false));
  const filterRef = useOutside(filterOpen, () => setFilterOpen(false));

  const range = useMemo(() => rangeFor(period, customFrom, customTo), [period, customFrom, customTo]);
  const history = useClosedHistory(range);
  const rows = history.data?.rows ?? [];
  const s = history.data?.summary;
  const visibleColumns = COLUMNS.filter((c) => !hidden.has(c.key));

  const toggleColumn = (key: ColumnKey) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else if (COLUMNS.length - next.size > 1) next.add(key);
      return next;
    });

  // CSV opens directly in Excel; the BOM keeps symbols/currency readable.
  const exportCsv = () => {
    const escape = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const lines = [
      visibleColumns.map((c) => c.label).join(","),
      ...rows.map((r) => visibleColumns.map((c) => escape(cellValue(r, c.key, utc))).join(",")),
    ];
    const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trade-history-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const periodLabel = PERIODS.find((p) => p.key === period)?.label ?? "Today";

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* TOOLBAR */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[var(--border-soft)] px-3 py-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Chip label="Balance" value={money(s?.balance ?? 0)} valueClass={pnlClass(s?.balance ?? 0)} />
          <Chip label="Total Profit" value={money(s?.profit ?? 0)} valueClass={pnlClass(s?.profit ?? 0)} />
          <Chip label="Swap" value={money(s?.swap ?? 0)} />
          <Chip label="Commission" value={money(s?.commission ?? 0)} />
          <Chip label="Deposit" value={money(s?.deposit ?? 0)} />
          <Chip label="Withdrawal" value={money(s?.withdrawal ?? 0)} />
        </div>

        <div className="flex items-center gap-1.5">
          <div ref={columnsRef} className="relative">
            <ToolButton onClick={() => setColumnsOpen((v) => !v)} active={columnsOpen}>
              <Columns3 size={13} />
              Columns
              <span className="rounded-full bg-[var(--primary)] px-1.5 text-[10px] font-bold text-white">
                {visibleColumns.length}
              </span>
            </ToolButton>
            {columnsOpen ? (
              <Menu>
                {COLUMNS.map((c) => {
                  const on = !hidden.has(c.key);
                  return (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => toggleColumn(c.key)}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] text-[var(--text-main)] hover:bg-[var(--bg-glass)]"
                    >
                      <span
                        className={`grid h-4 w-4 place-items-center rounded border ${
                          on ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--border-strong)]"
                        }`}
                      >
                        {on ? <Check size={11} /> : null}
                      </span>
                      {c.label}
                    </button>
                  );
                })}
              </Menu>
            ) : null}
          </div>

          <ToolButton onClick={() => setUtc((v) => !v)} active={utc}>
            <Clock3 size={13} />
            {utc ? "UTC+0" : "Local"}
          </ToolButton>

          <div ref={filterRef} className="relative">
            <ToolButton onClick={() => setFilterOpen((v) => !v)} active={filterOpen}>
              <Filter size={13} />
              {periodLabel}
            </ToolButton>
            {filterOpen ? (
              <Menu>
                {PERIODS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => {
                      setPeriod(p.key);
                      if (p.key !== "custom") setFilterOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-[12px] ${
                      period === p.key ? "bg-[var(--primary-soft)] text-[var(--primary)]" : "text-[var(--text-main)] hover:bg-[var(--bg-glass)]"
                    }`}
                  >
                    {p.label}
                    {period === p.key ? <Check size={12} /> : null}
                  </button>
                ))}
                {period === "custom" ? (
                  <div className="mt-1 space-y-1.5 border-t border-[var(--border-soft)] px-1 pt-2">
                    <input
                      type="date"
                      value={customFrom}
                      onChange={(e) => setCustomFrom(e.target.value)}
                      className="h-8 w-full rounded-md border border-[var(--border-soft)] bg-[var(--bg-card)] px-2 text-[12px] text-[var(--text-main)] outline-none"
                    />
                    <input
                      type="date"
                      value={customTo}
                      onChange={(e) => setCustomTo(e.target.value)}
                      className="h-8 w-full rounded-md border border-[var(--border-soft)] bg-[var(--bg-card)] px-2 text-[12px] text-[var(--text-main)] outline-none"
                    />
                  </div>
                ) : null}
              </Menu>
            ) : null}
          </div>

          <ToolButton onClick={() => history.refetch()}>
            <RefreshCw size={13} className={history.isFetching ? "animate-spin" : ""} />
            Refresh
          </ToolButton>

          <ToolButton onClick={exportCsv} disabled={rows.length === 0}>
            <Download size={13} />
            Export Excel
          </ToolButton>
        </div>
      </div>

      {/* TABLE */}
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[980px] border-collapse text-[12px]">
          <thead className="sticky top-0 z-10 bg-[var(--bg-card)]">
            <tr className="border-b border-[var(--border-soft)]">
              {visibleColumns.map((c) => (
                <th
                  key={c.key}
                  className={`whitespace-nowrap px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)] ${
                    c.align === "right" ? "text-right" : "text-left"
                  }`}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!range ? (
              <EmptyRow span={visibleColumns.length}>Choose a from and to date.</EmptyRow>
            ) : history.isLoading ? (
              <EmptyRow span={visibleColumns.length}>
                <span className="inline-flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" />
                  Loading history…
                </span>
              </EmptyRow>
            ) : history.isError ? (
              <EmptyRow span={visibleColumns.length}>Could not load history.</EmptyRow>
            ) : rows.length === 0 ? (
              <EmptyRow span={visibleColumns.length}>No closed trades for this period.</EmptyRow>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-[var(--border-soft)] hover:bg-[var(--bg-glass)]">
                  {visibleColumns.map((c) => (
                    <td
                      key={c.key}
                      className={`whitespace-nowrap px-3 py-2 ${c.align === "right" ? "text-right" : "text-left"} ${
                        c.key === "symbol" ? "font-semibold text-[var(--text-main)]" : "font-mono text-[var(--text-main)]"
                      } ${c.key === "profit" ? `font-semibold ${pnlClass(r.pnl)}` : ""} ${
                        c.key === "openTime" || c.key === "closeTime" ? "text-[var(--text-secondary)]" : ""
                      }`}
                    >
                      {c.key === "side" ? (
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            r.side.toUpperCase() === "SELL"
                              ? "bg-[var(--loss)]/10 text-[var(--loss)]"
                              : "bg-[#2563eb]/10 text-[#2563eb]"
                          }`}
                        >
                          {r.side.toUpperCase()}
                        </span>
                      ) : (
                        cellValue(r, c.key, utc)
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Chip({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--bg-glass)] px-2.5 py-1 text-[11px]">
      <span className="text-[var(--text-muted)]">{label}:</span>
      <span className={`font-mono font-semibold ${valueClass ?? "text-[var(--text-main)]"}`}>{value}</span>
    </span>
  );
}

function ToolButton({
  onClick,
  active,
  disabled,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-semibold transition disabled:opacity-45 ${
        active
          ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
          : "border-[var(--border-soft)] bg-[var(--bg-card)] text-[var(--text-main)] hover:bg-[var(--bg-glass)]"
      }`}
    >
      {children}
    </button>
  );
}

function Menu({ children }: { children: ReactNode }) {
  return (
    <div className="absolute right-0 top-full z-50 mt-1 max-h-72 w-48 overflow-y-auto rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-1 shadow-xl">
      {children}
    </div>
  );
}

function EmptyRow({ span, children }: { span: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={span} className="px-3 py-8 text-center text-[12px] text-[var(--text-muted)]">
        {children}
      </td>
    </tr>
  );
}
