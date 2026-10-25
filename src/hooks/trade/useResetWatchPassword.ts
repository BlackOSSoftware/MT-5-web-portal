"use client";

import { useMutation } from "@tanstack/react-query";
import { resetWatchPassword } from "@/services/tradeAuth.service";

export function useResetWatchPassword() {
  return useMutation({
    mutationFn: ({
      accountId,
      newPassword,
    }: {
      accountId: string;
      newPassword: string;
    }) => resetWatchPassword(accountId, newPassword),
  });
}
