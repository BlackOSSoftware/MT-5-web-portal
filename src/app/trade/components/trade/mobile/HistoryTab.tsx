"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Loader2, RefreshCw, Search } from "lucide-react";
import { PERIODS, rangeFor, useClosedHistory, type Period } from "./historyData";
import { pnlClass, sideClass, signedUsd } from "./types";

function formatTime(value: unknown) {
  const d = new Date(String(value ?? ""));
  if (Number.isNaN(d.getTime())) return "--";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function money(value: number) {
  const n = Number.isFinite(value) ? value : 0;
  return `${n < 0 ? "-" : ""}$${Math.abs(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function HistoryTab() {
  const [period, setPeriod] = useState<Period>("today");
  const [menuOpen, setMenuOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [search, setSearch] = useState("");
  const menuRef = useRef<HTMLDivElement | null>(null);

  const range = useMemo(() => rangeFor(period, customFrom, customTo), [period, customFrom, customTo]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [menuOpen]);

  const historyQuery = useClosedHistory(range);

  const rows = useMemo(() => {
    const needle = search.trim().toUpperCase();
    const all = historyQuery.data?.rows ?? [];
    return needle ? all.filter((r) => r.symbol.toUpperCase().includes(needle)) : all;
  }, [historyQuery.data?.rows, search]);

  const s = historyQuery.data?.summary;
  const periodLabel = PERIODS.find((p) => p.key === period)?.label ?? "Today";

  return (
    <div className="space-y-3 pt-3">
      <div className="grid grid-cols-3 gap-x-3 gap-y-2.5 rounded-2xl bg-[var(--primary-soft)] px-3.5 py-3">
        <SummaryCell label="Profit" value={money(s?.profit ?? 0)} className={pnlClass(s?.profit ?? 0)} />
        <SummaryCell label="Deposit" value={money(s?.deposit ?? 0)} />
        <SummaryCell label="Withdrawal" value={money(s?.withdrawal ?? 0)} />
        <SummaryCell label="Swap" value={money(s?.swap ?? 0)} />
        <SummaryCell label="Commission" value={money(s?.commission ?? 0)} />
        <SummaryCell label="Balance" value={money(s?.balance ?? 0)} />
      </div>

      <div className="flex items-center gap-2">
        <div className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-xl bg-[var(--bg-glass)] px-3">
          <Search size={16} className="shrink-0 text-[var(--text-muted)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="min-w-0 flex-1 bg-transparent text-[14px] text-[var(--text-main)] outline-none placeholder:text-[var(--text-muted)]"
          />
        </div>

        <div ref={menuRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            className="flex h-11 items-center gap-1.5 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] px-3 text-[13px] font-semibold text-[var(--text-main)]"
          >
            {periodLabel}
            <ChevronDown size={14} className={`transition-transform ${menuOpen ? "rotate-180" : ""}`} />
          </button>
          <div
            className={`absolute right-0 top-full z-50 mt-1.5 w-40 origin-top-right overflow-hidden rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-1 shadow-xl transition duration-150 ${
              menuOpen ? "pointer-events-auto scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
            }`}
          >
            {PERIODS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => {
                  setPeriod(p.key);
                  setMenuOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[13px] ${
                  period === p.key ? "bg-[var(--primary-soft)] text-[var(--primary)]" : "text-[var(--text-main)]"
                }`}
              >
                {p.label}
                {period === p.key ? <Check size={14} /> : null}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => historyQuery.refetch()}
          aria-label="Refresh history"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] text-[var(--text-main)]"
        >
          <RefreshCw size={17} className={historyQuery.isFetching ? "animate-spin" : ""} />
        </button>
      </div>

      {period === "custom" ? (
        <div className="grid grid-cols-2 gap-2">
          <label className="text-[11px] text-[var(--text-muted)]">
            From
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] px-2 text-[13px] text-[var(--text-main)] outline-none"
            />
          </label>
          <label className="text-[11px] text-[var(--text-muted)]">
            To
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] px-2 text-[13px] text-[var(--text-main)] outline-none"
            />
          </label>
        </div>
      ) : null}

      <div className="-mx-3">
        {!range ? (
          <p className="py-10 text-center text-[13px] text-[var(--text-muted)]">Choose a from and to date.</p>
        ) : historyQuery.isLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-[13px] text-[var(--text-muted)]">
            <Loader2 size={15} className="animate-spin" />
            Loading history…
          </div>
        ) : historyQuery.isError ? (
          <p className="py-10 text-center text-[13px] text-[var(--loss)]">Could not load history.</p>
        ) : rows.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-[var(--text-muted)]">No closed trades for this period.</p>
        ) : (
          rows.map((r) => (
            <div key={r.id} className="flex items-start justify-between gap-3 border-b border-[var(--border-soft)] px-3 py-3">
              <div className="min-w-0">
                <p className="text-[15px] font-bold text-[var(--text-main)]">
                  {r.symbol}{" "}
                  <span className={`font-mono text-[13px] font-semibold ${sideClass(r.side)}`}>
                    {r.side.toLowerCase()} {r.volume.toFixed(2)}
                  </span>
                </p>
                <p className="mt-0.5 font-mono text-[12px] text-[var(--text-secondary)]">
                  {r.openPrice} → {r.closePrice}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className={`font-mono text-[15px] font-bold ${pnlClass(r.pnl)}`}>{signedUsd(r.pnl)}</p>
                <p className="mt-0.5 font-mono text-[11px] text-[var(--text-muted)]">{formatTime(r.closeTime ?? r.openTime)}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function SummaryCell({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] text-[var(--text-secondary)]">{label}</p>
      <p className={`truncate font-mono text-[13px] font-semibold ${className ?? "text-[var(--text-main)]"}`}>{value}</p>
    </div>
  );
}
