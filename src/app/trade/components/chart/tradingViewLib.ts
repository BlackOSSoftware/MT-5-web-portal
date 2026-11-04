declare global {
  interface Window {
    TradingView?: {
      widget: new (options: Record<string, unknown>) => unknown;
    };
    __tradingViewScriptPromise?: Promise<void>;
  }
}

export function resolveTradingViewSymbol(s: string) {
  if (!s) return "FX:EURUSD";
  if (s.includes(":")) return s;
  // quick heuristic for crypto pairs vs FX
  if (s.endsWith("USDT") || s.endsWith("BTC") || s.endsWith("USDTP")) {
    return `BINANCE:${s}`;
  }
  return `FX:${s}`;
}

export function loadTradingViewLibrary(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.TradingView?.widget) return Promise.resolve();
  if (window.__tradingViewScriptPromise) return window.__tradingViewScriptPromise;

  window.__tradingViewScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById("tradingview-tvjs");
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load TradingView library")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = "tradingview-tvjs";
    script.src = "https://s3.tradingview.com/tv.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load TradingView library"));
    document.head.appendChild(script);
  });

  return window.__tradingViewScriptPromise;
}
