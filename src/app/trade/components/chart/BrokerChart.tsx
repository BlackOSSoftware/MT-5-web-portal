"use client";

import { memo, useEffect, useRef, useState, type MutableRefObject, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
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
  type LineWidth,
  type UTCTimestamp,
} from "lightweight-charts";
import {
  ArrowUpRight,
  Eraser,
  Loader2,
  Minus,
  MousePointer2,
  MoveVertical,
  PenLine,
  Square,
  Trash2,
  Type,
} from "lucide-react";
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
import { getTradeTokenFromStorageSync } from "@/lib/tradeToken";

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

/* ---------------- manual price events (broker-scoped admin movements) ---------------- */

type ManualPriceEvent = {
  id: string;
  symbol: string;
  prevBid: number | null;
  prevAsk: number | null;
  bid: number;
  ask: number;
  createdAt: string;
};

async function fetchManualPriceEvents(symbol: string): Promise<ManualPriceEvent[]> {
  try {
    const base = normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_URL).replace(/\/$/, "");
    const token = getTradeTokenFromStorageSync();
    if (!token) return [];
    const res = await fetch(
      `${base}/chart/manual-price-events?symbol=${encodeURIComponent(symbol)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const json = await res.json().catch(() => null);
    if (!res.ok || json?.status !== "success") return [];
    const events = json?.data?.events;
    return Array.isArray(events) ? events : [];
  } catch {
    return [];
  }
}

/**
 * Retain admin-driven price movements in historical candles: extend the
 * candle that contains the event time with the event's high/low and close
 * at the target price. Live movement itself arrives via the market socket.
 */
function applyManualPriceEvents(bars: Bar[], events: ManualPriceEvent[], tfSeconds: number): Bar[] {
  if (!events.length || !bars.length) return bars;
  const out = bars.map((b) => ({ ...b }));
  for (const ev of events) {
    const target = Number(ev.bid);
    const prev = Number(ev.prevBid ?? ev.prevAsk);
    if (!Number.isFinite(target) || target <= 0) continue;
    const ms = new Date(ev.createdAt).getTime();
    if (!Number.isFinite(ms)) continue;
    const t = Math.floor(ms / 1000) + TZ_SHIFT;
    // Last candle whose open time <= event time.
    let idx = -1;
    for (let i = out.length - 1; i >= 0; i--) {
      if (Number(out[i].time) <= t) {
        idx = i;
        break;
      }
    }
    if (idx < 0) continue;
    const bt = Number(out[idx].time);
    if (t >= bt + tfSeconds) continue; // event outside loaded history
    const b = out[idx];
    const prices = [target];
    if (Number.isFinite(prev) && prev > 0) prices.push(prev);
    b.high = Math.max(b.high, ...prices);
    b.low = Math.min(b.low, ...prices);
    b.close = target;
  }
  return out;
}

/* ---------------- drawing tools ---------------- */

type DrawTool =
  | "cursor"
  | "trend"
  | "ray"
  | "hline"
  | "vline"
  | "rect"
  | "text"
  | "eraser";

type DrawPoint = { time: number; price: number };
type DrawingKind = "trend" | "ray" | "hline" | "vline" | "rect" | "text";
type Drawing = { id: string; kind: DrawingKind; points: DrawPoint[]; text?: string };

const DRAW_TOOLS: { key: DrawTool; label: string; icon: typeof PenLine }[] = [
  { key: "cursor", label: "Cursor", icon: MousePointer2 },
  { key: "trend", label: "Trend line", icon: PenLine },
  { key: "ray", label: "Ray", icon: ArrowUpRight },
  { key: "hline", label: "Horizontal line", icon: Minus },
  { key: "vline", label: "Vertical line", icon: MoveVertical },
  { key: "rect", label: "Rectangle", icon: Square },
  { key: "text", label: "Text", icon: Type },
  { key: "eraser", label: "Eraser", icon: Eraser },
];

const DRAW_COLOR = "#2962FF";
const DRAW_KEY = (symbol: string) => `broker-drawings-${symbol}`;

function loadDrawings(symbol: string): Drawing[] {
  if (typeof window === "undefined" || !symbol) return [];
  try {
    const raw = JSON.parse(localStorage.getItem(DRAW_KEY(symbol)) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}

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
        ...(typeof i.color === "string" && /^#[0-9a-fA-F]{6}$/.test(i.color)
          ? { color: i.color }
          : {}),
        ...(Number.isFinite(Number(i.width))
          ? { width: Math.min(Math.max(Math.round(Number(i.width)), 1), 4) }
          : {}),
        ...(i.visible === false ? { visible: false } : {}),
        ...(i.source === "open" || i.source === "high" || i.source === "low" || i.source === "close"
          ? { source: i.source }
          : {}),
      }));
  } catch {
    return [];
  }
}

function readVar(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

/* ---------------- trade overlay (entry / SL / TP on chart) ---------------- */

export type ChartTradePosition = {
  positionId: string;
  side: "BUY" | "SELL";
  volume: number;
  openPrice: number;
  stopLoss: number | null;
  takeProfit: number | null;
};

export type TradeOverlayProps = {
  position: ChartTradePosition | null;
  onModify: (
    positionId: string,
    patch: { stopLoss?: number | null; takeProfit?: number | null },
  ) => Promise<void>;
};

export default function BrokerChart({
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
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<MainSeries | null>(null);
  const barsRef = useRef<Bar[]>([]);
  const bidLineRef = useRef<IPriceLine | null>(null);
  const askLineRef = useRef<IPriceLine | null>(null);
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(true);
  const indSeriesRef = useRef<Map<string, AnyIndSeries>>(new Map());
  const indLevelsRef = useRef<Map<string, IPriceLine[]>>(new Map());
  const indColorRef = useRef<Map<string, string>>(new Map());
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

  /* ---------------- drawing tools state ---------------- */
  const [tool, setTool] = useState<DrawTool>("cursor");
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [pending, setPending] = useState<DrawPoint[]>([]);
  const [hover, setHover] = useState<{ x: number; y: number; time: number; price: number } | null>(null);
  const [sizeTick, setSizeTick] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const lastDrawToolRef = useRef<DrawTool>("ray");

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
      indColorRef.current.clear();
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
      .then(async ({ bars, hasMore }) => {
        if (cancelled) return;
        let merged = bars;
        try {
          const events = await fetchManualPriceEvents(symbol);
          if (!cancelled && events.length > 0) {
            merged = applyManualPriceEvents(bars, events, tfSeconds);
          }
        } catch {
          merged = bars;
        }
        if (cancelled) return;
        barsRef.current = merged;
        hasMoreRef.current = hasMore;
        setMainData(series, chartTypeRef.current, merged);
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

  // Load / persist drawings per symbol.
  useEffect(() => {
    setDrawings(loadDrawings(symbol));
    setPending([]);
    setHover(null);
  }, [symbol]);

  useEffect(() => {
    if (!symbol) return;
    try {
      localStorage.setItem(DRAW_KEY(symbol), JSON.stringify(drawings));
    } catch {
      // storage full — ignore
    }
  }, [drawings, symbol]);

  // Re-render the SVG overlay when the viewport pans/zooms.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const onRange = () => setSizeTick((n) => n + 1);
    chart.timeScale().subscribeVisibleLogicalRangeChange(onRange);
    return () => chart.timeScale().unsubscribeVisibleLogicalRangeChange(onRange);
  }, []);

  // Track container size for full-span lines.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSizeTick((n) => n + 1));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const toXY = (time: number, price: number): { x: number; y: number } | null => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!chart || !series) return null;
    const x = chart.timeScale().timeToCoordinate(time as UTCTimestamp);
    const y = series.priceToCoordinate(price);
    if (x == null || y == null) return null;
    return { x, y };
  };

  const ONE_POINT: DrawingKind[] = ["hline", "vline", "text"];
  const TWO_POINT: DrawingKind[] = ["trend", "ray", "rect"];

  const finishDrawing = (kind: DrawingKind, pts: DrawPoint[], text?: string) => {
    setDrawings((prev) => [
      ...prev,
      { id: `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, kind, points: pts, text },
    ]);
    // Keep the tool ON so multiple drawings can be placed in one session.
    // User turns it OFF by clicking the active toolbar button (or Cursor).
    setPending([]);
  };

  const handleDrawClick = (pt: DrawPoint) => {
    if (tool === "cursor" || tool === "eraser") return;
    const kind = tool as DrawingKind;
    if (ONE_POINT.includes(kind)) {
      if (kind === "text") {
        const txt = window.prompt("Drawing text");
        if (txt && txt.trim()) finishDrawing(kind, [pt], txt.trim());
        else setPending([]);
        return;
      }
      finishDrawing(kind, [pt]);
      return;
    }
    if (TWO_POINT.includes(kind)) {
      if (pending.length === 0) {
        setPending([pt]);
      } else {
        finishDrawing(kind, [pending[0], pt]);
      }
    }
  };

  const handleEraserClick = (x: number, y: number) => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!chart || !series) return;
    const hit = drawings.find((d) => {
      const pts = d.points.map((p) => toXY(p.time, p.price)).filter(Boolean) as { x: number; y: number }[];
      if (pts.length === 0) return false;
      if (d.kind === "hline" || d.kind === "vline") {
        const p = pts[0];
        if (d.kind === "hline") return Math.abs(y - p.y) < 6;
        return Math.abs(x - p.x) < 6;
      }
      if (d.kind === "text") {
        return Math.hypot(x - pts[0].x, y - pts[0].y) < 14;
      }
      for (let i = 0; i < pts.length - 1; i++) {
        if (distToSegment(x, y, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y) < 6) return true;
      }
      return false;
    });
    if (hit) setDrawings((prev) => prev.filter((d) => d.id !== hit.id));
    void chart;
  };

  // Click-to-draw + eraser.
  useEffect(() => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!chart || !series) return;
    const onClick = (param: Parameters<Parameters<IChartApi["subscribeClick"]>[0]>[0]) => {
      if (tool === "cursor") return;
      const t = param.time;
      const y = param.point?.y;
      if (t == null || y == null) return;
      const price = series.coordinateToPrice(y);
      if (price == null || !Number.isFinite(price)) return;
      const pt = { time: Number(t), price };
      if (tool === "eraser") {
        handleEraserClick(param.point!.x, param.point!.y);
        return;
      }
      handleDrawClick(pt);
    };
    chart.subscribeClick(onClick);
    return () => chart.unsubscribeClick(onClick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool, drawings, pending, symbol]);

  // Hover preview while a drawing is in progress.
  useEffect(() => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!chart || !series) return;
    const onMove = (param: Parameters<Parameters<IChartApi["subscribeCrosshairMove"]>[0]>[0]) => {
      if (tool === "cursor" || tool === "eraser" || pending.length === 0) {
        setHover(null);
        return;
      }
      const t = param.time;
      const y = param.point?.y;
      const x = param.point?.x;
      if (t == null || y == null || x == null) {
        setHover(null);
        return;
      }
      const price = series.coordinateToPrice(y);
      if (price == null || !Number.isFinite(price)) {
        setHover(null);
        return;
      }
      setHover({ x, y, time: Number(t), price });
    };
    chart.subscribeCrosshairMove(onMove);
    return () => chart.unsubscribeCrosshairMove(onMove);
  }, [tool, pending.length]);

  // Crosshair lines only while a drawing tool is active — clean chart otherwise.
  useEffect(() => {
    chartRef.current?.applyOptions({
      crosshair: {
        mode: tool === "cursor" ? CrosshairMode.Hidden : CrosshairMode.Normal,
      },
    });
  }, [tool]);

  // Escape cancels an in-progress drawing.
  useEffect(() => {
    if (pending.length === 0) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPending([]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending.length]);

  // Toggle behavior: clicking the active tool turns it OFF (back to cursor);
  // clicking a different tool switches to it. Cursor = all drawing OFF.
  const chooseDrawTool = (next: DrawTool) => {
    if (next !== "cursor" && next !== "eraser") lastDrawToolRef.current = next;
    setTool((prev) => (prev === next ? "cursor" : next));
    setPending([]);
    setHover(null);
  };

  // Master ON/OFF for drawing mode: ON re-enables the last used draw tool,
  // OFF returns to cursor (normal chart interactions, drawings preserved).
  const toggleDrawMode = () => {
    if (tool === "cursor") {
      chooseDrawTool(lastDrawToolRef.current);
    } else {
      chooseDrawTool(tool);
    }
  };

  const clearDrawings = () => {
    setDrawings([]);
    setPending([]);
  };

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

    const desired = new Map<string, { spec: IndSpec; role: string; kind: "line" | "histogram"; data: (LineData | HistogramData)[]; color: string; width?: number; isFirst: boolean }>();
    const levelSpecs = new Map<string, { value: number; color: string; title: string }[]>();
    const indBars = chartTypeRef.current === "heikin" ? heikinAshi(barsRef.current) : barsRef.current;

    for (const spec of indicators) {
      if (spec.visible === false) continue;
      const out = computeIndicator(spec, indBars);
      for (const s of out.series) {
        const key = `${spec.id}:${s.key}`;
        desired.set(key, {
          spec,
          role: s.key,
          kind: s.kind,
          data: s.data as (LineData | HistogramData)[],
          color:
            spec.color && s.kind === "line" && out.series.length === 1
              ? spec.color
              : indColor(spec.type, s.key),
          width: spec.width,
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
        indColorRef.current.delete(key);
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
              lineWidth: (item.width ?? 1) as LineWidth,
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
      if (item.kind === "line") {
        const prevStyle = indColorRef.current.get(key);
        const nextStyle = `${item.color}|${item.width ?? 1}`;
        if (prevStyle !== nextStyle) {
          (series as ISeriesApi<"Line">).applyOptions({
            color: item.color,
            lineWidth: (item.width ?? 1) as LineWidth,
          });
          indColorRef.current.set(key, nextStyle);
        }
      }

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

  const setIndicatorColor = (id: string, color: string) =>
    setIndicators((prev) =>
      prev.map((i) =>
        i.id === id && /^#[0-9a-fA-F]{6}$/.test(color) ? { ...i, color } : i,
      ),
    );

  const setIndicatorWidth = (id: string, width: number) =>
    setIndicators((prev) =>
      prev.map((i) =>
        i.id === id
          ? { ...i, width: Math.min(Math.max(Math.round(width) || 1, 1), 4) }
          : i,
      ),
    );

  const setIndicatorVisible = (id: string, visible: boolean) =>
    setIndicators((prev) => prev.map((i) => (i.id === id ? { ...i, visible } : i)));

  const setIndicatorSource = (id: string, source: IndSpec["source"]) =>
    setIndicators((prev) => prev.map((i) => (i.id === id ? { ...i, source } : i)));

  const resetIndicator = (id: string) => {
    setIndicators((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        const d = INDICATOR_DEFS.find((x) => x.type === i.type);
        const { color: _c, width: _w, visible: _v, source: _s, ...rest } = i;
        return { ...rest, length: d?.defaultLength ?? i.length };
      }),
    );
  };

  const chooseTimeframe = (code: TimeframeCode) => {
    setTimeframe(code);
    localStorage.setItem(TF_KEY, code);
  };

  /* ---------------- drawing overlay geometry ---------------- */
  void sizeTick; // re-render on pan/zoom/resize
  const drawW = wrapRef.current?.clientWidth ?? 0;
  const drawH = wrapRef.current?.clientHeight ?? 0;

  const rayEnds = (a: { x: number; y: number }, b: { x: number; y: number }, w: number) => {
    const dx = b.x - a.x;
    if (Math.abs(dx) < 0.001) return [a, b] as const;
    const dy = b.y - a.y;
    const t0 = (0 - a.x) / dx;
    const t1 = (w - a.x) / dx;
    const tA = Math.min(t0, t1);
    const tB = Math.max(t0, t1);
    return [
      { x: a.x + dx * tA, y: a.y + dy * tA },
      { x: a.x + dx * tB, y: a.y + dy * tB },
    ] as const;
  };

  const stroke = { stroke: DRAW_COLOR, strokeWidth: 1.5, strokeDasharray: "4 3" } as const;

  const drawEls: ReactNode[] = [];
  for (const d of drawings) {
    const pts = d.points
      .map((p) => toXY(p.time, p.price))
      .filter(Boolean) as { x: number; y: number }[];
    if (pts.length === 0) continue;
    const key = d.id;
    if (d.kind === "hline" && pts[0]) {
      drawEls.push(<line key={key} x1={0} x2={drawW} y1={pts[0].y} y2={pts[0].y} {...stroke} />);
    } else if (d.kind === "vline" && pts[0]) {
      drawEls.push(<line key={key} x1={pts[0].x} x2={pts[0].x} y1={0} y2={drawH} {...stroke} />);
    } else if (d.kind === "trend" && pts.length >= 2) {
      drawEls.push(<line key={key} x1={pts[0].x} y1={pts[0].y} x2={pts[1].x} y2={pts[1].y} {...stroke} />);
    } else if (d.kind === "ray" && pts.length >= 2) {
      const [a, b] = rayEnds(pts[0], pts[1], drawW);
      drawEls.push(<line key={key} x1={a.x} y1={a.y} x2={b.x} y2={b.y} {...stroke} />);
    } else if (d.kind === "rect" && pts.length >= 2) {
      const x = Math.min(pts[0].x, pts[1].x);
      const y = Math.min(pts[0].y, pts[1].y);
      drawEls.push(
        <rect
          key={key}
          x={x}
          y={y}
          width={Math.abs(pts[1].x - pts[0].x)}
          height={Math.abs(pts[1].y - pts[0].y)}
          fill="rgba(41,98,255,0.08)"
          stroke={DRAW_COLOR}
          strokeWidth={1}
          strokeDasharray="4 3"
        />,
      );
    } else if (d.kind === "text" && pts[0] && d.text) {
      drawEls.push(
        <text
          key={key}
          x={pts[0].x + 4}
          y={pts[0].y - 4}
          fill={DRAW_COLOR}
          fontSize={12}
          fontWeight={600}
          style={{ paintOrder: "stroke", stroke: "var(--bg-card)", strokeWidth: 3 }}
        >
          {d.text}
        </text>,
      );
    }
  }

  // In-progress preview (first point placed, cursor moving).
  if (pending.length === 1 && hover && TWO_POINT.includes(tool as DrawingKind)) {
    const a = toXY(pending[0].time, pending[0].price);
    const b = { x: hover.x, y: hover.y };
    if (a) {
      if (tool === "ray") {
        const [p, q] = rayEnds(a, b, drawW);
        drawEls.push(<line key="__preview" x1={p.x} y1={p.y} x2={q.x} y2={q.y} {...stroke} />);
      } else if (tool === "rect") {
        drawEls.push(
          <rect
            key="__preview"
            x={Math.min(a.x, b.x)}
            y={Math.min(a.y, b.y)}
            width={Math.abs(b.x - a.x)}
            height={Math.abs(b.y - a.y)}
            fill="rgba(41,98,255,0.08)"
            stroke={DRAW_COLOR}
            strokeWidth={1}
            strokeDasharray="4 3"
          />,
        );
      } else {
        drawEls.push(<line key="__preview" x1={a.x} y1={a.y} x2={b.x} y2={b.y} {...stroke} />);
      }
    }
  }

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

        {/* DRAWING TOOLS */}
        <div className="flex shrink-0 items-center gap-0.5 overflow-x-auto px-1">
          {DRAW_TOOLS.map((t) => {
            const Icon = t.icon;
            const active = tool === t.key;
            return (
              <button
                key={t.key}
                type="button"
                title={`${t.label} — ${active ? "ON (click to turn off)" : "OFF"}`}
                aria-pressed={active}
                aria-label={`${t.label} ${active ? "on" : "off"}`}
                onClick={() => chooseDrawTool(t.key)}
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-md transition ${
                  active
                    ? "bg-[var(--primary)] text-white"
                    : "text-[var(--text-muted)] hover:bg-[var(--bg-glass)] hover:text-white"
                }`}
              >
                <Icon size={13} />
              </button>
            );
          })}
          {drawings.length > 0 ? (
            <button
              type="button"
              title="Clear all drawings"
              onClick={clearDrawings}
              className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-[var(--text-muted)] transition hover:bg-[var(--loss)]/10 hover:text-[var(--loss)]"
            >
              <Trash2 size={13} />
            </button>
          ) : null}
        </div>

        {/* DRAW MODE ON/OFF TOGGLE */}
        <div className="flex shrink-0 items-center px-1">
          <button
            type="button"
            title={tool === "cursor" ? "Drawing OFF — click to turn ON" : "Drawing ON — click to turn OFF"}
            aria-pressed={tool !== "cursor"}
            onClick={toggleDrawMode}
            className={`flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wide transition ${
              tool !== "cursor"
                ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                : "border-[var(--card-border)] bg-[var(--input-bg)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                tool !== "cursor" ? "bg-white" : "bg-[var(--text-muted)]"
              }`}
            />
            {tool === "cursor" ? "OFF" : "ON"}
          </button>
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
        onColor={setIndicatorColor}
        onWidth={setIndicatorWidth}
        onVisible={setIndicatorVisible}
        onSource={setIndicatorSource}
        onReset={resetIndicator}
      />
      <div ref={wrapRef} className="relative min-h-0 flex-1">
        <div ref={hostRef} className="absolute inset-0" />
        {/* Drawing overlay */}
        <svg className="pointer-events-none absolute inset-0 z-[5] h-full w-full">
          {drawEls}
        </svg>
        {/* Trade overlay (entry / SL / TP) — isolated so drag re-renders stay cheap */}
        <TradeOverlaySvg
          series={seriesRef.current}
          position={tradeOverlay?.position ?? null}
          digits={digits}
          drawW={drawW}
          drawH={drawH}
          onModify={tradeOverlay?.onModify}
        />
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

/* ---------------- trade overlay (entry / SL / TP) — isolated for smooth drag ---------------- */

const TradeOverlaySvg = memo(function TradeOverlaySvg({
  series,
  position,
  digits,
  drawW,
  drawH,
  onModify,
}: {
  series: MainSeries | null;
  position: ChartTradePosition | null;
  digits: number;
  drawW: number;
  drawH: number;
  onModify?: TradeOverlayProps["onModify"];
}) {
  const [levels, setLevels] = useState<{ sl: number | null; tp: number | null }>({ sl: null, tp: null });
  const [dragging, setDragging] = useState<"sl" | "tp" | null>(null);
  const levelsRef = useRef(levels);
  levelsRef.current = levels;
  const posRef = useRef(position);
  posRef.current = position;
  const svgRef = useRef<SVGSVGElement>(null);
  const linesRef = useRef<{ entry: IPriceLine | null; sl: IPriceLine | null; tp: IPriceLine | null }>({
    entry: null,
    sl: null,
    tp: null,
  });

  const isBuy = position?.side === "BUY";
  const entryColor = isBuy ? UP : DOWN;
  const labelStyle = { paintOrder: "stroke", stroke: "var(--bg-card)", strokeWidth: 3 } as const;

  // Reset displayed levels whenever the selected position (or its server levels) changes.
  useEffect(() => {
    setLevels({ sl: position?.stopLoss ?? null, tp: position?.takeProfit ?? null });
  }, [position?.positionId, position?.stopLoss, position?.takeProfit]);

  // Create / destroy price lines on the series.
  useEffect(() => {
    const lines = linesRef.current;
    const clear = () => {
      if (!series) return;
      if (lines.entry) {
        series.removePriceLine(lines.entry);
        lines.entry = null;
      }
      if (lines.sl) {
        series.removePriceLine(lines.sl);
        lines.sl = null;
      }
      if (lines.tp) {
        series.removePriceLine(lines.tp);
        lines.tp = null;
      }
    };
    clear();
    if (!series || !position) return;
    const mk = (price: number, title: string, color: string, style: LineStyle) =>
      series.createPriceLine({
        price,
        color,
        title,
        lineWidth: 1,
        lineStyle: style,
        axisLabelVisible: true,
      });
    if (position.openPrice > 0) {
      lines.entry = mk(
        position.openPrice,
        `${position.side} ${Number(position.volume || 0).toFixed(2)} @ ${position.openPrice.toFixed(digits)}`,
        isBuy ? UP : DOWN,
        LineStyle.Solid,
      );
    }
    const lv = { sl: position.stopLoss ?? null, tp: position.takeProfit ?? null };
    if (lv.sl != null && lv.sl > 0) {
      lines.sl = mk(lv.sl, `SL ${lv.sl.toFixed(digits)}`, DOWN, LineStyle.Dashed);
    }
    if (lv.tp != null && lv.tp > 0) {
      lines.tp = mk(lv.tp, `TP ${lv.tp.toFixed(digits)}`, UP, LineStyle.Dashed);
    }
    return clear;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series, position?.positionId, position?.side, position?.volume, position?.openPrice, digits]);

  // Keep price lines in sync with dragged levels (imperative canvas update).
  useEffect(() => {
    const lines = linesRef.current;
    if (lines.sl && levels.sl != null) lines.sl.applyOptions({ price: levels.sl });
    if (lines.tp && levels.tp != null) lines.tp.applyOptions({ price: levels.tp });
  }, [levels]);

  const clampLevel = (kind: "sl" | "tp", price: number, pos: ChartTradePosition) => {
    const tick = 1 / 10 ** digits;
    const open = pos.openPrice;
    const buy = pos.side === "BUY";
    let clamped: number;
    if (kind === "tp") {
      clamped = buy ? Math.max(price, open + tick) : Math.min(price, open - tick);
    } else {
      clamped = buy ? Math.min(price, open - tick) : Math.max(price, open + tick);
    }
    const dp = Math.max(0, Math.min(digits, 3));
    return Number(clamped.toFixed(dp));
  };

  const startDrag = (kind: "sl" | "tp", e: ReactPointerEvent<SVGGElement>) => {
    const pos = posRef.current;
    const s = series;
    if (!pos || !s || drawW <= 0) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {
      // pointer capture optional
    }
    setDragging(kind);
    const onMove = (ev: PointerEvent) => {
      ev.preventDefault();
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      const y = ev.clientY - rect.top;
      const price = s.coordinateToPrice(y);
      if (price == null || !Number.isFinite(price)) return;
      const clamped = clampLevel(kind, price, pos);
      const line = kind === "sl" ? linesRef.current.sl : linesRef.current.tp;
      line?.applyOptions({ price: clamped });
      setLevels((prev) => ({ ...prev, [kind]: clamped }));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setDragging(null);
      const current = posRef.current;
      if (!current || !onModify) return;
      const lv = levelsRef.current;
      const patch = kind === "sl" ? { stopLoss: lv.sl } : { takeProfit: lv.tp };
      void onModify(current.positionId, patch).catch(() => {
        // Revert to server values on failure.
        setLevels({ sl: current.stopLoss, tp: current.takeProfit });
      });
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  if (!position || !series || drawW <= 0 || drawH <= 0) return null;

  const yOf = (p: number) => series.priceToCoordinate(p);
  const handleX = Math.max(drawW - 16, 12);
  const renderLevel = (
    key: string,
    price: number | null,
    color: string,
    dashed: boolean,
    label: string,
    draggable: "sl" | "tp" | null,
  ) => {
    if (price == null || !(price > 0)) return null;
    const y = yOf(price);
    if (y == null) return null;
    const active = dragging === draggable;
    return (
      <g key={key}>
        <line
          x1={0}
          x2={drawW}
          y1={y}
          y2={y}
          stroke={color}
          strokeWidth={active ? 2 : 1.25}
          strokeDasharray={dashed ? "6 4" : undefined}
          opacity={active ? 1 : 0.9}
        />
        <text
          x={drawW - 8}
          y={y - 4}
          textAnchor="end"
          fill={color}
          fontSize={11}
          fontWeight={700}
          style={labelStyle}
        >
          {label}
        </text>
        {draggable ? (
          <g
            onPointerDown={(e) => startDrag(draggable, e)}
            style={{ cursor: "ns-resize", pointerEvents: "auto", touchAction: "none" }}
          >
            <circle cx={handleX} cy={y} r={20} fill="transparent" />
            <circle
              cx={handleX}
              cy={y}
              r={active ? 7 : 5}
              fill={color}
              stroke="var(--bg-card)"
              strokeWidth={1.5}
            />
          </g>
        ) : null}
      </g>
    );
  };

  const entryY = position.openPrice > 0 ? yOf(position.openPrice) : null;

  return (
    <svg ref={svgRef} className="pointer-events-none absolute inset-0 z-[5] h-full w-full">
      {entryY != null ? (
        <g>
          <line x1={0} x2={drawW} y1={entryY} y2={entryY} stroke={entryColor} strokeWidth={1.5} />
          <text
            x={8}
            y={entryY - 4}
            fill={entryColor}
            fontSize={11}
            fontWeight={700}
            style={labelStyle}
          >
            {position.side} {Number(position.volume || 0).toFixed(2)} @ {position.openPrice.toFixed(digits)}
          </text>
        </g>
      ) : null}
      {renderLevel(
        "__trade-sl",
        levels.sl,
        DOWN,
        true,
        `SL ${levels.sl != null ? levels.sl.toFixed(digits) : ""}`,
        "sl",
      )}
      {renderLevel(
        "__trade-tp",
        levels.tp,
        UP,
        true,
        `TP ${levels.tp != null ? levels.tp.toFixed(digits) : ""}`,
        "tp",
      )}
    </svg>
  );
});
