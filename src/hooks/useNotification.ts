import { useMutation } from "@tanstack/react-query";
import { notificationService } from "@/services/notification.service";

export const useSaveFcmToken = () => {
  return useMutation({
    mutationFn: notificationService.saveFcmToken,
  });
};
