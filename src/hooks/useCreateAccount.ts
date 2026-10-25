import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createAccount } from "@/services/accounts.service";

export const useCreateAccount = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: createAccount,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-accounts"] });
    },
  });
};
