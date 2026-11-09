"use client";

import { X } from "lucide-react";
import { useChartTabs } from "@/lib/chartTabs";

/** Horizontal chart-symbol tabs for the trading top bar. Last tab cannot be closed. */
export default function ChartTabs() {
  const { tabs, active, setActive, close } = useChartTabs();

  return (
    <div className="hide-scrollbar flex min-w-0 max-w-[42%] items-center gap-0.5 overflow-x-auto">
      {tabs.map((t) => {
        const isActive = t === active;
        const closable = tabs.length > 1;
        return (
          <div
            key={t}
            className={`flex shrink-0 items-center overflow-hidden rounded-none border transition ${
              isActive
                ? "border-[var(--primary)]/50 bg-[var(--primary-soft)] text-[var(--primary)]"
                : "border-transparent text-[var(--text-muted)] hover:bg-[var(--bg-glass)] hover:text-[var(--text-main)]"
            }`}
          >
            <button
              type="button"
              onClick={() => setActive(t)}
              className="px-2 py-1 text-[10px] font-bold tracking-wide"
            >
              {t}
            </button>
            {closable ? (
              <button
                type="button"
                onClick={() => close(t)}
                aria-label={`Close ${t} chart`}
                className={`grid h-5 w-5 place-items-center transition ${
                  isActive
                    ? "text-[var(--primary)]/70 hover:bg-[var(--primary)]/15 hover:text-[var(--primary)]"
                    : "text-[var(--text-muted)]/60 hover:bg-[var(--loss)]/10 hover:text-[var(--loss)]"
                }`}
              >
                <X size={10} strokeWidth={3} />
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
