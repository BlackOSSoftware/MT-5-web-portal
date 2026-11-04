import { normalizeApiBaseUrl } from "@/api/baseUrl";
import { getTradeTokenFromStorageSync } from "@/lib/tradeToken";

function presenceUrl(path: "heartbeat" | "offline") {
  const base = normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_URL);
  return `${base}/user/presence/${path}`;
}

// Tokens the server already rejected (expired / revoked). Stale tokens can linger
// in storage; re-sending them every heartbeat only floods the console with 401s.
const rejectedTokens = new Set<string>();

export function getAccessToken(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem("accessToken") || "";
  } catch {
    return "";
  }
}

function readTradeToken(): string {
  try {
    return getTradeTokenFromStorageSync() || "";
  } catch {
    return "";
  }
}

/** Prefer portal access token, else trade/watch account token (skipping rejected ones). */
export function getAnySessionToken(): string {
  const access = getAccessToken();
  if (access && !rejectedTokens.has(access)) return access;
  const trade = readTradeToken();
  if (trade && !rejectedTokens.has(trade)) return trade;
  return "";
}

export function hasActiveSession(): boolean {
  return Boolean(getAnySessionToken());
}

export async function postPresence(
  path: "heartbeat" | "offline",
  token?: string
) {
  const auth = token && !rejectedTokens.has(token) ? token : getAnySessionToken();
  if (!auth) return;

  try {
    const res = await fetch(presenceUrl(path), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth}`,
        "Content-Type": "application/json",
      },
      body: "{}",
      keepalive: path === "offline",
      credentials: "include",
    });
    if (res.status === 401) {
      rejectedTokens.add(auth);
      const fallback = getAnySessionToken();
      if (fallback && fallback !== auth) await postPresence(path, fallback);
    }
  } catch {
    // best-effort
  }
}

/**
 * Mark offline only when NO session remains (portal or trade).
 * Pass `forceToken` when the token is about to be cleared.
 */
export async function markPresenceOfflineNow(options?: {
  forceToken?: string;
  force?: boolean;
}) {
  if (!options?.force && hasActiveSession() && !options?.forceToken) {
    // Another session (trade or portal) is still active.
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("auth:logout"));
    }
    return;
  }

  const token = options?.forceToken || getAnySessionToken();
  if (token) {
    await postPresence("offline", token);
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("auth:logout"));
  }
}

export function notifyPresenceLogin() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("auth:login"));
}

/**
 * Clears portal auth. Marks offline only if trade session is also gone.
 */
export async function clearAccessSession(options?: {
  clearRefresh?: boolean;
}) {
  const accessToken = getAccessToken();
  const tradeToken = readTradeToken();
  const tradeStillActive = Boolean(tradeToken && !rejectedTokens.has(tradeToken));

  try {
    localStorage.removeItem("accessToken");
    if (options?.clearRefresh !== false) {
      localStorage.removeItem("refreshToken");
    }
  } catch {
    // ignore
  }
  document.cookie = "accessToken=; path=/; max-age=0";

  if (!tradeStillActive && accessToken) {
    await postPresence("offline", accessToken);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("auth:logout"));
    }
  } else if (typeof window !== "undefined") {
    // Still online via trade — keep heartbeats on trade token.
    window.dispatchEvent(new Event("auth:login"));
  }
}

/**
 * Call BEFORE clearing trade token on trade logout.
 * Marks offline only if portal access session is also gone.
 */
export async function clearTradeSessionPresence() {
  const tradeToken = readTradeToken();
  const access = getAccessToken();
  const accessStillActive = Boolean(access && !rejectedTokens.has(access));

  if (!accessStillActive && tradeToken) {
    await postPresence("offline", tradeToken);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("auth:logout"));
    }
  } else if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("auth:login"));
  }
}
