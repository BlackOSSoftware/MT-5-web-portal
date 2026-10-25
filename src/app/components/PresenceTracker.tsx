"use client";

import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import {
  getAnySessionToken,
  hasActiveSession,
  postPresence,
} from "@/lib/presence";

const HEARTBEAT_MS = 12_000;
const TOKEN_POLL_MS = 2_000;

/**
 * Online while portal accessToken OR tradeToken session is active.
 * Offline when both are gone, tab closes, or native app backgrounds.
 */
export default function PresenceTracker() {
  const onlineRef = useRef(false);
  const heartbeatRef = useRef<number | null>(null);
  const pollRef = useRef<number | null>(null);
  const lastTokenRef = useRef<string>("");

  useEffect(() => {
    let cancelled = false;
    let appListener: { remove: () => Promise<void> } | null = null;

    const clearHeartbeat = () => {
      if (heartbeatRef.current != null) {
        window.clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
    };

    const goOfflineWithToken = async (token: string) => {
      if (!token) return;
      onlineRef.current = false;
      await postPresence("offline", token);
    };

    const goOffline = async () => {
      // If any session still exists, stay / go online instead.
      if (hasActiveSession()) {
        void goOnline();
        return;
      }
      const token = lastTokenRef.current || getAnySessionToken();
      lastTokenRef.current = "";
      clearHeartbeat();
      if (!onlineRef.current && !token) return;
      onlineRef.current = false;
      if (token) await postPresence("offline", token);
    };

    const goOnline = async () => {
      if (cancelled) return;
      const token = getAnySessionToken();
      if (!token) {
        if (onlineRef.current || lastTokenRef.current) {
          const cached = lastTokenRef.current;
          lastTokenRef.current = "";
          clearHeartbeat();
          onlineRef.current = false;
          if (cached) await goOfflineWithToken(cached);
        }
        return;
      }

      lastTokenRef.current = token;
      onlineRef.current = true;
      await postPresence("heartbeat", token);
      if (cancelled) return;

      if (heartbeatRef.current == null) {
        heartbeatRef.current = window.setInterval(() => {
          const next = getAnySessionToken();
          if (!next) {
            void goOffline();
            return;
          }
          lastTokenRef.current = next;
          onlineRef.current = true;
          void postPresence("heartbeat", next);
        }, HEARTBEAT_MS);
      }
    };

    const syncFromToken = () => {
      const token = getAnySessionToken();
      if (token) {
        if (token !== lastTokenRef.current || !onlineRef.current) {
          void goOnline();
        }
      } else if (onlineRef.current || lastTokenRef.current) {
        void goOffline();
      }
    };

    const onPageHide = () => {
      // Tab closing: force offline with last known token even if storage races.
      const token = lastTokenRef.current || getAnySessionToken();
      lastTokenRef.current = "";
      clearHeartbeat();
      onlineRef.current = false;
      if (token) void goOfflineWithToken(token);
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void goOnline();
      }
    };

    const onLogin = () => {
      void goOnline();
    };

    const onLogout = () => {
      if (hasActiveSession()) {
        void goOnline();
        return;
      }
      const cached = lastTokenRef.current;
      lastTokenRef.current = "";
      clearHeartbeat();
      onlineRef.current = false;
      if (cached) void goOfflineWithToken(cached);
    };

    void goOnline();
    pollRef.current = window.setInterval(syncFromToken, TOKEN_POLL_MS);

    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("beforeunload", onPageHide);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onVisibility);
    window.addEventListener("auth:login", onLogin);
    window.addEventListener("auth:logout", onLogout);
    window.addEventListener("trade-token-change", onLogin);
    window.addEventListener("trade-account-change", syncFromToken);
    window.addEventListener("storage", (event) => {
      if (event.key !== "accessToken" && event.key !== "tradeToken") return;
      syncFromToken();
    });

    if (Capacitor.isNativePlatform()) {
      void App.addListener("appStateChange", ({ isActive }) => {
        if (isActive) void goOnline();
        else void goOffline();
      }).then((handle) => {
        appListener = handle;
      });
    }

    return () => {
      cancelled = true;
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("beforeunload", onPageHide);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onVisibility);
      window.removeEventListener("auth:login", onLogin);
      window.removeEventListener("auth:logout", onLogout);
      window.removeEventListener("trade-token-change", onLogin);
      window.removeEventListener("trade-account-change", syncFromToken);
      if (pollRef.current != null) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
      clearHeartbeat();
      void appListener?.remove();
    };
  }, []);

  return null;
}
