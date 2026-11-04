import { useQuery } from "@tanstack/react-query";
import { getTodayLots } from "@/services/accounts.service";

export const useTodayLots = () =>
  useQuery({
    queryKey: ["today-lots"],
    queryFn: getTodayLots,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
