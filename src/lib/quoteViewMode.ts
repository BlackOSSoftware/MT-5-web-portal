"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "trade-quote-view";
const CHANGE_EVENT = "trade-quote-view-change";

export type QuoteViewMode = "advanced" | "simple";

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

const getSnapshot = (): QuoteViewMode =>
  localStorage.getItem(STORAGE_KEY) === "simple" ? "simple" : "advanced";
const getServerSnapshot = (): QuoteViewMode => "advanced";

/** Quotes watchlist view: advanced (spread, high/low) or simple (clean bid/ask). */
export function useQuoteViewMode() {
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const setMode = useCallback((next: QuoteViewMode) => {
    localStorage.setItem(STORAGE_KEY, next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);
  return [mode, setMode] as const;
}
