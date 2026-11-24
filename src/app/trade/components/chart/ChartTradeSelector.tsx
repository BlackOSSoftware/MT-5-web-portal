"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, LineChart } from "lucide-react";
import type { LivePosition } from "@/hooks/useLiveTradeSocket";

function fmtPrice(value: number | null | undefined, digits: number) {
  if (value == null || !Number.isFinite(Number(value))) return "--";
  return Number(value).toFixed(digits);
}

/**
 * "Trade" dropdown next to the chart symbol: lists the user's OPEN trades for
 * the current symbol. Selecting one shows its entry / SL / TP on the chart.
 */
export default function ChartTradeSelector({
  positions,
  selectedId,
  onSelect,
  digits,
}: {
  positions: LivePosition[];
  selectedId: string | null;
  onSelect: (positionId: string | null) => void;
  digits: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open]);

  const selected = positions.find((p) => p.positionId === selectedId) ?? null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[11px] font-bold transition max-sm:px-1.5 ${
          selected
            ? "border-[var(--primary)]/50 bg-[var(--primary-soft)] text-[var(--primary)]"
            : "border-[var(--border-soft)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
        }`}
      >
        <LineChart size={13} />
        <span className="hidden sm:inline">Trade</span>
        {positions.length > 0 ? (
          <span className="rounded-full bg-[var(--primary)]/15 px-1.5 text-[10px] font-semibold text-[var(--primary)]">
            {positions.length}
          </span>
        ) : null}
        <ChevronDown size={12} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <div
        className={`absolute left-1/2 top-full z-[700] mt-1.5 w-64 max-w-[calc(100vw-1.5rem)] -translate-x-1/2 origin-top overflow-hidden rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] shadow-xl transition duration-150 sm:left-0 sm:translate-x-0 sm:origin-top-left ${
          open
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none -translate-y-1 scale-95 opacity-0"
        }`}
      >
        {positions.length === 0 ? (
          <p className="px-3 py-3 text-center text-[11px] text-[var(--text-muted)]">
            No open trades on this symbol
          </p>
        ) : (
          <div className="max-h-64 overflow-y-auto py-1">
            {positions.map((p) => {
              const isSel = p.positionId === selectedId;
              const isBuy = p.side === "BUY";
              return (
                <button
                  key={p.positionId}
                  type="button"
                  onClick={() => {
                    onSelect(isSel ? null : p.positionId);
                    setOpen(false);
                  }}
                  className={`flex w-full flex-wrap items-center gap-x-2 gap-y-0.5 px-3 py-2 text-left transition ${
                    isSel ? "bg-[var(--primary-soft)]" : "hover:bg-[var(--bg-glass)]"
                  }`}
                >
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                      isBuy ? "bg-[var(--profit)]/15 text-[var(--profit)]" : "bg-[var(--loss)]/15 text-[var(--loss)]"
                    }`}
                  >
                    {p.side}
                  </span>
                  <span className="shrink-0 text-[12px] font-semibold text-[var(--text-main)]">
                    {Number(p.volume || 0).toFixed(2)}
                  </span>
                  <span className="min-w-0 truncate font-mono text-[11px] text-[var(--text-muted)]">
                    @{fmtPrice(p.openPrice, digits)}
                  </span>
                  <span className="ml-auto flex shrink-0 items-center gap-1 text-[10px] text-[var(--text-muted)]">
                    {p.stopLoss != null ? (
                      <span className="rounded bg-[var(--loss)]/10 px-1 py-0.5 font-bold text-[var(--loss)]">SL</span>
                    ) : null}
                    {p.takeProfit != null ? (
                      <span className="rounded bg-[var(--profit)]/10 px-1 py-0.5 font-bold text-[var(--profit)]">TP</span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        )}
        {selected ? (
          <button
            type="button"
            onClick={() => {
              onSelect(null);
              setOpen(false);
            }}
            className="block w-full border-t border-[var(--border-soft)] px-3 py-1.5 text-left text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--loss)]"
          >
            Clear selection
          </button>
        ) : null}
      </div>
    </div>
  );
}
