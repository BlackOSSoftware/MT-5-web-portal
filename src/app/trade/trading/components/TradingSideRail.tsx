"use client";

import type { LucideIcon } from "lucide-react";
import { Calendar, List, PanelLeft } from "lucide-react";

export type TradingPanelKey = "watchlist" | "orderEntry" | "position";

const ITEMS: { key: TradingPanelKey; label: string; icon: LucideIcon }[] = [
  { key: "watchlist", label: "Watchlist", icon: List },
  { key: "orderEntry", label: "Order Entry", icon: PanelLeft },
  { key: "position", label: "Position", icon: Calendar },
];

export default function TradingSideRail({
  active,
  onToggle,
}: {
  active: Record<TradingPanelKey, boolean>;
  onToggle: (key: TradingPanelKey) => void;
}) {
  return (
    <aside className="flex w-12 shrink-0 flex-col items-center gap-2 border-r border-[var(--border-soft)] bg-[var(--bg-card)] py-3">
      {ITEMS.map(({ key, label, icon: Icon }) => {
        const isActive = active[key];
        return (
          <div key={key} className="group relative">
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

            <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-x-1 -translate-y-1/2 whitespace-nowrap rounded-md bg-[var(--text-main)] px-2 py-1 text-xs font-medium text-[var(--bg-card)] opacity-0 shadow-lg transition duration-150 group-hover:translate-x-0 group-hover:opacity-100">
              {label}
            </span>
          </div>
        );
      })}
    </aside>
  );
}
