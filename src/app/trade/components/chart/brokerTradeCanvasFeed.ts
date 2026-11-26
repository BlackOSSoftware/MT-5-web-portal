/**
 * TradeCanvas DataFeed backed by the broker `/chart/candles` API.
 * Live forming bars are pushed from React via `pushBrokerLiveBar` (bid ticks).
 */
import type { DataFeed, FeedSubscriber, OHLCBar, TimeFrame } from "@tradecanvas/chart";
import { normalizeApiBaseUrl } from "@/api/baseUrl";
import { getTradeTokenFromStorageSync } from "@/lib/tradeToken";

/** Broker timeframe codes ↔ TradeCanvas TimeFrame strings. */
const BROKER_TF: Record<string, string> = {
  "1m": "M1",
  "5m": "M5",
  "15m": "M15",
  "30m": "M30",
  "1h": "H1",
  "4h": "H4",
  "1d": "D1",
};

const TF_SECONDS: Record<string, number> = {
  "1m": 60,
  "5m": 300,
  "15m": 900,
  "30m": 1800,
  "1h": 3600,
  "4h": 14400,
  "1d": 86400,
};

export const BROKER_SUPPORTED_TIMEFRAMES = [
  "1m",
  "5m",
  "15m",
  "30m",
  "1h",
  "4h",
  "1d",
] as const satisfies readonly TimeFrame[];

export function toBrokerTimeframe(tf: string): string {
  return BROKER_TF[tf] ?? "M5";
}

export function tfSeconds(tf: string): number {
  return TF_SECONDS[tf] ?? 300;
}

type ApiCandle = { t: number; o: number; h: number; l: number; c: number; v?: number };

type ManualPriceEvent = {
  id: string;
  symbol: string;
  prevBid: number | null;
  prevAsk: number | null;
  bid: number;
  ask: number;
  createdAt: string;
};

function apiBase(): string {
  return normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_URL).replace(/\/$/, "");
}

function toOhlc(k: ApiCandle): OHLCBar {
  return {
    time: k.t * 1000, // TradeCanvas expects milliseconds
    open: k.o,
    high: k.h,
    low: k.l,
    close: k.c,
    volume: Number(k.v) || 0,
  };
}

async function fetchCandles(
  symbol: string,
  brokerTf: string,
  limit: number,
  beforeSec: number | undefined,
  signal: AbortSignal,
): Promise<{ bars: OHLCBar[]; hasMore: boolean }> {
  const params = new URLSearchParams({
    symbol,
    timeframe: brokerTf,
    limit: String(Math.min(Math.max(limit, 1), 1000)),
  });
  if (beforeSec != null && Number.isFinite(beforeSec)) {
    params.set("before", String(beforeSec));
  }
  const res = await fetch(`${apiBase()}/chart/candles?${params}`, { signal });
  const json = (await res.json().catch(() => null)) as {
    status?: string;
    message?: string;
    data?: { candles?: ApiCandle[]; hasMore?: boolean };
  } | null;
  if (!res.ok || json?.status !== "success") {
    throw new Error(json?.message || `Chart HTTP ${res.status}`);
  }
  const candles = json?.data?.candles ?? [];
  return {
    bars: candles.map(toOhlc),
    hasMore: Boolean(json?.data?.hasMore),
  };
}

async function fetchManualPriceEvents(symbol: string): Promise<ManualPriceEvent[]> {
  try {
    const token = getTradeTokenFromStorageSync();
    if (!token) return [];
    const res = await fetch(
      `${apiBase()}/chart/manual-price-events?symbol=${encodeURIComponent(symbol)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const json = (await res.json().catch(() => null)) as {
      status?: string;
      data?: { events?: ManualPriceEvent[] };
    } | null;
    if (!res.ok || json?.status !== "success") return [];
    return Array.isArray(json?.data?.events) ? json.data.events : [];
  } catch {
    return [];
  }
}

function applyManualPriceEvents(bars: OHLCBar[], events: ManualPriceEvent[], seconds: number): OHLCBar[] {
  if (!events.length || !bars.length) return bars;
  const out = bars.map((b) => ({ ...b }));
  for (const ev of events) {
    const target = Number(ev.bid);
    const prev = Number(ev.prevBid ?? ev.prevAsk);
    if (!Number.isFinite(target) || target <= 0) continue;
    const ms = new Date(ev.createdAt).getTime();
    if (!Number.isFinite(ms)) continue;
    let idx = -1;
    for (let i = out.length - 1; i >= 0; i--) {
      if (out[i].time <= ms) {
        idx = i;
        break;
      }
    }
    if (idx < 0) continue;
    if (ms >= out[idx].time + seconds * 1000) continue;
    const prices = [target];
    if (Number.isFinite(prev) && prev > 0) prices.push(prev);
    const b = out[idx];
    b.high = Math.max(b.high, ...prices);
    b.low = Math.min(b.low, ...prices);
    b.close = target;
  }
  return out;
}

type SubKey = string;
function subKey(symbol: string, timeframe: string): SubKey {
  return `${symbol.toUpperCase()}::${timeframe}`;
}

const subscribers = new Map<SubKey, Set<FeedSubscriber>>();
/** Last closed/history bar per series — used to build the forming candle from bid. */
const lastBars = new Map<SubKey, OHLCBar>();

export function getLastBrokerBar(symbol: string, timeframe: string): OHLCBar | undefined {
  return lastBars.get(subKey(symbol, timeframe));
}

export function rememberBrokerBars(symbol: string, timeframe: string, bars: OHLCBar[]): void {
  if (!bars.length) return;
  lastBars.set(subKey(symbol, timeframe), bars[bars.length - 1]);
}

/** Push a live forming (or just-closed) bar to all TradeCanvas subscribers. */
export function pushBrokerLiveBar(
  symbol: string,
  timeframe: string,
  bar: OHLCBar,
  closed: boolean,
): void {
  const key = subKey(symbol, timeframe);
  lastBars.set(key, bar);
  const set = subscribers.get(key);
  if (!set) return;
  for (const sub of set) {
    try {
      sub.bar(bar, closed);
    } catch {
      // ignore subscriber errors
    }
  }
}

/**
 * Build / update the forming candle from the broker bid (same source as the order panel).
 */
export function applyBidToFormingBar(
  symbol: string,
  timeframe: TimeFrame | string,
  bid: number,
): void {
  if (!Number.isFinite(bid) || bid <= 0) return;
  const tf = String(timeframe);
  const seconds = tfSeconds(tf);
  const nowMs = Date.now();
  const bucket = Math.floor(nowMs / 1000 / seconds) * seconds * 1000;
  const key = subKey(symbol, tf);
  const prev = lastBars.get(key);

  if (prev && prev.time > bucket) {
    // Stale clock / already ahead — just update close on prev if same bucket family
    return;
  }

  if (prev && prev.time === bucket) {
    const next: OHLCBar = {
      ...prev,
      high: Math.max(prev.high, bid),
      low: Math.min(prev.low, bid),
      close: bid,
    };
    pushBrokerLiveBar(symbol, tf, next, false);
    return;
  }

  // Rollover: close previous if it exists and belongs to prior bucket
  if (prev && prev.time < bucket) {
    pushBrokerLiveBar(symbol, tf, prev, true);
  }

  const open = prev && prev.time < bucket ? prev.close : bid;
  const forming: OHLCBar = {
    time: bucket,
    open,
    high: Math.max(open, bid),
    low: Math.min(open, bid),
    close: bid,
    volume: 0,
  };
  pushBrokerLiveBar(symbol, tf, forming, false);
}

export const brokerTradeCanvasFeed: DataFeed = {
  name: "broker",
  supportedTimeframes: BROKER_SUPPORTED_TIMEFRAMES,
  pagesBack: true,

  async getBars({ symbol, timeframe, countBack, before, signal }) {
    const tf = String(timeframe);
    const brokerTf = toBrokerTimeframe(tf);
    const seconds = tfSeconds(tf);
    const beforeSec =
      before != null && Number.isFinite(before)
        ? before > 1e12
          ? Math.floor(before / 1000)
          : Math.floor(before)
        : undefined;

    const { bars } = await fetchCandles(symbol, brokerTf, countBack, beforeSec, signal);
    let merged = bars;
    if (!beforeSec) {
      try {
        const events = await fetchManualPriceEvents(symbol);
        if (events.length) merged = applyManualPriceEvents(bars, events, seconds);
      } catch {
        merged = bars;
      }
      rememberBrokerBars(symbol, tf, merged);
    }
    return merged;
  },

  subscribeBars({ symbol, timeframe }, subscriber) {
    const key = subKey(symbol, String(timeframe));
    let set = subscribers.get(key);
    if (!set) {
      set = new Set();
      subscribers.set(key, set);
    }
    set.add(subscriber);
    subscriber.connection("connected");
    return () => {
      set?.delete(subscriber);
      if (set && set.size === 0) subscribers.delete(key);
    };
  },

  async resolveSymbol(symbol: string) {
    const s = symbol.toUpperCase();
    return {
      symbol: s,
      description: s,
      type: "forex",
      exchange: "BROKER",
      pricePrecision: 5,
      minTick: 0.00001,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Etc/UTC",
    };
  },
};
