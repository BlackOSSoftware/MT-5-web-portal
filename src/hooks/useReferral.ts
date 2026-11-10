import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createSubIbRequest,
  getMyDirectReferrals,
  getMySubIbRequest,
  getReferralDashboard,
  getReferralRewards,
  getReferralSummary,
  getReferralTree,
  listSubIbRequests,
  requestReferralReward,
  respondSubIbRequest,
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
