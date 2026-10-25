"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { getFcmToken } from "@/lib/getFcmToken";
import { listenForegroundMessages } from "@/lib/listenForegroundMessages";
import { useSaveFcmToken } from "@/hooks/useNotification";

export default function InitNotifications() {
  const saveToken = useSaveFcmToken();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      getFcmToken().then((token) => {
        if (!token) return;
        saveToken.mutate(token);
      });

      listenForegroundMessages();
    }
  }, []);

  return null;
}
