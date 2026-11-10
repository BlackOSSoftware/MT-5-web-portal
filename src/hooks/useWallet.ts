"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { walletService } from "@/services/wallet.service";

export const WALLET_QUERY_KEY = ["wallet"];
export const WALLET_TX_KEY = ["wallet", "transactions"];
export const WALLET_WITHDRAWALS_KEY = ["wallet", "withdrawals"];

export function useWallet() {
  return useQuery({
    queryKey: WALLET_QUERY_KEY,
    queryFn: walletService.getWallet,
    staleTime: 15_000,
  });
}

export function useWalletTransactions(page = 1, limit = 10) {
  return useQuery({
    queryKey: [...WALLET_TX_KEY, page, limit],
    queryFn: async () => {
      const res = await walletService.getTransactions(page, limit);
      return {
        data: res.data || [],
        pagination: res.pagination,
      };
    },
    staleTime: 15_000,
  });
}

export function useWalletWithdrawals(page = 1, limit = 10) {
  return useQuery({
    queryKey: [...WALLET_WITHDRAWALS_KEY, page, limit],
    queryFn: async () => {
      const res = await walletService.getWithdrawals(page, limit);
      return {
        data: res.data || [],
        pagination: res.pagination,
      };
    },
    staleTime: 15_000,
  });
}

export function useWalletTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: walletService.transfer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WALLET_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: WALLET_TX_KEY });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["internal-transfer"] });
    },
  });
}

export function useWalletWithdraw() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: walletService.withdraw,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WALLET_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: WALLET_TX_KEY });
      queryClient.invalidateQueries({ queryKey: WALLET_WITHDRAWALS_KEY });
    },
  });
}
