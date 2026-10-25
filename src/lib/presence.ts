import { normalizeApiBaseUrl } from "@/api/baseUrl";
import { getTradeTokenFromStorageSync } from "@/lib/tradeToken";

function presenceUrl(path: "heartbeat" | "offline") {
  const base = normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_URL);
  return `${base}/user/presence/${path}`;
}

export function getAccessToken(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem("accessToken") || "";
  } catch {
    return "";
  }
}

/** Prefer portal access token, else trade/watch account token. */
export function getAnySessionToken(): string {
  const access = getAccessToken();
  if (access) return access;
  try {
    return getTradeTokenFromStorageSync() || "";
  } catch {
    return "";
  }
}

export function hasActiveSession(): boolean {
  return Boolean(getAccessToken() || getTradeTokenFromStorageSync());
}

export async function postPresence(
  path: "heartbeat" | "offline",
  token?: string
) {
  const auth = token || getAnySessionToken();
  if (!auth) return;

  try {
    await fetch(presenceUrl(path), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth}`,
        "Content-Type": "application/json",
      },
      body: "{}",
      keepalive: path === "offline",
      credentials: "include",
    });
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
  const tradeStillActive = Boolean(getTradeTokenFromStorageSync());

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
  const tradeToken = getTradeTokenFromStorageSync();
  const accessStillActive = Boolean(getAccessToken());

  if (!accessStillActive && tradeToken) {
    await postPresence("offline", tradeToken);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("auth:logout"));
    }
  } else if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("auth:login"));
  }
}
