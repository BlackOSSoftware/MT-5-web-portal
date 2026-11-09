"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "trade-order-sheet-mode";
const CHANGE_EVENT = "trade-order-sheet-mode-change";

export type OrderSheetMode = "advanced" | "simple";

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

const getSnapshot = (): OrderSheetMode =>
  localStorage.getItem(STORAGE_KEY) === "simple" ? "simple" : "advanced";
const getServerSnapshot = (): OrderSheetMode => "advanced";

/** New-order sheet mode: advanced (SL/TP, pending) or simple (buy/sell price only). */
export function useOrderSheetMode() {
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const setMode = useCallback((next: OrderSheetMode) => {
    localStorage.setItem(STORAGE_KEY, next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);
  return [mode, setMode] as const;
}
