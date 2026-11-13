import api from "@/api/axios";

export interface IbCommissionRow {
  id: string;
  positionId: string | null;
  ticket: number | null;
  tradeId: string;
  clientName: string;
  clientEmail: string;
  parentName: string;
  level: number;
  accountType: string;
  accountTypeRaw: string;
  accountNumber: string;
  source: "WEB" | "APP" | null;
  symbol: string;
  lots: number;
  commission: number;
  profit: number | null;
  tradeStatus: string;
  openTime: string | null;
  closeTime: string | null;
  durationSec: number | null;
  duration: string | null;
  percent: number;
  ibUsdPerLot: number;
  status: string;
  createdAt: string;
}

export interface IbCommissionReport {
  items: IbCommissionRow[];
  totals: { commission: number; profit: number; count: number };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface IbCommissionSummary {
  totalEarned: number;
  available: number;
  pending: number;
  paidOut: number;
  clawbackPending: number;
  counts: {
    available: number;
    pending: number;
    paid: number;
    total: number;
  };
}

export interface IbCommissionQuery {
  q?: string;
  from?: string;
  to?: string;
  level?: string | number;
  page?: number;
  limit?: number;
}

export async function getMyIbCommissions(
  params?: IbCommissionQuery,
): Promise<IbCommissionReport> {
  const { data } = await api.get("/ib-settings/my-commissions", { params });
  return data.data;
}

export async function getMyIbCommissionSummary(): Promise<IbCommissionSummary> {
  const { data } = await api.get("/ib-settings/my-commission-summary");
  return data.data;
}

export async function withdrawMyIbCommission(payload: {
  amount: number;
  method: string;
  payout: Record<string, string>;
}) {
  const { data } = await api.post("/ib-settings/my-commissions/withdraw", payload);
  return data;
}
