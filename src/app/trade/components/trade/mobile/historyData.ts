import { useQuery } from "@tanstack/react-query";
import tradeApi from "@/api/tradeApi";

export type Period = "today" | "week" | "month" | "custom";

export const PERIODS: { key: Period; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "custom", label: "Custom" },
];

export type ClosedTrade = {
  id: string;
  ticket: string;
  symbol: string;
  side: string;
  volume: number;
  openPrice: string;
  closePrice: string;
  openTime: string | null;
  closeTime: string | null;
  stopLoss: number | null;
  takeProfit: number | null;
  pnl: number;
  swap: number;
  commission: number;
  referencePrice?: number | null;
  slippageApplied?: boolean;
  slippagePoints?: number;
  slippagePriceDifference?: number;
};

export type HistorySummary = {
  profit: number;
  deposit: number;
  withdrawal: number;
  swap: number;
  commission: number;
  balance: number;
};

export function rangeFor(period: Period, customFrom: string, customTo: string) {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (period === "week") {
    const day = (start.getDay() + 6) % 7; // Monday = 0
    start.setDate(start.getDate() - day);
  } else if (period === "month") {
    start.setDate(1);
  } else if (period === "custom") {
    if (!customFrom || !customTo) return null;
    const from = new Date(`${customFrom}T00:00:00`);
    const to = new Date(`${customTo}T23:59:59`);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) return null;
    return { from: from.toISOString(), to: to.toISOString() };
  }
  return { from: start.toISOString(), to: now.toISOString() };
}

function firstNumber(...values: unknown[]) {
  for (const v of values) {
    if (v === null || v === undefined || v === "") continue;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function level(value: unknown): number | null {
  const n = Number(value);
  return value === null || value === undefined || !Number.isFinite(n) || n <= 0 ? null : n;
}

/** Closed positions + money summary for a period (shared by mobile and desktop History). */
export function useClosedHistory(range: { from: string; to: string } | null) {
  return useQuery({
    queryKey: ["trade-mobile-history", range?.from ?? null, range?.to ?? null],
    enabled: Boolean(range),
    staleTime: 15_000,
    queryFn: async () => {
      const params = { filter: "custom", from: range!.from, to: range!.to, page: 1 };
      const [positionsRes, dealsRes] = await Promise.all([
        tradeApi.get("/trade/positions", { params: { ...params, status: "CLOSED", limit: 200 } }),
        tradeApi.get("/trade/deals", { params: { ...params, limit: 1 } }),
      ]);
      const rawPositions: Record<string, unknown>[] =
        positionsRes.data?.positions ?? positionsRes.data?.data?.positions ?? [];
      const summary = (dealsRes.data?.summary ?? dealsRes.data?.data?.summary ?? {}) as Record<string, unknown>;

      // /trade/positions returns `qty` and net `profitLoss` (after swap/commission).
      const rows: ClosedTrade[] = rawPositions
        .filter((p) => !p.isBalanceEntry && String(p.side ?? "").toUpperCase() !== "BALANCE")
        .map((p) => ({
          id: String(p.positionId ?? p.ticket ?? p._id ?? Math.random()),
          ticket: String(p.ticket ?? p.orderId ?? p.positionId ?? "--"),
          symbol: String(p.symbol ?? ""),
          side: String(p.side ?? "BUY"),
          volume: firstNumber(p.qty, p.volume),
          openPrice: String(p.openPrice ?? "--"),
          closePrice: String(p.closePrice ?? "--"),
          openTime: p.openTime ? String(p.openTime) : null,
          closeTime: p.closeTime ? String(p.closeTime) : null,
          stopLoss: level(p.stopLoss),
          takeProfit: level(p.takeProfit),
          pnl: firstNumber(p.profitLoss, p.grossProfit, p.realizedPnL, p.profit, p.pnl),
          swap: firstNumber(p.swap),
          commission: firstNumber(p.commission),
          referencePrice:
            typeof p.referencePrice === "number" ? p.referencePrice : null,
          slippageApplied: p.slippageApplied === true,
          slippagePoints: firstNumber(p.slippagePoints),
          slippagePriceDifference: firstNumber(p.slippagePriceDifference),
        }));

      const profit = firstNumber(summary.totalTradingProfit);
      const deposit = firstNumber(summary.totalDeposit);
      const withdrawal = firstNumber(summary.totalWithdrawal);
      const swap = firstNumber(summary.totalSwap);
      const commission = firstNumber(summary.totalCommission);
      const totals: HistorySummary = {
        profit,
        deposit,
        withdrawal,
        swap,
        commission,
        balance: deposit - withdrawal + profit + swap - commission,
      };
      return { rows, summary: totals };
    },
  });
}
