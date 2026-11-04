import {
  clearClientCookie,
  setClientCookie,
  setTradeTokenCookie,
} from "./tradeToken";

const TRADE_AUTH_STATE_KEY = "trade-auth-state";
const TRADE_AUTH_LOGGED_IN = "trade-logged-in";
const TRADE_SESSION_TTL_SECONDS = 43200;

export const setTradeSession = (data: {
  tradeToken: string;
  sessionType: string;
  account_number: string;
  accountId?: string;
}) => {
  setTradeTokenCookie(data.tradeToken, 900);
  document.cookie = `tradeSessionType=${data.sessionType}; path=/; max-age=900`;
  document.cookie = `tradeAccount=${data.account_number}; path=/; max-age=900`;
};

const TRADE_EXIT_KEY = "trade-exit-at";
const TRADE_EXIT_WINDOW_MS = 15_000;

/**
 * Mark that the user is leaving the trading portal on purpose. While set, 401s from
 * in-flight trade requests must not bounce back into the portal via /trade-open.
 */
export function beginTradeExit() {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(TRADE_EXIT_KEY, String(Date.now()));
}

export function isTradeExiting(): boolean {
  if (typeof window === "undefined") return false;
  const at = Number(sessionStorage.getItem(TRADE_EXIT_KEY) || 0);
  return at > 0 && Date.now() - at < TRADE_EXIT_WINDOW_MS;
}

export function clearTradeExit() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(TRADE_EXIT_KEY);
}

/** Desktop (≥768px) opens the trading page; smaller screens open quotes. */
export function getTradeLandingRoute(): string {
  if (typeof window === "undefined") return "/trade/trading";
  return window.matchMedia("(min-width: 768px)").matches
    ? "/trade/trading"
    : "/trade/quotes";
}

/** Persist a trade session exactly like the password trade-login does. */
export function storeActiveTradeSession(data: {
  tradeToken: string;
  sessionType: string;
  accountId: string;
}) {
  clearClientCookie("tradeSessionType");
  clearTradeExit();
  setTradeTokenCookie(data.tradeToken, TRADE_SESSION_TTL_SECONDS);
  setClientCookie("sessionType", String(data.sessionType), TRADE_SESSION_TTL_SECONDS);
  setClientCookie("accountId", String(data.accountId), TRADE_SESSION_TTL_SECONDS);
  if (typeof window !== "undefined") {
    localStorage.setItem(TRADE_AUTH_STATE_KEY, TRADE_AUTH_LOGGED_IN);
    localStorage.setItem("tradeAccountId", String(data.accountId));
    window.dispatchEvent(new Event("trade-account-change"));
  }
}
