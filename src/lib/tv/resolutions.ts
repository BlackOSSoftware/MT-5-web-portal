/** Map TradingView resolutions <-> broker timeframe codes (`M5`, `H1`, …). */

export type BrokerTf =
  | "M1"
  | "M5"
  | "M15"
  | "M30"
  | "H1"
  | "H4"
  | "D1"
  | "W1"
  | "MN";

export const TV_RESOLUTIONS = [
  "1",
  "5",
  "15",
  "30",
  "60",
  "240",
  "1D",
  "1W",
  "1M",
] as const;

export type TvResolution = (typeof TV_RESOLUTIONS)[number];

const RES_TO_TF: Record<string, BrokerTf> = {
  "1": "M1",
  "5": "M5",
  "15": "M15",
  "30": "M30",
  "60": "H1",
  "240": "H4",
  "1D": "D1",
  D: "D1",
  "1W": "W1",
  W: "W1",
  "1M": "MN",
  M: "MN",
};

const TF_SECONDS: Record<BrokerTf, number> = {
  M1: 60,
  M5: 300,
  M15: 900,
  M30: 1800,
  H1: 3600,
  H4: 14400,
  D1: 86400,
  W1: 604800,
  MN: 2592000,
};

export function resolutionToTf(resolution: string): BrokerTf | null {
  return RES_TO_TF[resolution] ?? null;
}

export function tfSeconds(tf: BrokerTf): number {
  return TF_SECONDS[tf];
}

/** Floor unix-seconds timestamp to the candle bucket for this TF. */
export function bucketStart(unixSec: number, tf: BrokerTf): number {
  const s = TF_SECONDS[tf];
  if (tf === "W1" || tf === "MN" || tf === "D1") {
    // Daily+ use UTC day alignment (same as our REST candles).
    const d = new Date(unixSec * 1000);
    if (tf === "D1") {
      return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 1000;
    }
    if (tf === "MN") {
      return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) / 1000;
    }
    // W1 — Monday 00:00 UTC
    const day = d.getUTCDay();
    const diff = (day + 6) % 7;
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - diff) / 1000;
  }
  return Math.floor(unixSec / s) * s;
}
