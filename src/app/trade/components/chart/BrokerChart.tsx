"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  LineStyle,
  createChart,
  type CandlestickData,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { Loader2 } from "lucide-react";
import { useTheme } from "@/app/providers";
import { normalizeApiBaseUrl } from "@/api/baseUrl";

/**
 * Candles come from the broker's own feed (/chart/candles, same AllTick source as the
 * live quotes), and the last candle is driven by the same bid shown in the order panel,
 * so the chart and the Bid/Ask always move together.
 */

const TIMEFRAMES = [
  { code: "M1", label: "1m", seconds: 60 },
  { code: "M5", label: "5m", seconds: 300 },
  { code: "M15", label: "15m", seconds: 900 },
  { code: "M30", label: "30m", seconds: 1800 },
  { code: "H1", label: "1H", seconds: 3600 },
  { code: "H4", label: "4H", seconds: 14400 },
  { code: "D1", label: "1D", seconds: 86400 },
] as const;
type TimeframeCode = (typeof TIMEFRAMES)[number]["code"];

const TF_KEY = "broker-chart-timeframe";
const PAGE_SIZE = 500;
const UP = "#22c55e";
const DOWN = "#ef4444";

type ApiCandle = { t: number; o: number; h: number; l: number; c: number };
type Bar = CandlestickData<UTCTimestamp>;

/** Lightweight-charts renders UTC; shift so the axis reads in the viewer's local time. */
const TZ_SHIFT = -new Date().getTimezoneOffset() * 60;

async function fetchCandles(symbol: string, timeframe: string, before?: number) {
  const base = normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_URL).replace(/\/$/, "");
  const params = new URLSearchParams({ symbol, timeframe, limit: String(PAGE_SIZE) });
  if (before) params.set("before", String(before));
  const res = await fetch(`${base}/chart/candles?${params}`);
  const json = await res.json().catch(() => null);
  if (!res.ok || json?.status !== "success") {
    throw new Error(json?.message || "Chart data unavailable");
  }
  const candles: ApiCandle[] = Array.isArray(json.data?.candles) ? json.data.candles : [];
  return {
    bars: candles.map<Bar>((k) => ({
      time: (k.t + TZ_SHIFT) as UTCTimestamp,
      open: k.o,
      high: k.h,
      low: k.l,
      close: k.c,
    })),
    hasMore: Boolean(json.data?.hasMore),
    digits: Number(json.data?.digits) || undefined,
  };
}

function readVar(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

export default function BrokerChart({
  symbol,
  bid,
  ask,
  digits,
}: {
  symbol: string;
  bid: number;
  ask: number;
  digits: number;
}) {
  const { theme } = useTheme();
  const hostRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const barsRef = useRef<Bar[]>([]);
  const bidLineRef = useRef<IPriceLine | null>(null);
  const askLineRef = useRef<IPriceLine | null>(null);
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(true);

  const [timeframe, setTimeframe] = useState<TimeframeCode>(() => {
    if (typeof window === "undefined") return "M5";
    const saved = localStorage.getItem(TF_KEY) as TimeframeCode | null;
    return TIMEFRAMES.some((t) => t.code === saved) ? (saved as TimeframeCode) : "M5";
  });
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const tfSeconds = TIMEFRAMES.find((t) => t.code === timeframe)?.seconds ?? 300;

  // Create the chart once; theme changes only restyle it.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const chart = createChart(host, {
      autoSize: true,
      crosshair: { mode: CrosshairMode.Normal },
      timeScale: { timeVisible: true, secondsVisible: false, rightOffset: 6, borderVisible: false },
      rightPriceScale: { borderVisible: false },
    });
    const series = chart.addSeries(CandlestickSeries, {
      upColor: UP,
      downColor: DOWN,
      wickUpColor: UP,
      wickDownColor: DOWN,
      borderVisible: false,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    chartRef.current = chart;
    seriesRef.current = series;
    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      bidLineRef.current = null;
      askLineRef.current = null;
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const light = theme === "light";
    const text = readVar("--text-secondary", light ? "#4b5563" : "#9ca3af");
    const grid = light ? "#eef0f4" : "rgba(148,163,184,0.08)";
    chart.applyOptions({
      layout: {
        background: { type: ColorType.Solid, color: readVar("--bg-card", light ? "#ffffff" : "#0f172a") },
        textColor: text,
        attributionLogo: false,
      },
      grid: { vertLines: { color: grid }, horzLines: { color: grid } },
      crosshair: {
        vertLine: { color: light ? "#374151" : "#9ca3af", style: LineStyle.Dashed, labelBackgroundColor: "#374151" },
        horzLine: { color: light ? "#374151" : "#9ca3af", style: LineStyle.Dashed, labelBackgroundColor: "#374151" },
      },
    });
  }, [theme]);

  useEffect(() => {
    seriesRef.current?.applyOptions({
      priceFormat: { type: "price", precision: digits, minMove: 1 / 10 ** digits },
    });
  }, [digits]);

  // History for the current symbol + timeframe.
  useEffect(() => {
    let cancelled = false;
    const series = seriesRef.current;
    if (!series || !symbol) return;
    barsRef.current = [];
    hasMoreRef.current = true;
    series.setData([]);
    for (const ref of [bidLineRef, askLineRef]) {
      if (ref.current) {
        series.removePriceLine(ref.current);
        ref.current = null;
      }
    }
    queueMicrotask(() => {
      if (!cancelled) {
        setStatus("loading");
        setError(null);
      }
    });

    fetchCandles(symbol, timeframe)
      .then(({ bars, hasMore }) => {
        if (cancelled) return;
        barsRef.current = bars;
        hasMoreRef.current = hasMore;
        series.setData(bars);
        chartRef.current?.timeScale().scrollToRealTime();
        setStatus("ready");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Chart data unavailable");
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [symbol, timeframe]);

  // Load older candles when the user scrolls to the left edge.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const onRange = (range: { from: number; to: number } | null) => {
      if (!range || range.from > 20 || loadingMoreRef.current || !hasMoreRef.current) return;
      const first = barsRef.current[0];
      if (!first) return;
      loadingMoreRef.current = true;
      fetchCandles(symbol, timeframe, Number(first.time) - TZ_SHIFT)
        .then(({ bars, hasMore }) => {
          const older = bars.filter((b) => b.time < first.time);
          hasMoreRef.current = hasMore && older.length > 0;
          if (!older.length) return;
          barsRef.current = [...older, ...barsRef.current];
          seriesRef.current?.setData(barsRef.current);
        })
        .catch(() => {
          hasMoreRef.current = false;
        })
        .finally(() => {
          loadingMoreRef.current = false;
        });
    };
    chart.timeScale().subscribeVisibleLogicalRangeChange(onRange);
    return () => chart.timeScale().unsubscribeVisibleLogicalRangeChange(onRange);
  }, [symbol, timeframe]);

  // Live: every bid tick updates (or opens) the current candle.
  useEffect(() => {
    const series = seriesRef.current;
    if (!series || status !== "ready" || !(bid > 0)) return;
    const bars = barsRef.current;
    const nowLocal = Math.floor(Date.now() / 1000) + TZ_SHIFT;
    const bucket = (nowLocal - (nowLocal % tfSeconds)) as UTCTimestamp;
    const last = bars[bars.length - 1];
    let bar: Bar;
    if (last && last.time === bucket) {
      bar = { ...last, high: Math.max(last.high, bid), low: Math.min(last.low, bid), close: bid };
      bars[bars.length - 1] = bar;
    } else if (!last || bucket > last.time) {
      bar = { time: bucket, open: last?.close ?? bid, high: Math.max(last?.close ?? bid, bid), low: Math.min(last?.close ?? bid, bid), close: bid };
      bars.push(bar);
    } else {
      return;
    }
    series.update(bar);
  }, [bid, status, tfSeconds]);

  // Bid / Ask price lines, identical to the order panel prices.
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;
    const upsert = (
      ref: MutableRefObject<IPriceLine | null>,
      price: number,
      title: string,
      color: string,
    ) => {
      if (!(price > 0)) return;
      if (ref.current) ref.current.applyOptions({ price });
      else {
        ref.current = series.createPriceLine({
          price,
          color,
          title,
          lineWidth: 1,
          lineStyle: LineStyle.Solid,
          axisLabelVisible: true,
        });
      }
    };
    upsert(bidLineRef, bid, "Bid", DOWN);
    upsert(askLineRef, ask, "Ask", "#2563eb");
  }, [bid, ask]);

  const chooseTimeframe = (code: TimeframeCode) => {
    setTimeframe(code);
    localStorage.setItem(TF_KEY, code);
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="flex h-9 shrink-0 items-center gap-0.5 overflow-x-auto border-b border-[var(--border-soft)] px-2">
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf.code}
            type="button"
            onClick={() => chooseTimeframe(tf.code)}
            className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold transition ${
              timeframe === tf.code
                ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                : "text-[var(--text-muted)] hover:bg-[var(--bg-glass)] hover:text-[var(--text-main)]"
            }`}
          >
            {tf.label}
          </button>
        ))}
      </div>
      <div className="relative min-h-0 flex-1">
        <div ref={hostRef} className="absolute inset-0" />
        {status !== "ready" ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[var(--bg-card)]/70">
            {status === "loading" ? (
              <span className="flex items-center gap-2 text-[12px] text-[var(--text-muted)]">
                <Loader2 size={16} className="animate-spin text-[var(--primary)]" />
                Loading {symbol} chart…
              </span>
            ) : (
              <span className="text-[12px] text-[var(--text-muted)]">{error}</span>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
