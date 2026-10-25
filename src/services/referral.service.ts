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
  accountId: string;
}) => {
  const res = await api.post<ApiEnvelope<UnknownRecord>>("/referrals/request", payload);
  return res.data;
};
