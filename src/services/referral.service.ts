import api from "@/api/axios";

export interface ReferralSummary {
  referralCode: string;
  totalReferrals: number;
  referralBalance: number;
  totalEarned: number;
  pendingCount: number;
  pendingAmount: number;
}

export interface ReferralReward {
  rewardId: string;
  amount: number;
  status: string;
  createdAt?: string;
  referredUser?: string;
  referredUserEmail?: string;
  raw: Record<string, unknown>;
}

export interface DirectReferral {
  userId: string;
  name: string;
  email: string;
  status?: string;
  createdAt?: string;
  totalDeposit?: number;
  depositCount?: number;
  accountCount?: number;
}

export type ReferralScope = "total" | "network" | "direct";
export type ReferralPeriod = "today" | "7d" | "30d" | "mtd" | "all" | "custom";

export interface ReferralDashboard {
  referralCode: string | null;
  linkUsedCount: number;
  scope: ReferralScope;
  period: string;
  totalClients: number;
  newClients: number;
  activeTraders: number;
  subIbs: number;
  directSubIbs: number;
  totalDeposits: number;
  netDeposits: number;
  clientEquity: number;
  totalLots: number;
  tradeCount: number;
  periodEarnings: number;
  totalWithdrawals: number;
  funnel: {
    linkClicks: number;
    uniqueVisitors: number;
    signedUp: number;
    openedAccount: number;
    fundedAccounts: number;
  };
  commission: {
    totalEarned: number;
    paidOut: number;
    pending: number;
    available: number;
  };
  recentDeposits: ActivityItem[];
  recentWithdrawals: ActivityItem[];
  recentPayouts: ActivityItem[];
  recentAccounts: AccountActivityItem[];
  activityTotals?: {
    deposits: number;
    withdrawals: number;
    payouts: number;
    accounts: number;
  };
}

export type ActivityItem = {
  id: string;
  name: string;
  email?: string;
  amount: number;
  status: string;
  createdAt?: string;
};

export type AccountActivityItem = {
  id: string;
  name: string;
  email?: string;
  accountNumber: string;
  accountType?: string;
  status?: string;
  createdAt?: string;
};

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  message?: string;
};

type UnknownRecord = Record<string, unknown>;

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" ? (value as UnknownRecord) : {};
}

function extractRewardsArray(payload: unknown): UnknownRecord[] {
  if (Array.isArray(payload)) return payload.map(asRecord);
  const root = asRecord(payload);
  const data = asRecord(root.data);
  const candidates: unknown[] = [
    root.rewards,
    root.items,
    data.rewards,
    data.items,
    data.list,
    data.results,
    data,
  ];

  for (const item of candidates) {
    if (Array.isArray(item)) return item.map(asRecord);
  }
  return [];
}

function resolveReferredUser(row: UnknownRecord): {
  name: string;
  email: string;
} {
  const nested = asRecord(row.referredUser || row.referred_user);
  const name = toString(
    row.referredUserName ||
      nested.name ||
      nested.fullName ||
      nested.username ||
      ""
  );
  const email = toString(
    row.referredUserEmail || nested.email || row.email || ""
  );
  return { name, email };
}

export const getReferralSummary = async (): Promise<ReferralSummary> => {
  const res = await api.get<ApiEnvelope<UnknownRecord>>("/referrals/summary");
  const data = asRecord(res.data?.data);
  return {
    referralCode: toString(data.referralCode),
    totalReferrals: toNumber(data.totalReferrals),
    referralBalance: toNumber(data.referralBalance),
    totalEarned: toNumber(data.totalEarned),
    pendingCount: toNumber(data.pendingCount),
    pendingAmount: toNumber(data.pendingAmount),
  };
};

export const getReferralDashboard = async (params: {
  scope?: ReferralScope;
  period?: ReferralPeriod;
  from?: string;
  to?: string;
}): Promise<ReferralDashboard> => {
  const res = await api.get<ApiEnvelope<ReferralDashboard>>("/referrals/dashboard", {
    params,
  });
  return res.data?.data as ReferralDashboard;
};

export const getReferralRewards = async (): Promise<ReferralReward[]> => {
  const res = await api.get("/referrals/rewards");
  const rows = extractRewardsArray(res.data);

  return rows.map((row) => {
    const referred = resolveReferredUser(row);
    return {
      rewardId: toString(row.rewardId || row._id || row.id),
      amount: toNumber(
        row.amount ?? row.rewardAmount ?? row.reward_amount ?? row.pendingAmount
      ),
      status: toString(row.status || row.claimStatus || row.state, "PENDING"),
      createdAt: toString(row.createdAt || row.updatedAt || row.date, ""),
      referredUser: referred.name || referred.email || "",
      referredUserEmail: referred.email,
      raw: row,
    };
  });
};

export const getMyDirectReferrals = async (): Promise<DirectReferral[]> => {
  const res = await api.get("/referrals/mine");
  const rows = extractRewardsArray(res.data);

  return rows.map((row) => {
    const user = asRecord(row.user);
    return {
      userId: toString(row.userId || user._id || row._id),
      name: toString(row.name || user.name, "User"),
      email: toString(row.email || user.email),
      status: toString(row.status, ""),
      createdAt: toString(row.createdAt, ""),
      totalDeposit: toNumber(row.totalDeposit),
      depositCount: toNumber(row.depositCount),
      accountCount: toNumber(row.accountCount),
    };
  });
};

export const requestReferralReward = async (payload: {
  rewardId: string;
  accountId?: string;
  destination?: "account" | "wallet";
}) => {
  const res = await api.post<ApiEnvelope<UnknownRecord>>("/referrals/request", payload);
  return res.data;
};

/* ---------------- Referral tree (My Clients) ---------------- */

export interface ReferralTreeNode {
  userId: string;
  name: string;
  email: string;
  level: number;
  children: ReferralTreeNode[];
}

export interface ReferralTree {
  root: ReferralTreeNode | null;
  stats: {
    directReferrals: number;
    networkSize: number;
    maxDepth: number;
    truncated: boolean;
  };
}

export const getReferralTree = async (maxDepth = 6): Promise<ReferralTree> => {
  const res = await api.get<ApiEnvelope<ReferralTree>>("/referrals/tree", {
    params: { maxDepth },
  });
  return res.data?.data as ReferralTree;
};

/* ---------------- Sub-IB requests ---------------- */

export interface SubIbRequest {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  note: string;
  rejectionReason: string;
  createdAt?: string;
  respondedAt?: string | null;
  requester: { id: string; name: string; email: string };
  ib: { id: string; name: string; email: string };
}

export interface SubIbRequestList {
  items: SubIbRequest[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export const createSubIbRequest = async (note = "") => {
  const res = await api.post<ApiEnvelope<SubIbRequest>>("/referrals/sub-ib-request", { note });
  return res.data;
};

export const getMySubIbRequest = async (): Promise<SubIbRequest | null> => {
  const res = await api.get<ApiEnvelope<SubIbRequest | null>>("/referrals/sub-ib-request/mine");
  return (res.data?.data as SubIbRequest | null) ?? null;
};

export const listSubIbRequests = async (params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<SubIbRequestList> => {
  const res = await api.get("/referrals/sub-ib-requests", { params });
  const root = asRecord(res.data);
  const items = Array.isArray(root.items) ? (root.items as SubIbRequest[]) : [];
  const pagination = asRecord(root.pagination);
  return {
    items,
    pagination: {
      page: toNumber(pagination.page) || 1,
      limit: toNumber(pagination.limit) || 50,
      total: toNumber(pagination.total) || 0,
      totalPages: toNumber(pagination.totalPages) || 0,
    },
  };
};

export const respondSubIbRequest = async (
  requestId: string,
  action: "APPROVE" | "REJECT",
  reason = "",
) => {
  const res = await api.patch<ApiEnvelope<SubIbRequest>>(
    `/referrals/sub-ib-requests/${requestId}`,
    { action, reason },
  );
  return res.data;
};
