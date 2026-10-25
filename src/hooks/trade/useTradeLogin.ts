import { useMutation } from "@tanstack/react-query";
import { tradeLogin } from "@/services/tradeAuth.service";

export const useTradeLogin = () =>
  useMutation({
    mutationFn: tradeLogin,
  });
