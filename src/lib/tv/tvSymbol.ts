/**
 * Map broker symbols → TradingView Advanced Chart symbols.
 * Mirrors oceana-app `TradingViewAdvancedChart.tvSymbol`.
 */

const MAP: Record<string, string> = {
  EURUSD: "FX_IDC:EURUSD",
  GBPUSD: "FX_IDC:GBPUSD",
  USDJPY: "FX_IDC:USDJPY",
  USDCHF: "FX_IDC:USDCHF",
  AUDUSD: "FX_IDC:AUDUSD",
  USDCAD: "FX_IDC:USDCAD",
  NZDUSD: "FX_IDC:NZDUSD",
  EURGBP: "FX_IDC:EURGBP",
  EURJPY: "FX_IDC:EURJPY",
  GBPJPY: "FX_IDC:GBPJPY",
  XAUUSD: "OANDA:XAUUSD",
  GOLD: "OANDA:XAUUSD",
  XAGUSD: "OANDA:XAGUSD",
  SILVER: "OANDA:XAGUSD",
  BTCUSD: "BINANCE:BTCUSDT",
  BTCUSDT: "BINANCE:BTCUSDT",
  ETHUSD: "BINANCE:ETHUSDT",
  ETHUSDT: "BINANCE:ETHUSDT",
  BNBUSD: "BINANCE:BNBUSDT",
  BNBUSDT: "BINANCE:BNBUSDT",
  SOLUSD: "BINANCE:SOLUSDT",
  SOLUSDT: "BINANCE:SOLUSDT",
  XRPUSD: "BINANCE:XRPUSDT",
  XRPUSDT: "BINANCE:XRPUSDT",
  ADAUSD: "BINANCE:ADAUSDT",
  ADAUSDT: "BINANCE:ADAUSDT",
  DOGEUSD: "BINANCE:DOGEUSDT",
  DOGEUSDT: "BINANCE:DOGEUSDT",
  LTCUSD: "BINANCE:LTCUSDT",
  LTCUSDT: "BINANCE:LTCUSDT",
  US30: "FOREXCOM:US30",
  US500: "FOREXCOM:US500",
  NAS100: "FOREXCOM:NSXUSD",
  UK100: "FOREXCOM:UK100",
  GER40: "FOREXCOM:GER40",
  DE40: "FOREXCOM:GER40",
};

const CRYPTO_BASES = new Set([
  "BTC",
  "ETH",
  "BNB",
  "SOL",
  "XRP",
  "ADA",
  "DOGE",
  "LTC",
  "DOT",
  "AVAX",
  "MATIC",
  "LINK",
  "UNI",
  "ATOM",
  "NEAR",
  "APT",
  "ARB",
  "OP",
  "SHIB",
  "TRX",
  "TON",
  "SUI",
  "PEPE",
]);

export function toTradingViewSymbol(broker: string): string {
  let s = String(broker || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  s = s.replace(/(M|PRO|ECN|RAW)$/g, "");

  if (MAP[s]) return MAP[s];

  if (s.endsWith("USDT") && s.length > 4) return `BINANCE:${s}`;

  if (s.endsWith("USD") && !s.endsWith("USDT") && s.length > 3) {
    const base = s.slice(0, -3);
    if (CRYPTO_BASES.has(base)) return `BINANCE:${base}USDT`;
  }

  if (/^[A-Z]{6}$/.test(s)) return `FX_IDC:${s}`;
  return `FX_IDC:${s || "EURUSD"}`;
}
