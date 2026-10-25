import { useQuery } from "@tanstack/react-query";
import { getActiveAccountPlans } from "@/services/accounts.service";

export const useActiveAccountPlans = () =>
  useQuery({
    queryKey: ["account-plans", "active"],
    queryFn: getActiveAccountPlans,
  });
