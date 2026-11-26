import { normalizeApiBaseUrl } from "@/api/baseUrl";
import {
  bucketStart,
  resolutionToTf,
  tfSeconds,
  TV_RESOLUTIONS,
  type BrokerTf,
} from "./resolutions";
import { getLiveQuote, subscribeLiveQuote } from "./liveQuotes";

/** Minimal Charting Library datafeed types (avoids shipping full TV typings). */

export type TvBar = {
  time: number; // ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

type LibrarySymbolInfo = {
  ticker?: string;
  name: string;
  description: string;
  type: string;
  session: string;
  timezone: string;
  exchange: string;
  listed_exchange: string;
  minmov: number;
  pricescale: number;
  has_intraday: boolean;
  has_daily: boolean;
  has_weekly_and_monthly: boolean;
  supported_resolutions: string[];
  volume_precision: number;
  data_status: string;
  format?: string;
};

type PeriodParams = {
  from: number;
  to: number;
  countBack: number;
  firstDataRequest: boolean;
};

type HistoryCallback = (bars: TvBar[], meta: { noData?: boolean }) => void;
type ErrorCallback = (reason: string) => void;
type ResolveCallback = (symbolInfo: LibrarySymbolInfo) => void;
type SubscribeBarsCallback = (bar: TvBar) => void;

type DatafeedConfig = {
  supported_resolutions: string[];
  exchanges?: { value: string; name: string; desc: string }[];
  symbols_types?: { name: string; value: string }[];
  supports_marks?: boolean;
  supports_timescale_marks?: boolean;
  supports_time?: boolean;
};

type ApiCandle = { t: number; o: number; h: number; l: number; c: number };

type SubState = {
  symbol: string;
  tf: BrokerTf;
  resolution: string;
  lastBar: TvBar | null;
  onTick: SubscribeBarsCallback;
  unsubQuote: () => void;
};

const lastBars = new Map<string, TvBar>();
const subs = new Map<string, SubState>();

function apiBase() {
  return normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_URL).replace(/\/$/, "");
}

function digitsToPriceScale(digits: number) {
  const d = Math.min(Math.max(Math.floor(digits) || 5, 0), 8);
  return 10 ** d;
}

async function fetchCandlePage(
  symbol: string,
  timeframe: BrokerTf,
  before: number | undefined,
  limit: number,
): Promise<{ candles: ApiCandle[]; hasMore: boolean; digits: number }> {
  const params = new URLSearchParams({
    symbol,
    timeframe,
    limit: String(Math.min(Math.max(limit, 1), 1000)),
  });
  if (before && before > 0) params.set("before", String(before));
  const res = await fetch(`${apiBase()}/chart/candles?${params}`);
  const json = await res.json().catch(() => null);
  if (!res.ok || json?.status !== "success") {
    throw new Error(json?.message || "Chart history unavailable");
  }
  const candles: ApiCandle[] = Array.isArray(json.data?.candles) ? json.data.candles : [];
  return {
    candles,
    hasMore: Boolean(json.data?.hasMore),
    digits: Number(json.data?.digits) || 5,
  };
}

function toTvBar(c: ApiCandle): TvBar {
  return {
    time: c.t * 1000,
    open: c.o,
    high: c.h,
    low: c.l,
    close: c.c,
  };
}

/**
 * Pull enough history to satisfy TradingView's countBack / [from, to) window.
 * Our REST API pages with `before` + `limit`.
 */
async function loadBarsForRange(
  symbol: string,
  tf: BrokerTf,
  fromSec: number,
  toSec: number,
  countBack: number,
): Promise<TvBar[]> {
  const out: TvBar[] = [];
  let before: number | undefined = toSec > 0 ? toSec : undefined;
  let guard = 0;
  let hasMore = true;

  while (guard < 8 && hasMore) {
    guard += 1;
    const need = Math.max(countBack - out.length, 300);
    const page = await fetchCandlePage(symbol, tf, before, Math.min(need, 500));
    hasMore = page.hasMore;
    if (page.candles.length === 0) break;

    const mapped = page.candles.map(toTvBar);
    // Prepend older page
    out.unshift(...mapped);

    const oldestSec = page.candles[0].t;
    before = oldestSec;

    const enoughCount = out.length >= countBack;
    const coversFrom = oldestSec <= fromSec;
    if (enoughCount && coversFrom) break;
    if (!page.hasMore) break;
  }

  // Ascending + filter to [from, to) when possible; keep countBack floor.
  out.sort((a, b) => a.time - b.time);
  const dedup = new Map<number, TvBar>();
  for (const b of out) dedup.set(b.time, b);
  let bars = Array.from(dedup.values()).sort((a, b) => a.time - b.time);

  const fromMs = fromSec * 1000;
  const toMs = toSec * 1000;
  const inRange = bars.filter((b) => b.time >= fromMs && b.time < toMs);
  if (inRange.length >= countBack) return inRange;
  if (bars.length <= countBack) return bars;
  // Prefer ending at `to`, take last countBack
  const endIdx = bars.findIndex((b) => b.time >= toMs);
  const end = endIdx === -1 ? bars.length : endIdx;
  return bars.slice(Math.max(0, end - countBack), end);
}

function cacheKey(symbol: string, resolution: string) {
  return `${symbol.toUpperCase()}::${resolution}`;
}

function applyQuoteToBar(
  last: TvBar | null,
  bid: number,
  tf: BrokerTf,
  nowSec = Math.floor(Date.now() / 1000),
): TvBar | null {
  if (!(bid > 0)) return null;
  const start = bucketStart(nowSec, tf);
  const startMs = start * 1000;
  if (!last || last.time < startMs) {
    return {
      time: startMs,
      open: bid,
      high: bid,
      low: bid,
      close: bid,
    };
  }
  if (last.time > startMs) return last;
  return {
    time: last.time,
    open: last.open,
    high: Math.max(last.high, bid),
    low: Math.min(last.low, bid),
    close: bid,
  };
}

export type BrokerDatafeed = {
  onReady: (cb: (config: DatafeedConfig) => void) => void;
  searchSymbols: (
    userInput: string,
    exchange: string,
    symbolType: string,
    onResult: (items: unknown[]) => void,
  ) => void;
  resolveSymbol: (
    symbolName: string,
    onResolve: ResolveCallback,
    onError: ErrorCallback,
  ) => void;
  getBars: (
    symbolInfo: LibrarySymbolInfo,
    resolution: string,
    periodParams: PeriodParams,
    onResult: HistoryCallback,
    onError: ErrorCallback,
  ) => void;
  subscribeBars: (
    symbolInfo: LibrarySymbolInfo,
    resolution: string,
    onTick: SubscribeBarsCallback,
    listenerGuid: string,
    onResetCacheNeededCallback: () => void,
  ) => void;
  unsubscribeBars: (listenerGuid: string) => void;
};

export function createBrokerDatafeed(defaultDigits = 5): BrokerDatafeed {
  return {
    onReady(cb) {
      setTimeout(() => {
        cb({
          supported_resolutions: [...TV_RESOLUTIONS],
          supports_marks: false,
          supports_timescale_marks: false,
          supports_time: true,
          exchanges: [{ value: "BROKER", name: "Broker", desc: "Broker feed" }],
          symbols_types: [{ name: "Forex", value: "forex" }],
        });
      }, 0);
    },

    searchSymbols(userInput, _exchange, _symbolType, onResult) {
      const q = String(userInput || "").trim().toUpperCase();
      if (!q) {
        onResult([]);
        return;
      }
      onResult([
        {
          symbol: q,
          full_name: q,
          description: q,
          exchange: "BROKER",
          type: "forex",
          ticker: q,
        },
      ]);
    },

    resolveSymbol(symbolName, onResolve, onError) {
      void (async () => {
        try {
          const symbol = String(symbolName || "")
            .replace(/^BROKER:/i, "")
            .trim()
            .toUpperCase();
          if (!symbol) {
            onError("Empty symbol");
            return;
          }
          // Probe digits from a tiny latest candle request.
          let digits = defaultDigits;
          try {
            const page = await fetchCandlePage(symbol, "M5", undefined, 1);
            digits = page.digits || defaultDigits;
          } catch {
            /* keep default */
          }
          const pricescale = digitsToPriceScale(digits);
          const info: LibrarySymbolInfo = {
            ticker: symbol,
            name: symbol,
            description: symbol,
            type: "forex",
            session: "24x7",
            timezone: "Etc/UTC",
            exchange: "BROKER",
            listed_exchange: "BROKER",
            minmov: 1,
            pricescale,
            has_intraday: true,
            has_daily: true,
            has_weekly_and_monthly: true,
            supported_resolutions: [...TV_RESOLUTIONS],
            volume_precision: 0,
            data_status: "streaming",
            format: "price",
          };
          setTimeout(() => onResolve(info), 0);
        } catch (e) {
          onError(e instanceof Error ? e.message : "resolveSymbol failed");
        }
      })();
    },

    getBars(symbolInfo, resolution, periodParams, onResult, onError) {
      void (async () => {
        try {
          const tf = resolutionToTf(resolution);
          if (!tf) {
            onError(`Unsupported resolution: ${resolution}`);
            return;
          }
          const symbol = String(symbolInfo.ticker || symbolInfo.name || "")
            .replace(/^BROKER:/i, "")
            .toUpperCase();
          const { from, to, countBack, firstDataRequest } = periodParams;
          const bars = await loadBarsForRange(symbol, tf, from, to, countBack || 300);
          if (!bars.length) {
            onResult([], { noData: true });
            return;
          }
          if (firstDataRequest) {
            lastBars.set(cacheKey(symbol, resolution), { ...bars[bars.length - 1] });
          }
          onResult(bars, { noData: false });
        } catch (e) {
          onError(e instanceof Error ? e.message : "getBars failed");
        }
      })();
    },

    subscribeBars(symbolInfo, resolution, onTick, listenerGuid) {
      const tf = resolutionToTf(resolution);
      if (!tf) return;
      const symbol = String(symbolInfo.ticker || symbolInfo.name || "")
        .replace(/^BROKER:/i, "")
        .toUpperCase();
      const key = cacheKey(symbol, resolution);
      let last = lastBars.get(key) ?? null;

      const unsubQuote = subscribeLiveQuote(symbol, (q) => {
        const next = applyQuoteToBar(last, q.bid, tf);
        if (!next) return;
        // TV forbids rewriting history older than last streamed bar time.
        if (last && next.time < last.time) return;
        last = next;
        lastBars.set(key, next);
        onTick(next);
      });

      // Seed from current quote immediately.
      const seed = getLiveQuote(symbol);
      if (seed) {
        const next = applyQuoteToBar(last, seed.bid, tf);
        if (next && (!last || next.time >= last.time)) {
          last = next;
          lastBars.set(key, next);
          onTick(next);
        }
      }

      subs.set(listenerGuid, {
        symbol,
        tf,
        resolution,
        lastBar: last,
        onTick,
        unsubQuote,
      });
    },

    unsubscribeBars(listenerGuid) {
      const sub = subs.get(listenerGuid);
      if (!sub) return;
      sub.unsubQuote();
      subs.delete(listenerGuid);
    },
  };
}

/** Expose seconds helper for overlays / debug. */
export function resolutionSeconds(resolution: string): number | null {
  const tf = resolutionToTf(resolution);
  return tf ? tfSeconds(tf) : null;
}
