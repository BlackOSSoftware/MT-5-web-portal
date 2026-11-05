"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "trade-one-click";
const CHANGE_EVENT = "trade-one-click-change";

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

/** One-click trading: when on, Buy/Sell sends the order without the review dialog. */
export function useOneClickTrading() {
  const enabled = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const setEnabled = useCallback((next: boolean) => {
    localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);
  return [enabled, setEnabled] as const;
}
