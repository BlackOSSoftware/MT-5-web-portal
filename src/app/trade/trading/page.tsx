"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import TradingTopBar from "./components/TradingTopBar";
import TradingSideRail, { type TradingPanelKey } from "./components/TradingSideRail";
import DesktopWatchlist from "./components/DesktopWatchlist";
import DesktopPositionsPanel from "./components/DesktopPositionsPanel";
import TradingViewChart from "../components/chart/TradingViewChart";
import NewOrderSheet from "../components/chart/NewOrderSheet";
import PropertySheet from "../components/quotes/PropertySheet";
import { buildSymbolSpec, spreadPoints } from "../components/chart/orderMath";
import { Toast } from "@/app/components/ui/Toast";
import { useMarketQuotes } from "@/hooks/useMarketQuotes";
import { useSymbolProperty } from "@/hooks/useSymbolProperty";
import { useTradeAccount } from "@/hooks/accounts/useAccountById";
import { useLiveTradeSocket } from "@/hooks/useLiveTradeSocket";
import { getTradeTokenFromStorageSync } from "@/lib/tradeToken";

const SYMBOL_KEY = "trading-desk-symbol";
// Panel widths are a share of the area to the right of the 48px side rail.
const WATCHLIST_WIDTH = "calc((100vw - 48px) * 0.2)";
const ORDER_WIDTH = "calc((100vw - 48px) * 0.3)";

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export default function TradingPage() {
  const [panels, setPanels] = useState<Record<TradingPanelKey, boolean>>({
    watchlist: true,
    orderEntry: true,
    position: true,
  });
  const [symbol, setSymbol] = useState("");
  const [infoOpen, setInfoOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(SYMBOL_KEY);
    if (saved) queueMicrotask(() => setSymbol(saved));
  }, []);

  const selectSymbol = useCallback((next: string) => {
    const code = String(next || "").trim().toUpperCase();
    if (!code) return;
    setSymbol(code);
    localStorage.setItem(SYMBOL_KEY, code);
  }, []);

  const togglePanel = (key: TradingPanelKey) =>
    setPanels((prev) => ({ ...prev, [key]: !prev[key] }));

  const activeSymbol = symbol || "EURUSD";
  const [token] = useState(() => getTradeTokenFromStorageSync() || undefined);
  const quotes = useMarketQuotes(token, [activeSymbol]);
  const quote = quotes[activeSymbol];
  const bid = toNumber(quote?.bid);
  const ask = toNumber(quote?.ask);
  const { data: property } = useSymbolProperty(activeSymbol);
  const spec = useMemo(
    () => buildSymbolSpec(property, [quote?.bid, quote?.ask]),
    [property, quote?.bid, quote?.ask],
  );
  const spread = spreadPoints(bid, ask, spec.digits);

  const { data: tradeAccount } = useTradeAccount();
  const row = (tradeAccount ?? null) as Record<string, unknown> | null;
  const accountId = row ? String(row.accountId ?? row._id ?? row.id ?? "") : "";
  const { account: liveAccount, positions, pending } = useLiveTradeSocket(accountId || undefined);
  const notify = useCallback(
    (message: string, type: "success" | "error" = "success") => setToast({ message, type }),
    [],
  );
  const focusSymbol = useCallback(
    (next: string) => {
      selectSymbol(next);
      setPanels((prev) => ({ ...prev, orderEntry: true }));
    },
    [selectSymbol],
  );
  const balance = toNumber(liveAccount?.balance) || toNumber(row?.balance);

  return (
    <div className="flex h-screen min-h-0 flex-col bg-[var(--bg-plan)]">
      <TradingTopBar />
      <div className="flex min-h-0 flex-1">
        <TradingSideRail active={panels} onToggle={togglePanel} />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-[var(--bg-plan)] p-1.5">
          {/* TOP 70% (100% when positions are hidden): watchlist | chart | new order */}
          <div
            className="flex min-h-0 shrink-0 transition-[height] duration-300 ease-in-out"
            style={{ height: panels.position ? "70%" : "100%" }}
          >
            <SlidePanel open={panels.watchlist} side="left" width={WATCHLIST_WIDTH}>
              <DesktopWatchlist selected={symbol} onSelect={selectSymbol} />
            </SlidePanel>

            <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] shadow-sm">
              <div className="flex h-10 shrink-0 items-center justify-between border-b border-[var(--border-soft)] px-3">
                <span className="text-[12px] font-semibold text-[var(--text-main)]">Chart</span>
              </div>
              <div className="flex h-9 shrink-0 items-center gap-3 border-b border-[var(--border-soft)] px-3 text-[12px]">
                <span className="font-bold text-[var(--text-main)]">{activeSymbol}</span>
                <span className="text-[var(--text-muted)]">
                  Bid{" "}
                  <span className="font-mono font-semibold text-[var(--profit)]">
                    {bid > 0 ? bid.toFixed(spec.digits) : "--"}
                  </span>
                </span>
                <span className="text-[var(--text-muted)]">
                  Ask{" "}
                  <span className="font-mono font-semibold text-[var(--text-main)]">
                    {ask > 0 ? ask.toFixed(spec.digits) : "--"}
                  </span>
                </span>
              </div>
              <div className="min-h-0 flex-1">
                <TradingViewChart symbol={activeSymbol} />
              </div>
            </section>

            <SlidePanel open={panels.orderEntry} side="right" width={ORDER_WIDTH}>
              <div className="relative flex h-full min-h-0 flex-col bg-[var(--bg-card)]">
                <div className="flex h-10 shrink-0 items-center border-b border-[var(--border-soft)] px-3">
                  <span className="text-[12px] font-semibold text-[var(--text-main)]">
                    New order · {activeSymbol}
                  </span>
                </div>
                <div className="min-h-0 flex-1">
                  <NewOrderSheet
                    variant="inline"
                    open
                    initialTab="MARKET"
                    onClose={() => {}}
                    onPlaced={(message) => setToast({ message, type: "success" })}
                    onOpenInfo={() => setInfoOpen(true)}
                    symbol={activeSymbol}
                    bid={bid}
                    ask={ask}
                    spread={spread}
                    spec={spec}
                    balance={balance}
                    initialVolume={0.01}
                  />
                </div>
                <PropertySheet open={infoOpen} symbol={activeSymbol} onClose={() => setInfoOpen(false)} />
              </div>
            </SlidePanel>
          </div>

          {/* BOTTOM 30%: open positions / pending orders / history */}
          <div
            aria-hidden={!panels.position}
            className={`min-h-0 flex-1 overflow-hidden transition-opacity duration-300 ${
              panels.position ? "pt-1.5 opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            <div className="h-full overflow-hidden rounded-xl border border-[var(--border-soft)] shadow-sm">
            <DesktopPositionsPanel
              positions={positions}
              pending={pending}
              onSelectSymbol={focusSymbol}
              onNotify={notify}
            />
            </div>
          </div>
        </div>
      </div>

      {toast ? <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} /> : null}
    </div>
  );
}

/** Animates between its fixed side-panel width and 0, so the chart grows to fill the gap. */
function SlidePanel({
  open,
  side,
  width,
  children,
}: {
  open: boolean;
  side: "left" | "right";
  width: string;
  children: ReactNode;
}) {
  return (
    <div
      aria-hidden={!open}
      className={`relative h-full shrink-0 overflow-hidden transition-[width,opacity] duration-300 ease-in-out ${
        open ? "opacity-100" : "opacity-0"
      }`}
      style={{ width: open ? width : 0 }}
    >
      <div
        className={`absolute inset-y-0 ${side === "left" ? "right-0 pr-1.5" : "left-0 pl-1.5"} h-full`}
        style={{ width }}
      >
        <div className="h-full overflow-hidden rounded-xl border border-[var(--border-soft)] shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
