import { useQuery } from "@tanstack/react-query";
import {
  getMyDirectReferrals,
  getReferralSummary,
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
