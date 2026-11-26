"use client";

import { useEffect, useRef, useState } from "react";
import type { Chart } from "@tradecanvas/chart";
import { ChartWidget } from "@tradecanvas/chart/widget";
import { useTheme } from "@/app/providers";
import {
  applyBidToFormingBar,
  brokerTradeCanvasFeed,
} from "./brokerTradeCanvasFeed";
import type { TradeOverlayProps } from "./chartTradeTypes";
import "./brokerChartMobile.css";

export type { ChartTradePosition, TradeOverlayProps } from "./chartTradeTypes";

const TF_KEY = "broker-chart-timeframe-tc";
const MOBILE_MQ = "(max-width: 767px)";

/** Map legacy broker codes / TradeCanvas strings → TradeCanvas TimeFrame. */
function readInitialTimeframe(): string {
  if (typeof window === "undefined") return "5m";
  const saved = localStorage.getItem(TF_KEY) || localStorage.getItem("broker-chart-timeframe");
  const map: Record<string, string> = {
    M1: "1m",
    M5: "5m",
    M15: "15m",
    M30: "30m",
    H1: "1h",
    H4: "4h",
    D1: "1d",
    "1m": "1m",
    "5m": "5m",
    "15m": "15m",
    "30m": "30m",
    "1h": "1h",
    "4h": "4h",
    "1d": "1d",
  };
  return map[String(saved || "")] ?? "5m";
}

function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(MOBILE_MQ).matches;
}

function mobileUi() {
  return {
    density: "compact" as const,
    scale: 0.9 as const,
    toolbar: "docked" as const,
    sidebar: "docked" as const,
    intervals: "plain" as const,
  };
}

function desktopUi() {
  return {
    density: "comfortable" as const,
    scale: "auto" as const,
    toolbar: "docked" as const,
    sidebar: "docked" as const,
  };
}

function mobileFeatures(): Record<string, boolean> {
  return {
    "toolbar.replay": false,
    "toolbar.symbol": false, // app top bar already shows symbol
    "toolbar.symbolInfo": false,
    "toolbar.fullscreen": false,
    "toolbar.themeToggle": false,
    "toolbar.layouts": false,
    "toolbar.screenshot": false,
    "statusBar.range": false,
    depthLadder: false,
    navigation: false,
  };
}

/**
 * Broker trading chart powered by TradeCanvas (76 drawing tools, indicators,
 * TradingView-style widget UI). Candles come from `/chart/candles`; the forming
 * bar follows the same bid as the order panel.
 */
export default function BrokerChartLite({
  symbol,
  bid,
  ask,
  digits,
  tradeOverlay,
}: {
  symbol: string;
  bid: number;
  ask: number;
  digits: number;
  tradeOverlay?: TradeOverlayProps;
}) {
  const { theme } = useTheme();
  const hostRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<ChartWidget | null>(null);
  const chartRef = useRef<Chart | null>(null);
  const timeframeRef = useRef(readInitialTimeframe());
  const tradeOverlayRef = useRef(tradeOverlay);
  tradeOverlayRef.current = tradeOverlay;
  const [ready, setReady] = useState(false);
  const [mobile, setMobile] = useState(false);
  const initialSymbol = useRef(symbol);
  const initialTheme = useRef(theme);
  const initialDigits = useRef(digits);

  // Track mobile breakpoint for compact TradeCanvas chrome.
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ);
    const apply = () => setMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // Mount TradeCanvas ChartWidget once.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let destroyed = false;
    const startMobile = isMobileViewport();
    const widget = new ChartWidget(host, {
      symbol: initialSymbol.current.toUpperCase(),
      timeframe: timeframeRef.current as "5m",
      theme: initialTheme.current === "light" ? "light" : "dark",
      feed: brokerTradeCanvasFeed,
      historyLimit: 500,
      ui: startMobile ? mobileUi() : desktopUi(),
      drawingTools: true,
      trading: true,
      toolbar: true,
      settings: true,
      statusBar: !startMobile,
      rangeBar: false,
      objectTree: !startMobile,
      alerts: !startMobile,
      persistLayouts: true,
      // Broker already has order / account UI around the chart.
      accountPanel: false,
      depthLadder: false,
      watchlist: false,
      tape: false,
      fullscreen: !startMobile,
      features: startMobile
        ? mobileFeatures()
        : {
            "toolbar.replay": false,
            depthLadder: false,
          },
      onReady: (chart) => {
        if (destroyed) return;
        chartRef.current = chart;
        chart.setSymbol(initialSymbol.current.toUpperCase());
        chart.setMarket({
          type: "forex",
          pricePrecision: initialDigits.current,
          priceStep: 1 / 10 ** Math.max(0, Math.min(initialDigits.current, 8)),
        });

        chart.on("positionModify", (e) => {
          const p = e.payload;
          const id = String(p.positionId ?? "");
          if (!id) return;
          const patch: { stopLoss?: number | null; takeProfit?: number | null } = {};
          if ("stopLoss" in p) patch.stopLoss = p.stopLoss ?? null;
          if ("takeProfit" in p) patch.takeProfit = p.takeProfit ?? null;
          void tradeOverlayRef.current?.onModify(id, patch);
        });

        chart.on("timeframeChange", (e) => {
          const tf = String(e.payload.timeframe ?? "");
          if (!tf) return;
          timeframeRef.current = tf;
          try {
            localStorage.setItem(TF_KEY, tf);
          } catch {
            // ignore
          }
        });

        setReady(true);
      },
    });

    widgetRef.current = widget;

    return () => {
      destroyed = true;
      setReady(false);
      chartRef.current = null;
      widgetRef.current = null;
      try {
        widget.destroy();
      } catch {
        // ignore
      }
    };
  }, []);

  // Compact / full chrome when crossing the mobile breakpoint.
  useEffect(() => {
    if (!ready) return;
    const widget = widgetRef.current;
    if (!widget) return;
    widget.setUI(mobile ? mobileUi() : desktopUi());
    widget.setFeatures(
      mobile
        ? mobileFeatures()
        : {
            "toolbar.replay": false,
            "toolbar.symbol": true,
            "toolbar.symbolInfo": true,
            "toolbar.fullscreen": true,
            "toolbar.themeToggle": true,
            "toolbar.layouts": true,
            "toolbar.screenshot": true,
            "statusBar.range": true,
            depthLadder: false,
            navigation: true,
            statusBar: true,
            objectTree: true,
            alerts: true,
          },
    );
  }, [ready, mobile]);

  // Symbol switch through the widget (reloads feed + layouts).
  useEffect(() => {
    if (!ready) return;
    const widget = widgetRef.current;
    if (!widget || !symbol) return;
    void widget.setSymbol(symbol.toUpperCase());
  }, [ready, symbol]);

  // Theme.
  useEffect(() => {
    if (!ready) return;
    widgetRef.current?.setTheme(theme === "light" ? "light" : "dark");
  }, [ready, theme]);

  // Live bid → forming candle (same source as order panel Bid).
  useEffect(() => {
    if (!symbol || !Number.isFinite(bid) || bid <= 0) return;
    applyBidToFormingBar(symbol, timeframeRef.current, bid);
    if (ready) chartRef.current?.setCurrentPrice(bid);
    void ask;
  }, [ready, symbol, bid, ask]);

  // Selected broker position → TradeCanvas position lines (SL/TP drag).
  useEffect(() => {
    if (!ready) return;
    const chart = chartRef.current;
    if (!chart) return;
    const pos = tradeOverlay?.position;
    if (!pos) {
      chart.setPositions([]);
      return;
    }
    chart.setPositions([
      {
        id: pos.positionId,
        symbol: symbol.toUpperCase(),
        side: pos.side === "BUY" ? "buy" : "sell",
        entryPrice: pos.openPrice,
        quantity: pos.volume,
        stopLoss: pos.stopLoss ?? undefined,
        takeProfit: pos.takeProfit ?? undefined,
        markPrice: bid > 0 ? bid : undefined,
      },
    ]);
  }, [ready, tradeOverlay?.position, symbol, bid]);

  // Price precision from symbol digits.
  useEffect(() => {
    if (!ready) return;
    chartRef.current?.setMarket({
      type: "forex",
      pricePrecision: digits,
      priceStep: 1 / 10 ** Math.max(0, Math.min(digits, 8)),
    });
  }, [ready, digits]);

  // Nudge TradeCanvas after orientation / soft-keyboard resize.
  useEffect(() => {
    if (!ready) return;
    const onResize = () => {
      window.requestAnimationFrame(() => {
        window.dispatchEvent(new Event("resize"));
      });
    };
    window.addEventListener("orientationchange", onResize);
    return () => window.removeEventListener("orientationchange", onResize);
  }, [ready]);

  return (
    <div className="broker-tc-root">
      <div ref={hostRef} className="broker-tc-host" />
    </div>
  );
}
