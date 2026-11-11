"use client";

import { useCallback, useSyncExternalStore } from "react";
import { notifyTradeInfo } from "./tradeToast";

const STORAGE_KEY = "trade-one-click";
const CONSENT_KEY = "trade-one-click-consent";
const CHANGE_EVENT = "trade-one-click-change";
export const ONE_CLICK_CONSENT_EVENT = "trade-one-click-consent";

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

const getSnapshot = () => localStorage.getItem(STORAGE_KEY) === "1";
const getServerSnapshot = () => false;

export function hasOneClickConsent() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(CONSENT_KEY) === "1";
}

function persist(next: boolean) {
  localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
  window.dispatchEvent(new Event(CHANGE_EVENT));
  notifyTradeInfo(
    next
      ? "One-click trading ON — orders place instantly"
      : "One-click trading OFF — confirmation required",
  );
}

/** Called by the consent dialog after the user agrees — enables one-click trading. */
export function confirmOneClickTrading() {
  if (typeof window === "undefined") return;
  localStorage.setItem(CONSENT_KEY, "1");
  persist(true);
}

/** One-click trading: when on, Buy/Sell sends the order without the review dialog. */
export function useOneClickTrading() {
  const enabled = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const setEnabled = useCallback((next: boolean) => {
    if (typeof window === "undefined") return;
    if (next && !hasOneClickConsent()) {
      // First-time enable — show the terms & conditions dialog instead.
      window.dispatchEvent(new Event(ONE_CLICK_CONSENT_EVENT));
      return;
    }
    persist(next);
  }, []);
  return [enabled, setEnabled] as const;
}
