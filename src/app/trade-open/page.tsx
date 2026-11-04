"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { activatePrimaryTradeAccount } from "@/services/tradeAuth.service";
import {
  getTradeLandingRoute,
  isTradeExiting,
  storeActiveTradeSession,
} from "@/lib/tradeSession";
import { getTradeTokenFromStorageSync } from "@/lib/tradeToken";

const ATTEMPTS_KEY = "trade-open-attempts";
const ATTEMPT_WINDOW_MS = 30_000;
const MAX_ATTEMPTS = 3;

/**
 * Opens the trading portal without a trade password: the portal login activates the
 * user's primary trading account. Replaces the old /trade-login screen.
 */
export default function TradeOpenPage() {
  const started = useRef(false);
  const [message, setMessage] = useState("Opening trading portal…");

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    // A stray redirect during "Exit panel" must land on the dashboard, not re-enter trading.
    if (isTradeExiting()) {
      window.location.replace("/dashboard");
      return;
    }

    const now = Date.now();
    const recent = (JSON.parse(sessionStorage.getItem(ATTEMPTS_KEY) || "[]") as number[]).filter(
      (t) => now - t < ATTEMPT_WINDOW_MS,
    );
    // Guard against redirect loops (e.g. the trade API keeps rejecting the new session).
    if (recent.length >= MAX_ATTEMPTS) {
      sessionStorage.removeItem(ATTEMPTS_KEY);
      window.location.replace("/dashboard/accounts");
      return;
    }
    sessionStorage.setItem(ATTEMPTS_KEY, JSON.stringify([...recent, now]));

    if (!localStorage.getItem("accessToken")) {
      window.location.replace(getTradeTokenFromStorageSync() ? getTradeLandingRoute() : "/login");
      return;
    }

    (async () => {
      try {
        const session = await activatePrimaryTradeAccount();
        if (!session?.tradeToken) throw new Error("No trade session returned");
        storeActiveTradeSession({
          tradeToken: session.tradeToken,
          sessionType: session.sessionType,
          accountId: session.accountId,
        });
        window.location.replace(getTradeLandingRoute());
      } catch {
        setMessage("No trading account available. Redirecting to your accounts…");
        window.setTimeout(() => window.location.replace("/dashboard/accounts"), 900);
      }
    })();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-main)] px-6">
      <div className="flex items-center gap-3 text-[14px] text-[var(--text-secondary)]">
        <Loader2 size={18} className="animate-spin text-[var(--primary)]" />
        {message}
      </div>
    </div>
  );
}
