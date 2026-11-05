"use client";

import type { LucideIcon } from "lucide-react";
import { Calendar, CandlestickChart, List, PanelLeft, RotateCcw } from "lucide-react";
import type { ReactNode } from "react";

export type TradingPanelKey = "watchlist" | "chart" | "orderEntry" | "position";

const ITEMS: { key: TradingPanelKey; label: string; icon: LucideIcon }[] = [
  { key: "watchlist", label: "Watchlist", icon: List },
  { key: "chart", label: "Chart", icon: CandlestickChart },
  { key: "orderEntry", label: "Order Entry", icon: PanelLeft },
  { key: "position", label: "Position", icon: Calendar },
];

function RailTooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="group relative">
      {children}
      <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-x-1 -translate-y-1/2 whitespace-nowrap rounded-md bg-[var(--text-main)] px-2 py-1 text-xs font-medium text-[var(--bg-card)] opacity-0 shadow-lg transition duration-150 group-hover:translate-x-0 group-hover:opacity-100">
        {label}
      </span>
    </div>
  );
}

export default function TradingSideRail({
  active,
  onToggle,
  onReset,
}: {
  active: Record<TradingPanelKey, boolean>;
  onToggle: (key: TradingPanelKey) => void;
  onReset: () => void;
}) {
  return (
    <aside className="flex w-12 shrink-0 flex-col items-center gap-2 border-r border-[var(--border-soft)] bg-[var(--bg-card)] py-3">
      {ITEMS.map(({ key, label, icon: Icon }) => {
        const isActive = active[key];
        return (
          <RailTooltip key={key} label={label}>
            <button
              type="button"
              onClick={() => onToggle(key)}
              aria-label={label}
              aria-pressed={isActive}
              className={`grid h-9 w-9 place-items-center rounded-lg transition ${
                isActive
                  ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-glass)] hover:text-[var(--text-main)]"
              }`}
            >
              <Icon size={18} strokeWidth={1.8} />
            </button>
          </RailTooltip>
        );
      })}

      <span className="my-1 h-px w-6 bg-[var(--border-soft)]" aria-hidden />

      <RailTooltip label="Reset layout">
        <button
          type="button"
          onClick={onReset}
          aria-label="Reset layout"
          className="grid h-9 w-9 place-items-center rounded-lg text-[var(--text-secondary)] transition hover:bg-[var(--bg-glass)] hover:text-[var(--text-main)] active:scale-95"
        >
          <RotateCcw size={17} strokeWidth={1.8} />
        </button>
      </RailTooltip>
    </aside>
  );
}
