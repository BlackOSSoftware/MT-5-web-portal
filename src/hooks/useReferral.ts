import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getMyIbCommissionSummary,
  getMyIbCommissions,
  withdrawMyIbCommission,
  type IbCommissionQuery,
} from "@/services/ibCommission.service";
import {
  createIbRequest,
  createSubIbRequest,
  getIbRequestStatus,
  getMyDirectReferrals,
  getMySubIbRequest,
  getReferralDashboard,
  getReferralRewards,
  getReferralSummary,
  getReferralTree,
  getNetworkAccounts,
  getNetworkDeposits,
  getNetworkKyc,
  getNetworkMembers,
  getNetworkWithdrawals,
  listSubIbRequests,
  requestReferralReward,
  respondSubIbRequest,
  type NetworkTxQuery,
  type ReferralPeriod,
  type ReferralScope,
} from "@/services/referral.service";

export const useReferralSummary = () =>
  useQuery({
    queryKey: ["referral-summary"],
    queryFn: getReferralSummary,
    staleTime: 1000 * 60 * 2,
  });

export const useMyDirectReferrals = () =>
  useQuery({
    queryKey: ["referral-mine"],
    queryFn: getMyDirectReferrals,
    staleTime: 1000 * 60,
  });

export const useReferralDashboard = (
  scope: ReferralScope,
  period: ReferralPeriod,
) =>
  useQuery({
    queryKey: ["referral-dashboard", scope, period],
    queryFn: () => getReferralDashboard({ scope, period }),
    staleTime: 30_000,
  });

export const useReferralRewards = () =>
  useQuery({
    queryKey: ["referral-rewards"],
    queryFn: getReferralRewards,
    staleTime: 30_000,
  });

export const useNetworkDeposits = (params?: NetworkTxQuery) =>
  useQuery({
    queryKey: ["network-deposits", params],
    queryFn: () => getNetworkDeposits(params),
  });

export const useNetworkWithdrawals = (params?: NetworkTxQuery) =>
  useQuery({
    queryKey: ["network-withdrawals", params],
    queryFn: () => getNetworkWithdrawals(params),
  });

export const useNetworkMembers = (params?: {
  q?: string;
  level?: string | number;
  page?: number;
  limit?: number;
}) =>
  useQuery({
    queryKey: ["network-members", params],
    queryFn: () => getNetworkMembers(params),
  });

export const useNetworkKyc = (params?: {
  q?: string;
  status?: string;
  page?: number;
  limit?: number;
}) =>
  useQuery({
    queryKey: ["network-kyc", params],
    queryFn: () => getNetworkKyc(params),
  });

export const useNetworkAccounts = (params?: {
  q?: string;
  page?: number;
  limit?: number;
}) =>
  useQuery({
    queryKey: ["network-accounts", params],
    queryFn: () => getNetworkAccounts(params),
  });

export const useIbRequestStatus = () =>
  useQuery({
    queryKey: ["ib-request-status"],
    queryFn: getIbRequestStatus,
    staleTime: 30_000,
  });

export const useCreateIbRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (note?: string) => createIbRequest(note || ""),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ib-request-status"] });
    },
  });
};

export const useRequestReferralReward = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: requestReferralReward,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["referral-dashboard"] });
      qc.invalidateQueries({ queryKey: ["referral-rewards"] });
      qc.invalidateQueries({ queryKey: ["referral-summary"] });
      qc.invalidateQueries({ queryKey: ["wallet"] });
    },
  });
};

export const useReferralTree = (maxDepth = 6) =>
  useQuery({
    queryKey: ["referral-tree", maxDepth],
    queryFn: () => getReferralTree(maxDepth),
    staleTime: 60_000,
  });

export const useSubIbRequests = (status = "", page = 1, limit = 50) =>
  useQuery({
    queryKey: ["sub-ib-requests", status, page, limit],
    queryFn: () => listSubIbRequests({ status, page, limit }),
    staleTime: 30_000,
  });

export const useMySubIbRequest = () =>
  useQuery({
    queryKey: ["sub-ib-request-mine"],
    queryFn: getMySubIbRequest,
    staleTime: 30_000,
  });

export const useCreateSubIbRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (note: string) => createSubIbRequest(note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sub-ib-request-mine"] });
      qc.invalidateQueries({ queryKey: ["sub-ib-requests"] });
    },
  });
};

export const useMyIbCommissions = (params?: IbCommissionQuery) =>
  useQuery({
    queryKey: ["ib-commissions", params],
    queryFn: () => getMyIbCommissions(params),
    staleTime: 30_000,
  });

export const useMyIbCommissionSummary = () =>
  useQuery({
    queryKey: ["ib-commission-summary"],
    queryFn: getMyIbCommissionSummary,
    staleTime: 30_000,
  });

export const useIbCommissionWithdraw = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: withdrawMyIbCommission,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ib-commission-summary"] });
      qc.invalidateQueries({ queryKey: ["ib-commissions"] });
      qc.invalidateQueries({ queryKey: ["wallet"] });
    },
  });
};

export const useRespondSubIbRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      requestId,
      action,
      reason,
    }: {
      requestId: string;
      action: "APPROVE" | "REJECT";
      reason?: string;
    }) => respondSubIbRequest(requestId, action, reason || ""),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sub-ib-requests"] });
      qc.invalidateQueries({ queryKey: ["referral-tree"] });
    },
  });
};
