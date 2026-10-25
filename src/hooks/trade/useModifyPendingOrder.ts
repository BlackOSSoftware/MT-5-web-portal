"use client";

import { modifyPendingOrder, ModifyPendingPayload } from "@/services/trade/modifyPendingOrder.service";
import { useMutation } from "@tanstack/react-query";

export function useModifyPendingOrder() {
  return useMutation({
    mutationFn: (payload: ModifyPendingPayload) =>
      modifyPendingOrder(payload),
  });
}
