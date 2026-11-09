"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";
import {
  AreaSeries,
  BarSeries,
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  LineSeries,
  LineStyle,
  createChart,
  type AreaData,
  type BarData,
  type CandlestickData,
  type HistogramData,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type LineData,
  type UTCTimestamp,
} from "lightweight-charts";
import { Loader2 } from "lucide-react";
import IndicatorModal from "./IndicatorModal";
import {
  INDICATOR_COLORS,
  INDICATOR_DEFS,
  computeIndicator,
  type IndSpec,
  type IndicatorType,
} from "./indicators";
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
const IND_KEY = "broker-chart-indicators";
const TYPE_KEY = "broker-chart-type";
const PAGE_SIZE = 500;
const UP = "#22c55e";
const DOWN = "#ef4444";
const LINE_COLOR = "#2962FF";

type ChartType = "candlestick" | "hollow" | "heikin" | "bar" | "line" | "area";

const CHART_TYPES: { type: ChartType; label: string }[] = [
  { type: "candlestick", label: "Candlestick" },
  { type: "hollow", label: "Hollow Candle" },
  { type: "heikin", label: "Heikin Ashi" },
  { type: "bar", label: "Bar (OHLC)" },
  { type: "line", label: "Line" },
  { type: "area", label: "Area" },
];

type MainSeries =
  | ISeriesApi<"Candlestick">
  | ISeriesApi<"Bar">
  | ISeriesApi<"Line">
  | ISeriesApi<"Area">;

type ApiCandle = { t: number; o: number; h: number; l: number; c: number };
type Bar = CandlestickData<UTCTimestamp>;

/** Heikin-Ashi transform of raw OHLC bars. */
function heikinAshi(bars: Bar[]): Bar[] {
  const out: Bar[] = [];
  let prevHAOpen = 0;
  let prevHAClose = 0;
  for (const b of bars) {
    const haClose = (b.open + b.high + b.low + b.close) / 4;
    const haOpen = out.length === 0 ? (b.open + b.close) / 2 : (prevHAOpen + prevHAClose) / 2;
    const haHigh = Math.max(b.high, haOpen, haClose);
    const haLow = Math.min(b.low, haOpen, haClose);
    out.push({ time: b.time, open: haOpen, high: haHigh, low: haLow, close: haClose });
    prevHAOpen = haOpen;
    prevHAClose = haClose;
  }
  return out;
}

function addMainSeries(chart: IChartApi, type: ChartType): MainSeries {
  switch (type) {
    case "hollow":
      return chart.addSeries(CandlestickSeries, {
        upColor: "rgba(0,0,0,0)",
        downColor: "rgba(0,0,0,0)",
        wickUpColor: UP,
        wickDownColor: DOWN,
        borderUpColor: UP,
        borderDownColor: DOWN,
        borderVisible: true,
        priceLineVisible: false,
        lastValueVisible: false,
      }) as MainSeries;
    case "heikin":
    case "candlestick":
      return chart.addSeries(CandlestickSeries, {
        upColor: UP,
        downColor: DOWN,
        wickUpColor: UP,
        wickDownColor: DOWN,
        borderVisible: false,
        priceLineVisible: false,
        lastValueVisible: false,
      }) as MainSeries;
    case "bar":
      return chart.addSeries(BarSeries, {
        upColor: UP,
        downColor: DOWN,
        openVisible: true,
        thinBars: true,
        priceLineVisible: false,
        lastValueVisible: false,
      }) as MainSeries;
    case "line":
      return chart.addSeries(LineSeries, {
        color: LINE_COLOR,
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: true,
      }) as MainSeries;
    case "area":
      return chart.addSeries(AreaSeries, {
        lineColor: LINE_COLOR,
        topColor: "rgba(41,98,255,0.28)",
        bottomColor: "rgba(41,98,255,0.02)",
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: true,
      }) as MainSeries;
  }
}

function setMainData(series: MainSeries, type: ChartType, bars: Bar[]) {
  const disp = type === "heikin" ? heikinAshi(bars) : bars;
  if (type === "line" || type === "area") {
    (series as ISeriesApi<"Line">).setData(
      disp.map((b) => ({ time: b.time, value: b.close })),
    );
  } else if (type === "bar") {
    (series as ISeriesApi<"Bar">).setData(
      disp.map((b) => ({ time: b.time, open: b.open, high: b.high, low: b.low, close: b.close })),
    );
  } else {
    (series as ISeriesApi<"Candlestick">).setData(disp);
  }
}

function pushMainUpdate(series: MainSeries, type: ChartType, bar: Bar, allBars: Bar[]) {
  if (type === "line" || type === "area") {
    (series as ISeriesApi<"Line">).update({ time: bar.time, value: bar.close });
  } else if (type === "bar") {
    (series as ISeriesApi<"Bar">).update({
      time: bar.time,
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
    });
  } else if (type === "heikin") {
    const ha = heikinAshi(allBars);
    (series as ISeriesApi<"Candlestick">).update(ha[ha.length - 1]);
  } else {
    (series as ISeriesApi<"Candlestick">).update(bar);
  }
}

function indColor(type: IndicatorType, role?: string): string {
  switch (type) {
    case "SMA": return INDICATOR_COLORS.SMA;
    case "EMA": return INDICATOR_COLORS.EMA;
    case "WMA": return INDICATOR_COLORS.WMA;
    case "BOLL": return role === "mid" ? INDICATOR_COLORS.BOLL_MID : INDICATOR_COLORS.BOLL_UPPER;
    case "RSI": return INDICATOR_COLORS.RSI;
    case "MACD": return role === "signal" ? INDICATOR_COLORS.MACD_SIGNAL : INDICATOR_COLORS.MACD;
    case "STOCH": return role === "d" ? INDICATOR_COLORS.STOCH_D : INDICATOR_COLORS.STOCH_K;
    case "ATR": return INDICATOR_COLORS.ATR;
    case "MOM": return INDICATOR_COLORS.MOM;
    case "CCI": return INDICATOR_COLORS.CCI;
    default: return "#2962FF";
  }
}

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

type AnyIndSeries = ISeriesApi<"Line"> | ISeriesApi<"Histogram">;

function readIndicators(): IndSpec[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(IND_KEY) || "[]");
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((i) => i && typeof i.id === "string" && typeof i.type === "string")
      .map((i) => ({
        id: String(i.id),
        type: i.type as IndicatorType,
        length: Math.min(Math.max(Number(i.length) || 14, 1), 200),
      }));
  } catch {
    return [];
  }
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
  const seriesRef = useRef<MainSeries | null>(null);
  const barsRef = useRef<Bar[]>([]);
  const bidLineRef = useRef<IPriceLine | null>(null);
  const askLineRef = useRef<IPriceLine | null>(null);
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(true);
  const indSeriesRef = useRef<Map<string, AnyIndSeries>>(new Map());
  const indLevelsRef = useRef<Map<string, IPriceLine[]>>(new Map());
  const indPaneReadyRef = useRef(false);

  const [indicators, setIndicators] = useState<IndSpec[]>(readIndicators);
  const [indOpen, setIndOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const typeRef = useRef<HTMLDivElement>(null);
  const [chartType, setChartType] = useState<ChartType>(() => {
    if (typeof window === "undefined") return "candlestick";
    const saved = localStorage.getItem(TYPE_KEY) as ChartType | null;
    return CHART_TYPES.some((t) => t.type === saved) ? (saved as ChartType) : "candlestick";
  });
  const chartTypeRef = useRef(chartType);
  chartTypeRef.current = chartType;
  const typeInitRef = useRef<ChartType | null>(null);

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
    const series = addMainSeries(chart, chartTypeRef.current);
    chartRef.current = chart;
    seriesRef.current = series;
    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      bidLineRef.current = null;
      askLineRef.current = null;
      indSeriesRef.current.clear();
      indLevelsRef.current.clear();
      indPaneReadyRef.current = false;
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

  // Rebuild the main series when the chart type changes.
  useEffect(() => {
    const chart = chartRef.current;
    const old = seriesRef.current;
    if (!chart || !old) return;
    if (typeInitRef.current === chartType) return;
    typeInitRef.current = chartType;
    chart.removeSeries(old);
    bidLineRef.current = null;
    askLineRef.current = null;
    const series = addMainSeries(chart, chartType);
    seriesRef.current = series;
    setMainData(series, chartType, barsRef.current);
    syncPriceLines();
    applyIndicators();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartType]);

  const chooseChartType = (type: ChartType) => {
    setChartType(type);
    localStorage.setItem(TYPE_KEY, type);
    setTypeOpen(false);
  };

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
        setMainData(series, chartTypeRef.current, bars);
        chartRef.current?.timeScale().scrollToRealTime();
        applyIndicators();
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
          const s = seriesRef.current;
          if (s) setMainData(s, chartTypeRef.current, barsRef.current);
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
    pushMainUpdate(series, chartTypeRef.current, bar, bars);
    applyIndicators();
  }, [bid, status, tfSeconds]);

  // Bid / Ask price lines, identical to the order panel prices.
  const syncPriceLines = () => {
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
  };

  useEffect(() => {
    syncPriceLines();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bid, ask]);

  /* ---------------- indicators ---------------- */

  const applyIndicators = () => {
    const chart = chartRef.current;
    if (!chart || barsRef.current.length === 0) return;

    const desired = new Map<string, { spec: IndSpec; role: string; kind: "line" | "histogram"; data: (LineData | HistogramData)[]; color: string; isFirst: boolean }>();
    const levelSpecs = new Map<string, { value: number; color: string; title: string }[]>();
    const indBars = chartTypeRef.current === "heikin" ? heikinAshi(barsRef.current) : barsRef.current;

    for (const spec of indicators) {
      const out = computeIndicator(spec, indBars);
      for (const s of out.series) {
        const key = `${spec.id}:${s.key}`;
        desired.set(key, {
          spec,
          role: s.key,
          kind: s.kind,
          data: s.data as (LineData | HistogramData)[],
          color: indColor(spec.type, s.key),
          isFirst: s.key === out.series[0]?.key,
        });
      }
      if (out.levels?.length) levelSpecs.set(spec.id, out.levels);
    }

    // Remove series that are no longer wanted.
    for (const [key, series] of indSeriesRef.current) {
      if (!desired.has(key)) {
        chart.removeSeries(series);
        indSeriesRef.current.delete(key);
        for (const pl of indLevelsRef.current.get(key) ?? []) {
          // price lines die with their series; just drop the refs
          void pl;
        }
        indLevelsRef.current.delete(key);
      }
    }

    // Create / update wanted series.
    let needsSubPane = false;
    for (const [key, item] of desired) {
      const paneIndex =
        INDICATOR_DEFS.find((d) => d.type === item.spec.type)?.pane === "sub" ? 1 : undefined;
      if (paneIndex === 1) needsSubPane = true;
      let series = indSeriesRef.current.get(key);
      if (!series) {
        if (item.kind === "histogram") {
          series = chart.addSeries(
            HistogramSeries,
            { priceLineVisible: false, lastValueVisible: false },
            paneIndex,
          );
        } else {
          series = chart.addSeries(
            LineSeries,
            {
              color: item.color,
              lineWidth: 1,
              priceLineVisible: false,
              lastValueVisible: false,
              crosshairMarkerVisible: false,
            },
            paneIndex,
          );
        }
        indSeriesRef.current.set(key, series);
      }
      (series as ISeriesApi<"Line">).setData(item.data as LineData[]);

      // Pane level lines (RSI 30/70, Stoch 80/20…) — attach once per indicator.
      const levels = levelSpecs.get(item.spec.id);
      if (levels && item.isFirst) {
        const existing = indLevelsRef.current.get(key) ?? [];
        for (const lv of levels) {
          const found = existing.find((p) => p.options().title === lv.title);
          if (found) found.applyOptions({ price: lv.value });
          else {
            existing.push(
              (series as ISeriesApi<"Line">).createPriceLine({
                price: lv.value,
                color: lv.color,
                title: lv.title,
                lineWidth: 1,
                lineStyle: LineStyle.Dashed,
                axisLabelVisible: false,
              }),
            );
          }
        }
        indLevelsRef.current.set(key, existing);
      }
    }

    if (needsSubPane && !indPaneReadyRef.current) {
      indPaneReadyRef.current = true;
      try {
        const pane = chart.panes()[1] as { setStretchFactor?: (f: number) => void } | undefined;
        pane?.setStretchFactor?.(0.28);
      } catch {
        // pane API optional — indicators still render
      }
    }
  };

  // Recompute whenever the indicator set changes or new history arrives.
  useEffect(() => {
    localStorage.setItem(IND_KEY, JSON.stringify(indicators));
    if (status === "ready") applyIndicators();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indicators, status]);

  const addIndicator = (type: IndicatorType) => {
    const def = INDICATOR_DEFS.find((d) => d.type === type);
    const id = `${type.toLowerCase()}-${Date.now()}`;
    setIndicators((prev) => [...prev, { id, type, length: def?.defaultLength ?? 14 }]);
  };

  const removeIndicator = (id: string) =>
    setIndicators((prev) => prev.filter((i) => i.id !== id));

  const setIndicatorLength = (id: string, length: number) =>
    setIndicators((prev) =>
      prev.map((i) => (i.id === id ? { ...i, length: Math.min(Math.max(length, 1), 200) } : i)),
    );

  const chooseTimeframe = (code: TimeframeCode) => {
    setTimeframe(code);
    localStorage.setItem(TF_KEY, code);
  };

  // Click outside closes the chart-type picker.
  useEffect(() => {
    if (!typeOpen) return;
    const onDown = (e: MouseEvent) => {
      if (typeRef.current && !typeRef.current.contains(e.target as Node)) setTypeOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [typeOpen]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="flex h-9 shrink-0 items-center border-b border-[var(--border-soft)]">
        <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto px-2">
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

        {/* CHART TYPE */}
        <div ref={typeRef} className="relative shrink-0 px-2">
          <button
            type="button"
            onClick={() => setTypeOpen((v) => !v)}
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition ${
              typeOpen
                ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                : "text-[var(--text-muted)] hover:bg-[var(--bg-glass)] hover:text-[var(--text-main)]"
            }`}
          >
            {CHART_TYPES.find((t) => t.type === chartType)?.label ?? "Chart"}
          </button>

          {typeOpen ? (
            <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-1 shadow-xl">
              {CHART_TYPES.map((t) => (
                <button
                  key={t.type}
                  type="button"
                  onClick={() => chooseChartType(t.type)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] font-medium transition ${
                    chartType === t.type
                      ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                      : "text-[var(--text-main)] hover:bg-[var(--bg-glass)]"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      chartType === t.type ? "bg-[var(--primary)]" : "bg-[var(--border-strong)]"
                    }`}
                  />
                  {t.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {/* INDICATORS */}
        <div className="relative shrink-0 px-2">
          <button
            type="button"
            onClick={() => setIndOpen(true)}
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition ${
              indicators.length > 0
                ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                : "text-[var(--text-muted)] hover:bg-[var(--bg-glass)] hover:text-[var(--text-main)]"
            }`}
          >
            Indicators
            {indicators.length > 0 ? ` (${indicators.length})` : ""}
          </button>
        </div>
      </div>

      <IndicatorModal
        open={indOpen}
        onClose={() => setIndOpen(false)}
        indicators={indicators}
        onAdd={addIndicator}
        onRemove={removeIndicator}
        onLength={setIndicatorLength}
      />
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
