"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useTheme } from "@/app/providers";
import { loadTradingViewLibrary, resolveTradingViewSymbol } from "./tradingViewLib";

// Recently viewed symbols keep their widget mounted, so switching back is instant.
const MAX_CACHED = 4;

/** TradingView chart with a small cache of mounted widgets (one per recent symbol). */
export default function TradingViewChart({
  symbol,
  interval = "5",
  className,
}: {
  symbol: string;
  interval?: string;
  className?: string;
}) {
  const { theme } = useTheme();
  const [cache, setCache] = useState<{ theme: string; symbols: string[] }>({
    theme,
    symbols: [symbol],
  });

  // Adjust the cache while rendering (React's "derive state from props" pattern).
  if (cache.theme !== theme) {
    setCache({ theme, symbols: [symbol] });
  } else if (cache.symbols[0] !== symbol) {
    setCache({
      theme,
      symbols: [symbol, ...cache.symbols.filter((s) => s !== symbol)].slice(0, MAX_CACHED),
    });
  }

  return (
    <div className={`relative ${className ?? "h-full w-full"}`}>
      {cache.symbols.map((s) => (
        <TradingViewWidget
          key={`${cache.theme}|${s}|${interval}`}
          symbol={s}
          interval={interval}
          theme={cache.theme}
          active={s === symbol}
        />
      ))}
    </div>
  );
}

function TradingViewWidget({
  symbol,
  interval,
  theme,
  active,
}: {
  symbol: string;
  interval: string;
  theme: string;
  active: boolean;
}) {
  const uid = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const hostId = useRef(`tv_chart_${uid.replace(/[:]/g, "_")}`);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const el = containerRef.current;
    if (!el) return;
    // Theme class is applied to <html> before effects run, so the resolved card colour is current.
    const surface =
      getComputedStyle(document.documentElement).getPropertyValue("--bg-card").trim() ||
      (theme === "light" ? "#ffffff" : "#0f172a");
    let observer: MutationObserver | null = null;

    const render = async () => {
      try {
        await loadTradingViewLibrary();
      } catch (error) {
        console.error("[TradingViewChart] script load failed", error);
        return;
      }
      if (cancelled || !containerRef.current || !window.TradingView?.widget) return;

      const host = containerRef.current;
      host.innerHTML = "";
      const node = document.createElement("div");
      node.id = hostId.current;
      node.style.width = "100%";
      node.style.height = "100%";
      host.appendChild(node);

      // Hide the loader once TradingView's iframe has finished loading.
      observer = new MutationObserver(() => {
        const iframe = host.querySelector("iframe");
        if (!iframe) return;
        observer?.disconnect();
        iframe.addEventListener("load", () => !cancelled && setLoaded(true), { once: true });
      });
      observer.observe(host, { childList: true, subtree: true });

      const light = theme === "light";
      new window.TradingView.widget({
        autosize: true,
        symbol: resolveTradingViewSymbol(symbol),
        interval,
        timezone: "Asia/Kolkata",
        theme: light ? "light" : "dark",
        style: "1",
        locale: "en",
        hide_side_toolbar: true,
        allow_symbol_change: false,
        container_id: hostId.current,
        studies: [],
        withdateranges: true,
        details: false,
        backgroundColor: surface,
        overrides: {
          "paneProperties.background": surface,
          "paneProperties.backgroundType": "solid",
          "paneProperties.vertGridProperties.color": light ? "#e5e7eb" : "#1f2937",
          "paneProperties.horzGridProperties.color": light ? "#e5e7eb" : "#1f2937",
          "scalesProperties.textColor": light ? "#111827" : "#d1d5db",
          "mainSeriesProperties.candleStyle.upColor": "#22c55e",
          "mainSeriesProperties.candleStyle.downColor": "#ef4444",
        },
      });
    };

    void render();
    return () => {
      cancelled = true;
      observer?.disconnect();
      el.innerHTML = "";
    };
  }, [symbol, interval, theme]);

  return (
    <div
      className={`absolute inset-0 ${active ? "visible z-10" : "invisible z-0"}`}
      aria-hidden={!active}
    >
      <div ref={containerRef} className="h-full w-full" />
      {active && !loaded ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[var(--bg-card)]">
          <span className="flex items-center gap-2 text-[12px] text-[var(--text-muted)]">
            <Loader2 size={16} className="animate-spin text-[var(--primary)]" />
            Loading {symbol} chart…
          </span>
        </div>
      ) : null}
    </div>
  );
}
