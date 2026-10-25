import { useQuery } from "@tanstack/react-query";
import { getDepositStatus } from "@/services/deposits.service";

export const useDepositStatus = (id: string) =>
  useQuery({
    queryKey: ["deposit-status", id],
    queryFn: () => getDepositStatus(id),
    enabled: !!id,
  });
