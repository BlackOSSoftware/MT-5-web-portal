"use client";

import { useEffect, useMemo, useState } from "react";
import { useTheme } from "@/app/providers";
import { toTradingViewSymbol } from "@/lib/tv/tvSymbol";
import type { TradeOverlayProps } from "./chartTradeTypes";

/** Mobile-parity interval codes → TradingView Advanced Chart intervals. */
export function intervalFromCode(code: string): string {
  switch (String(code || "").toUpperCase()) {
    case "M1":
      return "1";
    case "M5":
      return "5";
    case "M15":
      return "15";
    case "M30":
      return "30";
    case "H1":
      return "60";
    case "H2":
      return "120";
    case "H4":
      return "240";
    case "D1":
      return "1D";
    case "W1":
      return "1W";
    case "MN":
      return "1M";
    default:
      return "5";
  }
}

/**
 * Same as oceana-app `TradingViewAdvancedChart`:
 * free Advanced Chart embed with left drawing toolbar.
 * Loaded via `/tv-advanced.html` (reliable vs srcDoc).
 */
export default function TvBrokerChart({
  symbol,
  bid,
  ask,
  digits,
  tradeOverlay,
  interval = "5",
  style = "1",
  showSideToolbar = true,
}: {
  symbol: string;
  bid: number;
  ask: number;
  digits: number;
  tradeOverlay?: TradeOverlayProps;
  interval?: string;
  style?: string;
  showSideToolbar?: boolean;
}) {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const dark = theme === "dark";
  const tvSymbol = toTradingViewSymbol(symbol);
  const fmt = (n: number) => (n > 0 ? n.toFixed(digits) : "--");
  const pos = tradeOverlay?.position;

  const src = useMemo(() => {
    const q = new URLSearchParams({
      symbol: tvSymbol,
      interval,
      style,
      theme: dark ? "dark" : "light",
      toolbar: showSideToolbar ? "1" : "0",
    });
    return `/tv-advanced.html?${q.toString()}`;
  }, [tvSymbol, interval, style, dark, showSideToolbar]);

  useEffect(() => {
    setLoading(true);
  }, [src]);

  return (
    <div className="relative flex h-full min-h-[360px] w-full flex-col bg-[var(--bg-card)]">
      <div className="relative min-h-0 flex-1">
        <iframe
          key={src}
          title={`TradingView ${tvSymbol}`}
          src={src}
          className="absolute inset-0 h-full w-full border-0"
          onLoad={() => setLoading(false)}
          allow="clipboard-write; fullscreen"
          referrerPolicy="origin"
        />
        {loading && (
          <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center bg-[var(--bg-card)]/80 text-xs text-[var(--text-muted)]">
            Loading TradingView…
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[var(--border-soft)] px-3 py-1.5 text-[11px]">
        <div className="flex min-w-0 items-center gap-3 font-mono">
          <span className="truncate text-[var(--text-muted)]">{symbol}</span>
          <span className="text-[var(--text-muted)]">
            Bid <span className="font-semibold text-red-400">{fmt(bid)}</span>
          </span>
          <span className="text-[var(--text-muted)]">
            Ask <span className="font-semibold text-emerald-400">{fmt(ask)}</span>
          </span>
        </div>
        {pos && (
          <span className="truncate font-mono text-[var(--text-muted)]">
            {pos.side} {pos.volume} @ {fmt(pos.openPrice)}
            {pos.stopLoss != null ? ` · SL ${fmt(pos.stopLoss)}` : ""}
            {pos.takeProfit != null ? ` · TP ${fmt(pos.takeProfit)}` : ""}
          </span>
        )}
      </div>
    </div>
  );
}
