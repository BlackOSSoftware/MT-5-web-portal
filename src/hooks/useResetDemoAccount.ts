import { useMutation, useQueryClient } from "@tanstack/react-query";
import { resetDemoAccount } from "@/services/accounts.service";

export const useResetDemoAccount = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => resetDemoAccount(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ["my-accounts"] });
      qc.invalidateQueries({ queryKey: ["account", id] });
    },
  });
};
