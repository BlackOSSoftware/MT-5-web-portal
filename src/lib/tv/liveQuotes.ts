/**
 * Bridge from React quote props → Charting Library `subscribeBars`.
 * TvBrokerChart pushes bid/ask; the datafeed listens and rebuilds the forming candle.
 */

export type LiveQuote = { bid: number; ask: number; ts: number };

type QuoteListener = (q: LiveQuote) => void;

const quotes = new Map<string, LiveQuote>();
const listeners = new Map<string, Set<QuoteListener>>();

function keyOf(symbol: string) {
  return String(symbol || "").toUpperCase();
}

export function pushLiveQuote(symbol: string, bid: number, ask: number) {
  if (!symbol || !(bid > 0)) return;
  const key = keyOf(symbol);
  const q: LiveQuote = { bid, ask, ts: Date.now() };
  quotes.set(key, q);
  const set = listeners.get(key);
  if (!set) return;
  for (const fn of set) {
    try {
      fn(q);
    } catch {
      /* ignore listener errors */
    }
  }
}

export function getLiveQuote(symbol: string): LiveQuote | null {
  return quotes.get(keyOf(symbol)) ?? null;
}

export function subscribeLiveQuote(symbol: string, fn: QuoteListener): () => void {
  const key = keyOf(symbol);
  let set = listeners.get(key);
  if (!set) {
    set = new Set();
    listeners.set(key, set);
  }
  set.add(fn);
  const current = quotes.get(key);
  if (current) {
    try {
      fn(current);
    } catch {
      /* ignore */
    }
  }
  return () => {
    set!.delete(fn);
    if (set!.size === 0) listeners.delete(key);
  };
}
