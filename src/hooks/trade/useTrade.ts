import { useMutation } from "@tanstack/react-query";
import { tradeService } from "@/services/trade/trade.service";

export const useMarketOrder = () =>
  useMutation({
    mutationFn: tradeService.market,
  });

export const usePendingOrder = () =>
  useMutation({
    mutationFn: tradeService.pending,
  });
