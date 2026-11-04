export type MobilePosition = {
  id: string;
  ticket?: string;
  pair: string;
  type: string;
  lot: number;
  from: string;
  to: string;
  profit: number;
  swap: string;
  stopLoss?: number | null;
  takeProfit?: number | null;
};

export type MobilePending = {
  orderId: string;
  ticket?: string | number | null;
  symbol: string;
  side: string;
  orderType: string;
  volume: number | string;
  price: number | string;
  stopLoss?: number | string | null;
  takeProfit?: number | string | null;
  currentPrice?: number | string | null;
};

export function signedUsd(value: number): string {
  const n = Number.isFinite(value) ? value : 0;
  const sign = n > 0 ? "+" : n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toFixed(2)}`;
}

export function pnlClass(value: number): string {
  if (value > 0) return "text-[var(--profit)]";
  if (value < 0) return "text-[var(--loss)]";
  return "text-[var(--text-muted)]";
}

export function sideClass(side: string): string {
  return String(side).toUpperCase() === "SELL" ? "text-[var(--loss)]" : "text-[#2563eb]";
}

export function titleCase(text: string): string {
  return String(text || "")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function priceDigits(...values: (string | number | null | undefined)[]): number {
  let digits = 2;
  for (const v of values) {
    const part = String(v ?? "").split(".")[1];
    if (part && part.length > digits) digits = part.length;
  }
  return Math.min(digits, 8);
}

export function levelText(value: number | string | null | undefined): string {
  const n = Number(value);
  return value === null || value === undefined || value === "" || !Number.isFinite(n) || n <= 0
    ? "--"
    : String(value);
}

/** Formats with a thin space thousands separator, e.g. 10 000.00 */
export function spacedNumber(value: number, digits = 2): string {
  const n = Number.isFinite(value) ? value : 0;
  const [int, dec] = Math.abs(n).toFixed(digits).split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${n < 0 ? "-" : ""}${grouped}${dec !== undefined ? `.${dec}` : ""}`;
}
