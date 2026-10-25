"use client";

import { useMutation } from "@tanstack/react-query";
import { resetTradePassword } from "@/services/tradeAuth.service";

export function useResetTradePassword() {
  return useMutation({
    mutationFn: ({
      accountId,
      newPassword,
    }: {
      accountId: string;
      newPassword: string;
    }) => resetTradePassword(accountId, newPassword),
  });
}
