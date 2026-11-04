"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { App as CapacitorApp, BackButtonListenerEvent } from "@capacitor/app";

export default function BackHandler() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let handler: PluginListenerHandle | undefined;

    const setupListener = async () => {
      handler = await CapacitorApp.addListener(
        "backButton",
        (event: BackButtonListenerEvent) => {
          if (pathname?.startsWith("/trade-open")) {
            router.replace("/dashboard");
            return;
          }

          if (pathname?.startsWith("/trade")) {
            // Trade layout shows "leave to dashboard?" confirmation.
            window.dispatchEvent(new Event("trade-exit-request"));
            return;
          }

          if (pathname?.startsWith("/dashboard") && pathname !== "/dashboard") {
            router.replace("/dashboard");
            return;
          }

          if (event.canGoBack && window.history.length > 1) {
            window.history.back();
          } else {
            router.replace("/");
          }
        }
      );
    };

    setupListener();

    return () => {
      if (handler) {
        handler.remove();
      }
    };
  }, [pathname, router]);

  return null;
}
