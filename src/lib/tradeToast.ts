"use client";

export const TRADE_INFO_EVENT = "trade-info-toast";

/** Show a small info toast anywhere inside the trade portal. */
export function notifyTradeInfo(message: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(TRADE_INFO_EVENT, { detail: message }));
}
