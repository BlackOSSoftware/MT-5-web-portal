import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getMyDirectReferrals,
  getReferralDashboard,
  getReferralRewards,
  getReferralSummary,
  requestReferralReward,
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
