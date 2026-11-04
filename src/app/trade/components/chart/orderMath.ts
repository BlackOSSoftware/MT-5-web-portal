export type OrderSide = "BUY" | "SELL";
export type PendingKind = "LIMIT" | "STOP" | "STOP_LIMIT";

export type SymbolSpec = {
  digits: number;
  contractSize: number;
  minLot: number;
  maxLot: number;
  lotStep: number;
  segment: string;
  description: string;
};

export function decimalsOf(value: string | number | undefined): number {
  const text = String(value ?? "");
  const part = text.split(".")[1];
  return part ? part.length : 0;
}

export function roundTo(value: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

/** Normalises the `/property/:symbol` payload into the numbers the order UI needs. */
export function buildSymbolSpec(
  property: unknown,
  livePrices: (string | undefined)[],
): SymbolSpec {
  const root = (property ?? {}) as Record<string, unknown>;
  const data = (root.data ?? root) as Record<string, unknown>;
  const instrument = (data.instrument ?? {}) as Record<string, unknown>;
  const page = (data.page ?? {}) as Record<string, unknown>;

  const num = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };

  // The live feed's decimals are authoritative; pricePrecision can lag behind it.
  const feedDigits = Math.max(0, ...livePrices.map((p) => decimalsOf(p)));
  const digits = Math.max(feedDigits, num(instrument.pricePrecision) ?? 0, 2);

  return {
    digits: Math.min(Math.round(digits), 8),
    contractSize: num(instrument.contractSize) ?? 100000,
    // Trading portal always trades in 0.01-lot increments from 0.01.
    minLot: 0.01,
    maxLot: num(instrument.maxQty) ?? 100,
    lotStep: 0.01,
    segment: String(instrument.segment ?? ""),
    description: String(page.description ?? instrument.name ?? ""),
  };
}

/** One pip: 10 points for 3/5-digit symbols, otherwise one point. */
export function pipSize(digits: number): number {
  const point = 10 ** -digits;
  return digits === 3 || digits === 5 ? point * 10 : point;
}

export function lotDecimals(step: number): number {
  return Math.max(decimalsOf(step), 2);
}

export function clampLot(value: number, spec: SymbolSpec): number {
  const d = lotDecimals(spec.lotStep);
  const stepped = Math.round(value / spec.lotStep) * spec.lotStep;
  return roundTo(Math.min(Math.max(stepped, spec.minLot), spec.maxLot), d);
}

export function requiredMargin(
  volume: number,
  price: number,
  spec: SymbolSpec,
  leverage: number,
): number {
  if (!(volume > 0) || !(price > 0)) return 0;
  const lev = leverage > 0 ? leverage : 1;
  return (volume * spec.contractSize * price) / lev;
}

/** Bid/ask distance in points (smallest price unit), e.g. 51.985/52.020 → 35. */
export function spreadPoints(bid: number, ask: number, digits: number): string {
  if (!(bid > 0) || !(ask > 0)) return "—";
  return String(Math.round(Math.abs(ask - bid) * 10 ** digits));
}

export function pendingOrderType(side: OrderSide, kind: PendingKind) {
  if (kind === "LIMIT") return side === "BUY" ? "BUY_LIMIT" : "SELL_LIMIT";
  if (kind === "STOP") return side === "BUY" ? "BUY_STOP" : "SELL_STOP";
  return side === "BUY" ? "BUY_STOP_LIMIT" : "SELL_STOP_LIMIT";
}

/** Default distance used when a price field is first filled from the market. */
export function defaultOffset(price: number, digits: number): number {
  const raw = price * 0.002;
  const minimum = pipSize(digits) * 10;
  return roundTo(Math.max(raw, minimum), digits);
}

export function pendingHelpText(side: OrderSide, kind: PendingKind): string {
  if (kind === "LIMIT") {
    return side === "BUY"
      ? "Buys when the price falls to your price (below the market)."
      : "Sells when the price rises to your price (above the market).";
  }
  if (kind === "STOP") {
    return side === "BUY"
      ? "Buys when the price rises to your price (above the market)."
      : "Sells when the price falls to your price (below the market).";
  }
  return side === "BUY"
    ? "When the price rises to the stop price, a buy limit is placed at the limit price."
    : "When the price falls to the stop price, a sell limit is placed at the limit price.";
}

/** Suggested pending entry for the chosen side/kind, on the valid side of the market. */
export function defaultPendingPrices(
  side: OrderSide,
  kind: PendingKind,
  bid: number,
  ask: number,
  digits: number,
): { price: number; limitPrice: number } {
  const ref = side === "BUY" ? ask : bid;
  const off = defaultOffset(ref, digits);
  if (kind === "LIMIT") {
    const price = side === "BUY" ? ref - off : ref + off;
    return { price: roundTo(price, digits), limitPrice: 0 };
  }
  const stop = side === "BUY" ? ref + off : ref - off;
  const limit = side === "BUY" ? stop - off / 2 : stop + off / 2;
  return { price: roundTo(stop, digits), limitPrice: roundTo(limit, digits) };
}
