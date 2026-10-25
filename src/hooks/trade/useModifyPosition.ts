import { modifyPosition } from "@/services/trade/modifyPosition.service";
import { useMutation } from "@tanstack/react-query";

export const useModifyPosition = () => {
  return useMutation({
    mutationFn: modifyPosition,
  });
};
