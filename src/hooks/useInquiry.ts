import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { inquiryService, InquiryPayload } from "@/services/inquiry.service";

export const useCreateInquiry = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: InquiryPayload) => inquiryService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-tickets"] });
    },
  });
};

export const useMyTickets = (page = 1, limit = 20) =>
  useQuery({
    queryKey: ["my-tickets", page, limit],
    queryFn: () => inquiryService.mine({ page, limit }),
  });
