import type { UTCTimestamp } from "lightweight-charts";

/**
 * Pure indicator math for the broker chart. All functions take the candle
 * closes (aligned with bar times) and return per-bar point lists; `undefined`
 * values become whitespace so lightweight-charts draws gaps correctly.
 */

export type IndicatorType =
  | "SMA"
  | "EMA"
  | "WMA"
  | "RSI"
  | "MACD"
  | "BOLL"
  | "STOCH"
  | "ATR"
  | "MOM"
  | "CCI";

export type IndCategory = "Trend" | "Momentum" | "Volatility";

export type IndSpec = {
  id: string;
  type: IndicatorType;
  /** Period / length (SMA, EMA, RSI, Bollinger). MACD uses fast/slow/signal. */
  length: number;
};

export type LinePoint = { time: UTCTimestamp; value?: number };
export type HistPoint = { time: UTCTimestamp; value: number; color?: string };

export type IndicatorOutput = {
  /** role -> series data (line or histogram) */
  series: { key: string; kind: "line" | "histogram"; data: (LinePoint | HistPoint)[] }[];
  /** optional price lines to pin on a pane (e.g. RSI 30/70) */
  levels?: { value: number; color: string; title: string }[];
};

export const INDICATOR_DEFS: {
  type: IndicatorType;
  label: string;
  description: string;
  defaultLength: number;
  pane: "price" | "sub";
  category: IndCategory;
}[] = [
  { type: "SMA", label: "Simple Moving Average", description: "Average price over a period", defaultLength: 20, pane: "price", category: "Trend" },
  { type: "EMA", label: "Exponential Moving Average", description: "Weighted average, reacts faster", defaultLength: 20, pane: "price", category: "Trend" },
  { type: "WMA", label: "Weighted Moving Average", description: "Recent prices weighted higher", defaultLength: 20, pane: "price", category: "Trend" },
  { type: "BOLL", label: "Bollinger Bands", description: "Volatility bands around SMA", defaultLength: 20, pane: "price", category: "Trend" },
  { type: "RSI", label: "Relative Strength Index", description: "Momentum oscillator 0-100", defaultLength: 14, pane: "sub", category: "Momentum" },
  { type: "MACD", label: "MACD", description: "Trend momentum via EMAs", defaultLength: 12, pane: "sub", category: "Momentum" },
  { type: "STOCH", label: "Stochastic Oscillator", description: "%K and %D momentum lines", defaultLength: 14, pane: "sub", category: "Momentum" },
  { type: "MOM", label: "Momentum", description: "Rate of price change", defaultLength: 10, pane: "sub", category: "Momentum" },
  { type: "CCI", label: "Commodity Channel Index", description: "Cyclic trend oscillator", defaultLength: 20, pane: "sub", category: "Momentum" },
  { type: "ATR", label: "Average True Range", description: "Volatility measure", defaultLength: 14, pane: "sub", category: "Volatility" },
];

export const INDICATOR_COLORS: Record<string, string> = {
  SMA: "#2962FF",
  EMA: "#FF6D00",
  WMA: "#00C853",
  BOLL_UPPER: "#78909C",
  BOLL_MID: "#546E7A",
  BOLL_LOWER: "#78909C",
  RSI: "#7E57C2",
  MACD: "#26A69A",
  MACD_SIGNAL: "#EF5350",
  MACD_HIST_UP: "#26A69A",
  MACD_HIST_DOWN: "#EF5350",
  STOCH_K: "#2962FF",
  STOCH_D: "#FF6D00",
  ATR: "#AB47BC",
  MOM: "#26C6DA",
  CCI: "#EC407A",
};

const UP = "#22c55e";
const DOWN = "#ef4444";

function closesOf(bars: { close: number }[]): number[] {
  return bars.map((b) => b.close);
}

function smaValues(closes: number[], length: number): (number | undefined)[] {
  const out: (number | undefined)[] = new Array(closes.length).fill(undefined);
  let sum = 0;
  for (let i = 0; i < closes.length; i++) {
    sum += closes[i];
    if (i >= length) sum -= closes[i - length];
    if (i >= length - 1) out[i] = sum / length;
  }
  return out;
}

function emaValues(closes: number[], length: number): (number | undefined)[] {
  const out: (number | undefined)[] = new Array(closes.length).fill(undefined);
  if (closes.length < length) return out;
  const k = 2 / (length + 1);
  let prev = 0;
  for (let i = 0; i < length; i++) prev += closes[i];
  prev /= length;
  out[length - 1] = prev;
  for (let i = length; i < closes.length; i++) {
    prev = closes[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

function highsOf(bars: { high?: number; close: number }[]): number[] {
  return bars.map((b) => b.high ?? b.close);
}

function lowsOf(bars: { low?: number; close: number }[]): number[] {
  return bars.map((b) => b.low ?? b.close);
}

function wmaValues(closes: number[], length: number): (number | undefined)[] {
  const out: (number | undefined)[] = new Array(closes.length).fill(undefined);
  const denom = (length * (length + 1)) / 2;
  for (let i = length - 1; i < closes.length; i++) {
    let sum = 0;
    for (let j = 0; j < length; j++) sum += closes[i - length + 1 + j] * (j + 1);
    out[i] = sum / denom;
  }
  return out;
}

function stochValues(
  highs: number[],
  lows: number[],
  closes: number[],
  length: number,
): { k: (number | undefined)[]; d: (number | undefined)[] } {
  const k: (number | undefined)[] = new Array(closes.length).fill(undefined);
  for (let i = length - 1; i < closes.length; i++) {
    let hh = -Infinity;
    let ll = Infinity;
    for (let j = i - length + 1; j <= i; j++) {
      hh = Math.max(hh, highs[j]);
      ll = Math.min(ll, lows[j]);
    }
    k[i] = hh === ll ? 50 : ((closes[i] - ll) / (hh - ll)) * 100;
  }
  // %D = 3-period SMA of %K
  const d: (number | undefined)[] = new Array(closes.length).fill(undefined);
  for (let i = 2; i < closes.length; i++) {
    const a = k[i - 2];
    const b = k[i - 1];
    const c = k[i];
    if (a !== undefined && b !== undefined && c !== undefined) d[i] = (a + b + c) / 3;
  }
  return { k, d };
}

function atrValues(
  highs: number[],
  lows: number[],
  closes: number[],
  length: number,
): (number | undefined)[] {
  const out: (number | undefined)[] = new Array(closes.length).fill(undefined);
  if (closes.length <= length) return out;
  const tr: number[] = [highs[0] - lows[0]];
  for (let i = 1; i < closes.length; i++) {
    tr.push(Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1])));
  }
  let prev = 0;
  for (let i = 0; i < length; i++) prev += tr[i];
  prev /= length;
  out[length] = prev;
  for (let i = length + 1; i < closes.length; i++) {
    prev = (prev * (length - 1) + tr[i]) / length;
    out[i] = prev;
  }
  return out;
}

function momValues(closes: number[], length: number): (number | undefined)[] {
  const out: (number | undefined)[] = new Array(closes.length).fill(undefined);
  for (let i = length; i < closes.length; i++) out[i] = closes[i] - closes[i - length];
  return out;
}

function cciValues(
  highs: number[],
  lows: number[],
  closes: number[],
  length: number,
): (number | undefined)[] {
  const out: (number | undefined)[] = new Array(closes.length).fill(undefined);
  const tp = closes.map((_, i) => (highs[i] + lows[i] + closes[i]) / 3);
  for (let i = length - 1; i < closes.length; i++) {
    let mean = 0;
    for (let j = i - length + 1; j <= i; j++) mean += tp[j];
    mean /= length;
    let dev = 0;
    for (let j = i - length + 1; j <= i; j++) dev += Math.abs(tp[j] - mean);
    dev /= length;
    out[i] = dev === 0 ? 0 : (tp[i] - mean) / (0.015 * dev);
  }
  return out;
}

function rsiValues(closes: number[], length: number): (number | undefined)[] {
  const out: (number | undefined)[] = new Array(closes.length).fill(undefined);
  if (closes.length <= length) return out;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= length; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gain += d;
    else loss -= d;
  }
  let avgGain = gain / length;
  let avgLoss = loss / length;
  out[length] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  for (let i = length + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    avgGain = (avgGain * (length - 1) + Math.max(d, 0)) / length;
    avgLoss = (avgLoss * (length - 1) + Math.max(-d, 0)) / length;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

function toLine(times: UTCTimestamp[], values: (number | undefined)[]): LinePoint[] {
  return times.map((time, i) =>
    values[i] === undefined ? { time } : { time, value: values[i] as number },
  );
}

export type IndBar = {
  time: UTCTimestamp;
  open?: number;
  high?: number;
  low?: number;
  close: number;
};

export function computeIndicator(
  spec: IndSpec,
  bars: IndBar[],
): IndicatorOutput {
  const times = bars.map((b) => b.time);
  const closes = closesOf(bars);
  const highs = highsOf(bars);
  const lows = lowsOf(bars);
  const len = Math.max(1, Math.floor(spec.length) || 1);

  switch (spec.type) {
    case "SMA":
      return {
        series: [{ key: "line", kind: "line", data: toLine(times, smaValues(closes, len)) }],
      };

    case "EMA":
      return {
        series: [{ key: "line", kind: "line", data: toLine(times, emaValues(closes, len)) }],
      };

    case "WMA":
      return {
        series: [{ key: "line", kind: "line", data: toLine(times, wmaValues(closes, len)) }],
      };

    case "STOCH": {
      const { k, d } = stochValues(highs, lows, closes, len);
      return {
        series: [
          { key: "k", kind: "line", data: toLine(times, k) },
          { key: "d", kind: "line", data: toLine(times, d) },
        ],
        levels: [
          { value: 80, color: "rgba(239,68,68,0.6)", title: "80" },
          { value: 20, color: "rgba(34,197,94,0.6)", title: "20" },
        ],
      };
    }

    case "ATR":
      return {
        series: [{ key: "line", kind: "line", data: toLine(times, atrValues(highs, lows, closes, len)) }],
      };

    case "MOM":
      return {
        series: [{ key: "line", kind: "line", data: toLine(times, momValues(closes, len)) }],
      };

    case "CCI":
      return {
        series: [{ key: "line", kind: "line", data: toLine(times, cciValues(highs, lows, closes, len)) }],
        levels: [
          { value: 100, color: "rgba(239,68,68,0.6)", title: "+100" },
          { value: -100, color: "rgba(34,197,94,0.6)", title: "-100" },
          { value: 0, color: "rgba(148,163,184,0.35)", title: "0" },
        ],
      };

    case "BOLL": {
      const mid = smaValues(closes, len);
      const upper: (number | undefined)[] = new Array(closes.length).fill(undefined);
      const lower: (number | undefined)[] = new Array(closes.length).fill(undefined);
      const mult = 2;
      for (let i = len - 1; i < closes.length; i++) {
        let sumSq = 0;
        for (let j = i - len + 1; j <= i; j++) {
          const d = closes[j] - (mid[i] as number);
          sumSq += d * d;
        }
        const sd = Math.sqrt(sumSq / len);
        upper[i] = (mid[i] as number) + mult * sd;
        lower[i] = (mid[i] as number) - mult * sd;
      }
      return {
        series: [
          { key: "upper", kind: "line", data: toLine(times, upper) },
          { key: "mid", kind: "line", data: toLine(times, mid) },
          { key: "lower", kind: "line", data: toLine(times, lower) },
        ],
      };
    }

    case "RSI": {
      const rsi = rsiValues(closes, len);
      return {
        series: [{ key: "line", kind: "line", data: toLine(times, rsi) }],
        levels: [
          { value: 70, color: "rgba(239,68,68,0.6)", title: "70" },
          { value: 30, color: "rgba(34,197,94,0.6)", title: "30" },
          { value: 50, color: "rgba(148,163,184,0.35)", title: "50" },
        ],
      };
    }

    case "MACD": {
      const fast = 12;
      const slow = 26;
      const signalLen = 9;
      const fastE = emaValues(closes, fast);
      const slowE = emaValues(closes, slow);
      const macdLine: (number | undefined)[] = closes.map((_, i) =>
        fastE[i] !== undefined && slowE[i] !== undefined
          ? (fastE[i] as number) - (slowE[i] as number)
          : undefined,
      );
      const defined = macdLine.filter((v): v is number => v !== undefined);
      const signalE = emaValues(defined, signalLen);
      // Map signal back onto bar indexes (signal starts at the first defined macd bar).
      const firstDefined = macdLine.findIndex((v) => v !== undefined);
      const signalFull: (number | undefined)[] = new Array(closes.length).fill(undefined);
      for (let i = 0; i < signalE.length; i++) {
        signalFull[firstDefined + i] = signalE[i];
      }
      const hist: HistPoint[] = times.map((time, i) => {
        const m = macdLine[i];
        const s = signalFull[i];
        if (m === undefined || s === undefined) return { time, value: 0 };
        const v = m - s;
        return { time, value: v, color: v >= 0 ? INDICATOR_COLORS.MACD_HIST_UP : INDICATOR_COLORS.MACD_HIST_DOWN };
      });
      return {
        series: [
          { key: "macd", kind: "line", data: toLine(times, macdLine) },
          { key: "signal", kind: "line", data: toLine(times, signalFull) },
          { key: "hist", kind: "histogram", data: hist },
        ],
      };
    }

    default:
      return { series: [] };
  }
}

export { UP, DOWN };
