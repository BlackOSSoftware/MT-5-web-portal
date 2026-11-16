/** Admin kill-switch — clear session and send user to login. */
export function isAppLockedError(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const data = payload as { code?: string; message?: string };
  if (data.code === "APP_LOCKED") return true;
  const msg = String(data.message || "").toLowerCase();
  return msg.includes("check your internet connection");
}

export function forcePortalLogoutToLogin() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("tradeToken");
    localStorage.removeItem("tradeRefreshToken");
  } catch {
    /* ignore */
  }
  document.cookie = "accessToken=; path=/; max-age=0";
  document.cookie = "tradeToken=; path=/; max-age=0";
  window.dispatchEvent(new Event("auth:logout"));
  const path = window.location.pathname || "";
  if (!path.startsWith("/login")) {
    window.location.replace("/login");
  }
}
