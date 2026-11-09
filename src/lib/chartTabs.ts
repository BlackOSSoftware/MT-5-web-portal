"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "trade-chart-tabs";
const CHANGE_EVENT = "trade-chart-tabs-change";

type ChartTabsState = { tabs: string[]; active: string };

const DEFAULT_STATE: ChartTabsState = { tabs: ["XAUUSD"], active: "XAUUSD" };

let cachedRaw: string | null = null;
let cachedState: ChartTabsState = DEFAULT_STATE;

function parseState(raw: string | null): ChartTabsState {
  if (!raw) return DEFAULT_STATE;
  try {
    const parsed = JSON.parse(raw) as Partial<ChartTabsState>;
    const tabs = Array.isArray(parsed.tabs)
      ? parsed.tabs.map((t) => String(t).trim().toUpperCase()).filter(Boolean)
      : [];
    const active = String(parsed.active || "").trim().toUpperCase();
    if (tabs.length === 0) return DEFAULT_STATE;
    return { tabs, active: tabs.includes(active) ? active : tabs[0] };
  } catch {
    return DEFAULT_STATE;
  }
}

function getState(): ChartTabsState {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedState = parseState(raw);
  }
  return cachedState;
}

function save(next: ChartTabsState) {
  cachedRaw = JSON.stringify(next);
  cachedState = next;
  localStorage.setItem(STORAGE_KEY, cachedRaw);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

const getSnapshot = () => getState();
const getServerSnapshot = () => DEFAULT_STATE;

/** Open chart tabs on the trading desk — last tab can never be closed. */
export function useChartTabs() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const open = useCallback((symbol: string) => {
    const code = String(symbol || "").trim().toUpperCase();
    if (!code) return;
    const cur = getState();
    if (cur.tabs.includes(code)) {
      if (cur.active !== code) save({ ...cur, active: code });
      return;
    }
    save({ tabs: [...cur.tabs, code], active: code });
  }, []);

  const setActive = useCallback((symbol: string) => {
    const code = String(symbol || "").trim().toUpperCase();
    const cur = getState();
    if (!cur.tabs.includes(code) || cur.active === code) return;
    save({ ...cur, active: code });
  }, []);

  /** Make a symbol the first tab and activate it (used on page open). */
  const ensureFirst = useCallback((symbol: string) => {
    const code = String(symbol || "").trim().toUpperCase();
    if (!code) return;
    const cur = getState();
    const rest = cur.tabs.filter((t) => t !== code);
    save({ tabs: [code, ...rest], active: code });
  }, []);

  const close = useCallback((symbol: string) => {
    const code = String(symbol || "").trim().toUpperCase();
    const cur = getState();
    if (cur.tabs.length <= 1 || !cur.tabs.includes(code)) return; // last tab stays
    const tabs = cur.tabs.filter((t) => t !== code);
    const active = cur.active === code ? tabs[tabs.length - 1] : cur.active;
    save({ tabs, active });
  }, []);

  return { tabs: state.tabs, active: state.active, open, setActive, close, ensureFirst };
}
