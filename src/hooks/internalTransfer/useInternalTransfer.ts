import { useMutation, useQueryClient } from "@tanstack/react-query";
import { internalTransferService } from "@/services/internalTransfer.service";

export const useInternalTransfer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: internalTransferService.createTransfer,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["internal-transfer-history"],
      });
    },
  });
};
